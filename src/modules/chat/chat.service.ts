import {
  ChimeSDKMessagingClient,
  CreateChannelCommand,
  CreateChannelMembershipCommand,
  DeleteChannelCommand,
  DeleteChannelMembershipCommand,
  DescribeChannelCommand,
  ListChannelMembershipsCommand,
  ListChannelMembershipsForAppInstanceUserCommand,
  ListChannelMessagesCommand,
  SearchChannelsCommand,
  SendChannelMessageCommand,
  UpdateChannelCommand,
} from '@aws-sdk/client-chime-sdk-messaging';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RoomType } from '@prisma/client';
import { GLOBAL_CONFIG } from 'src/configs/global.config';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { ERROR_MESSAGES } from 'src/shared/constants/strings';

import { ChatGateway } from './chatgatway';
import { MessageType } from './chat.dto';

@Injectable()
export class ChatService {
  appInstanceArn = GLOBAL_CONFIG.app.awsChimeAccountId;
  logger = new Logger(ChatService.name);
  chimeMessage: ChimeSDKMessagingClient;
  chimeBearerAdmin = `${this.appInstanceArn}/user/${GLOBAL_CONFIG.app.awsChimeAdminId}`;
  constructor(
    private prismaCLient: PrismaService,
    private chatGateWay: ChatGateway,
  ) {
    this.chimeMessage = new ChimeSDKMessagingClient({
      region: process.env.AWS_REGION,
    });
  }

  async createChannel(userDetail, userIds, metaData) {
    const createChannelCommand = new CreateChannelCommand({
      AppInstanceArn: this.appInstanceArn,
      Name: `${userDetail.roomType}-${userIds.join('-')}`,
      ChimeBearer: this.chimeBearerAdmin,
      MemberArns: userIds.map((id) => `${this.appInstanceArn}/user/${id}`),
      Privacy: 'PUBLIC',
      Metadata: JSON.stringify(metaData),
    });
    try {
      const response = await this.chimeMessage.send(createChannelCommand);
      const match = response.ChannelArn.match(/channel\/([a-f0-9\-]{36})$/);
      const channelId = match ? match[1] : '';
      return await this.prismaCLient.chatRoom.create({
        data: {
          channelArn: response.ChannelArn,
          roomId: `${userDetail.roomType}-${userIds.join('-')}`,
          roomType: RoomType.PERSONAL,
          channelId: `${userDetail.roomType}-${channelId}`,
        },
      });
    } catch (error) {
      this.logger.error('Error create channel in chime:', error);
      throw new HttpException(
        { message: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async sendMessage(messageDetail, userData) {
    const sortedIds = messageDetail.userIds.sort((a, b) => a - b);
    let metaData;
    let checkChannel;
    if (messageDetail?.channelArn) {
      checkChannel = await this.prismaCLient.chatRoom.findFirst({
        where: {
          channelArn: messageDetail?.channelArn,
        },
      });
    } else {
      checkChannel = await this.prismaCLient.chatRoom.findFirst({
        where: {
          roomId: `${messageDetail.roomType}-${sortedIds.join('-')}`,
        },
      });
    }
    if (!checkChannel) {
      const getUserDetail = await this.getUserDetailsFromRequest(sortedIds);
      const userDetailMap = getUserDetail.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});

      metaData = sortedIds.reduce((acc, id) => {
        const user = userDetailMap[id];

        if (user) {
          acc[id] = `${user.firstName} ${user.lastName}`;
        }
        return acc;
      }, {});
      checkChannel = await this.createChannel(
        messageDetail,
        sortedIds,
        metaData,
      );
    }
    const getChannel = await this.getChannelDeatil(checkChannel.channelArn);
    const messageSize = await this.calculateByteSize(messageDetail.message);
    const messageType = messageSize <= 30 ? 'CONTROL' : 'STANDARD';
    const sendMessageToReceiver = new SendChannelMessageCommand({
      ChannelArn: checkChannel.channelArn,
      ChimeBearer: `${this.appInstanceArn}/user/${messageDetail.senderId}`,
      Content: messageDetail.message,
      Persistence: 'PERSISTENT',
      Type: messageType,
    });
    try {
      const response = await this.chimeMessage.send(sendMessageToReceiver);
      this.chatGateWay.handleNewMessage({
        message: messageDetail.message,
        roomId: checkChannel.channelArn,
        userIds: messageDetail.userIds,
        senderId: messageDetail.senderId,
        messageId: response.MessageId,
        createdTimestamp: new Date(),
        senderName: `${userData.firstName} ${userData.lastName}`,
        metaData: getChannel.Channel.Metadata,
      });
      return response;
    } catch (error) {
      this.logger.error('Error send message channel in chime:', error);
      throw new HttpException(
        { message: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getChannels(channel, userId) {
    try {
      const listChannles = new ListChannelMembershipsForAppInstanceUserCommand({
        ChimeBearer: this.chimeBearerAdmin,
        AppInstanceUserArn: `${this.appInstanceArn}/user/${userId}`,
        MaxResults: 20,
      });

      if (channel.token !== 'null') {
        listChannles.input.NextToken = channel.token;
      }
      const data: any = await this.chimeMessage.send(listChannles);
      data.ChannelMemberships.map((demo) => {
        demo.ChannelSummary.Name = demo.ChannelSummary.Metadata;
      });

      for (const channel of data.ChannelMemberships) {
        const messageCommand = new ListChannelMessagesCommand({
          ChannelArn: channel.ChannelSummary.ChannelArn,
          ChimeBearer: `${this.appInstanceArn}/user/${userId}`,
          MaxResults: 1,
        });
        const messages = await this.chimeMessage.send(messageCommand);
        channel.ChannelSummary.message = messages.ChannelMessages;
      }
      data.ChannelMemberships.sort((a, b) => {
        const timestampA = new Date(
          a.ChannelSummary.LastMessageTimestamp,
        ).getTime();
        const timestampB = new Date(
          b.ChannelSummary.LastMessageTimestamp,
        ).getTime();
        return timestampB - timestampA; // For descending order
      });
      return data;
    } catch (error) {
      throw new HttpException(
        { message: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async searchChannel(searchString, userId) {
    const terms = searchString.search
      .split(' ')
      .filter((term) => term.trim().length > 0);

    if (terms.length === 0) {
      return []; // No valid search terms
    }

    // Create conditions for each term
    const searchConditions = terms.map((term) => ({
      OR: [
        {
          firstName: {
            contains: term,
            mode: 'insensitive',
          },
        },
        {
          lastName: {
            contains: term,
            mode: 'insensitive',
          },
        },
      ],
    }));

    // Combine conditions with AND
    const userSearch = await this.prismaCLient.user.findMany({
      where: {
        AND: searchConditions,
      },
    });

    if (!userSearch) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.CHANNEL_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    try {
      const allChannels = [];
      const userArns = userSearch.map(
        (user) => `${this.appInstanceArn}/user/${user.id}`,
      );
      let response;
      for (const userArn of userArns) {
        const command = new SearchChannelsCommand({
          ChimeBearer: this.chimeBearerAdmin,
          MaxResults: 20,
          Fields: [
            {
              Key: 'MEMBERS',
              Values: [userArn],
              Operator: 'INCLUDES',
            },
          ],
        });
        response = await this.chimeMessage.send(command);
        try {
          if (response.Channels) {
            response.Channels.map((res) => {
              res.Name = res.Metadata;
            });
            for (const channel of response.Channels) {
              const membershipsCommand = new ListChannelMembershipsCommand({
                ChannelArn: channel.ChannelArn,
                ChimeBearer: this.chimeBearerAdmin,
              });
              const membershipsResponse = await this.chimeMessage.send(
                membershipsCommand,
              );
              const isMember = membershipsResponse.ChannelMemberships?.some(
                (membership) =>
                  membership.Member?.Arn ===
                  `${this.appInstanceArn}/user/${userId}`,
              );

              if (
                isMember &&
                !allChannels.some((ch) => ch.ChannelArn === channel.ChannelArn)
              ) {
                allChannels.push(channel); // Add channel only if it's not already in allChannels
              }
            }
          }
        } catch (error) {
          throw new HttpException(
            { message: error.message },
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }
      return allChannels;
    } catch (error) {
      throw new HttpException(
        { message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async listChannelMessageByARN(channelDetail, id) {
    try {
      const getChannel = await this.prismaCLient.chatRoom.findFirst({
        where: {
          channelArn: channelDetail.id,
        },
      });

      const getChannelDeatils = await this.getChannelDeatil(channelDetail.id);
      const channelListByArn = new ListChannelMessagesCommand({
        ChannelArn: channelDetail.id,
        ChimeBearer: ` ${this.appInstanceArn}/user/${id}`,
        MaxResults: 20,
      });

      if (channelDetail.token !== 'null') {
        channelListByArn.input.NextToken = channelDetail.token;
      }

      const response = await this.chimeMessage.send(channelListByArn);
      return {
        response: response,
        roomType: getChannel.roomType,
        userIds: getChannel.roomId.match(/\d+/g).map(Number),
        metaData: getChannelDeatils.Channel.Metadata,
      };
    } catch (error) {
      throw new HttpException(
        { message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async addNewMemberInExistingChannel(channelData, userData) {
    try {
      const BATCH_SIZE = 20;
      for (let i = 0; i < channelData.userId.length; i += BATCH_SIZE) {
        const batch = channelData.userId.slice(i, i + BATCH_SIZE);

        // Process the current batch using Promise.all
        await this.processBatch(batch, channelData.channelArn);
      }

      const getChannel = await this.getChannelDeatil(channelData.channelArn);
      const getChannelData = await this.prismaCLient.chatRoom.findFirst({
        where: {
          channelArn: channelData.channelArn,
        },
      });

      const users = await this.prismaCLient.user.findMany({
        where: {
          id: { in: channelData.userId.map((id) => +id) }, // Convert string userIds to numbers
        },
      });

      // Create a map of user data for quick lookup
      const userMap = users.reduce((map, user) => {
        map[user.id] = user;
        return map;
      }, {});

      const addedUserNames = [];
      const metaData = JSON.parse(getChannel.Channel.Metadata);
      const userIds = Object.keys(metaData);

      for (const userId of channelData.userId) {
        const getUser = userMap[+userId]; // Get user from the map

        if (getUser) {
          // Push user name to the array
          addedUserNames.push(`${getUser.firstName} ${getUser.lastName}`);

          // Update the metaData object with user details
          metaData[userId] = `${getUser.firstName} ${getUser.lastName}`;
          userIds.push(userId);
        }
      }

      // Join all user IDs with a '-' separator
      const sortIds = userIds.sort((a, b) => +a - +b);
      const updatedUserIds = [...new Set(sortIds)].join('-');
      const allAddedUserNames = addedUserNames.join(', ');

      // Update the roomId
      getChannelData.roomId = getChannelData.roomId.replace(
        /\d+(-\d+)*$/,
        updatedUserIds,
      );
      await this.prismaCLient.chatRoom.update({
        where: {
          id: getChannelData.id,
        },
        data: {
          roomId: getChannelData.roomId,
        },
      });
      const messageContent = {
        content: ` ${userData.firstName} ${userData.lastName} added ${allAddedUserNames} to the group`,
        messageType: MessageType.ADD,
      };
      const messageSize = await this.calculateByteSize(
        JSON.stringify(messageContent),
      );
      const messageType = messageSize <= 30 ? 'CONTROL' : 'STANDARD';
      const sendMessage = new SendChannelMessageCommand({
        ChannelArn: channelData.channelArn,
        ChimeBearer: `${this.appInstanceArn}/user/${userData.id}`, // Adjust ARN format if needed
        Content: JSON.stringify(messageContent),
        Type: messageType,
        Persistence: 'PERSISTENT',
      });
      await this.chimeMessage.send(sendMessage);
      const addMember = await this.updateChannelDeails(
        channelData.channelArn,
        metaData,
      );
      this.chatGateWay.handleJoinMember({
        metaData: JSON.stringify(metaData),
        channelArn: channelData.channelArn,
        userId: channelData.userId,
        memberType: MessageType.ADD,
        message: JSON.stringify(messageContent),
        senderId: userData.id,
        senderName: userData.name,
        userIds: userIds,
      });
      return addMember;
    } catch (error) {
      throw new HttpException(
        { message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async removeUserFromExistingChannel(channelData, userData) {
    try {
      let messageContent;
      const getUser = await this.prismaCLient.user.findFirst({
        where: {
          id: +channelData.userId,
        },
      });

      if (channelData.userId === userData.id) {
        messageContent = {
          content: ` ${userData.firstName} ${userData.lastName} is left the group`,
          messageType: MessageType.REMOVE,
        };
      } else {
        messageContent = {
          content: ` ${userData.firstName} ${userData.lastName} removed ${getUser.firstName} ${getUser.lastName} to the group`,
          messageType: MessageType.REMOVE,
        };
      }
      const messageSize = await this.calculateByteSize(
        JSON.stringify(messageContent),
      );
      const messageType = messageSize <= 30 ? 'CONTROL' : 'STANDARD';
      const sendMessage = new SendChannelMessageCommand({
        ChannelArn: channelData.channelArn,
        ChimeBearer: `${this.appInstanceArn}/user/${userData.id}`,
        Content: JSON.stringify(messageContent),
        Type: messageType,
        Persistence: 'PERSISTENT',
      });
      await this.chimeMessage.send(sendMessage);
      const command = new DeleteChannelMembershipCommand({
        ChannelArn: channelData.channelArn,
        ChimeBearer: this.chimeBearerAdmin,
        MemberArn: `${this.appInstanceArn}/user/${channelData.userId}`,
      });

      await this.chimeMessage.send(command);
      const getChannel = await this.getChannelDeatil(channelData.channelArn);
      const getChannelData = await this.prismaCLient.chatRoom.findFirst({
        where: {
          channelArn: channelData.channelArn,
        },
      });
      const metaData = JSON.parse(getChannel.Channel.Metadata);
      delete metaData[channelData.userId];
      const userIds = Object.keys(metaData).join('-');
      getChannelData.roomId = getChannelData.roomId.replace(
        /\d+(-\d+)*$/,
        userIds,
      );
      await this.prismaCLient.chatRoom.update({
        where: {
          id: getChannelData.id,
        },
        data: {
          roomId: getChannelData.roomId,
        },
      });

      const removeMember = await this.updateChannelDeails(
        channelData.channelArn,
        metaData,
      );
      this.chatGateWay.handleJoinMember({
        metaData: JSON.stringify(metaData),
        channelArn: channelData.channelArn,
        userId: channelData.userId,
        memberType: MessageType.REMOVE,
        message: JSON.stringify(messageContent),
        senderId: userData.id,
        senderName: userData.name,
        userIds: userIds.split('-'),
      });
      return removeMember;
    } catch (error) {
      throw new HttpException(
        { message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllUser(searchString, userId) {
    return await this.prismaCLient.user.findMany({
      where: {
        id: {
          notIn: [+GLOBAL_CONFIG.app.awsChimeAdminId, +userId], // Add the second ID here
        },
        OR: [
          {
            lastName: {
              contains: searchString.search,
              mode: 'insensitive',
            },
          },
          {
            firstName: {
              contains: searchString.search,
              mode: 'insensitive',
            },
          },
        ],
      },
    });
  }

  async getUserDetailsFromRequest(channelData) {
    try {
      return await this.prismaCLient.user.findMany({
        where: {
          id: {
            in: channelData.map((id) => +id),
          },
        },
      });
    } catch (error) {
      throw new HttpException(
        { message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  calculateByteSize(message: string) {
    return new TextEncoder().encode(message).length;
  }

  async getChannelDeatil(channelArn) {
    const getChannelDetail = new DescribeChannelCommand({
      ChannelArn: channelArn,
      ChimeBearer: this.chimeBearerAdmin,
    });
    return await this.chimeMessage.send(getChannelDetail);
  }

  async updateChannelDeails(channelArn, metaData) {
    const updateChannle = new UpdateChannelCommand({
      ChannelArn: channelArn,
      Metadata: JSON.stringify(metaData),
      ChimeBearer: this.chimeBearerAdmin,
      Mode: 'UNRESTRICTED',
    });

    return await this.chimeMessage.send(updateChannle);
  }

  async processBatch(batch, channelArn) {
    const promises = batch.map(async (user) => {
      try {
        const command = new CreateChannelMembershipCommand({
          ChannelArn: channelArn,
          ChimeBearer: this.chimeBearerAdmin,
          MemberArn: `${this.appInstanceArn}/user/${user}`,
          Type: 'DEFAULT',
        });
        return await this.chimeMessage.send(command);
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error.message);
        // Handle individual user errors here, but continue with others
      }
    });

    // Wait for all promises in the batch to complete
    await Promise.all(promises);
  }

  async deleteChannel(channelArn) {
    try {
      const deleteChannelArn = new DeleteChannelCommand({
        ChimeBearer: this.chimeBearerAdmin,
        ChannelArn: channelArn.id,
      });
      return await this.chimeMessage.send(deleteChannelArn);
    } catch (error) {
      throw new HttpException(
        { message: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
