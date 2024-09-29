import { InjectRedis } from '@nestjs-modules/ioredis';
import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import Redis from 'ioredis';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { JWT_SECRET } from 'src/shared/constants/global.constants';

import { MessageType } from './chat.dto';

@WebSocketGateway({
  cors: {
    // origin: process.env.FRONTEND_URL,
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  logger = new Logger('server connection webscoet');
  @WebSocketServer() server: Server;

  constructor(
    @InjectRedis() private readonly redisClient: Redis,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log('client', client.id);
    const authToken = client.handshake.headers['authorization'];

    if (!authToken) {
      client.disconnect();
      return;
    }
    const valid = await this.validateToken(authToken);

    if (!valid) {
      client.disconnect();
    }
    const userId = client.handshake.query.userId as string;

    if (userId) {
      await this.addUserSocket(userId, client.id);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (userId) {
      await this.removeUserSocket(userId, client.id);
    }
    this.server.emit('connection', 'user left', client.id);
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(client: Socket, roomId: string) {
    client.join(roomId);
    this.logger.log(`Client ${client.id} joined room ${roomId}`);
  }

  @SubscribeMessage('message')
  async handleNewMessage(payload: {
    message: string;
    roomId: string;
    userIds: string[];
    senderId: string;
    messageId: string;
    createdTimestamp: Date;
    senderName: string;
    metaData: string;
  }) {
    this.logger.log('New message received:', payload);
    for (const userId of payload.userIds) {
      const userSockets = await this.getUserSockets(userId.toString());

      if (userSockets) {
        userSockets.forEach((socketId) => {
          this.server
            .to(socketId)
            .emit('receive_message', JSON.stringify(payload));
          this.server
            .to(socketId)
            .emit('channel_notification', JSON.stringify(payload));
        });
      }
    }
  }

  @SubscribeMessage('add_remove_member')
  async handleJoinMember(payload: {
    metaData: string;
    userId: string;
    channelArn: string;
    memberType: string;
    message: string;
    senderId: string;
    senderName: string;
    userIds: string[];
  }) {
    if (payload.memberType === MessageType.REMOVE) {
      const userSocket = await this.getUserSockets(payload.userId.toString());
      this.server
        .to(userSocket[0])
        .emit('add_remove_member', JSON.stringify(payload));
    }
    for (const userId of payload.userIds) {
      const userSockets = await this.getUserSockets(userId.toString());

      if (userSockets) {
        userSockets.forEach((socketId) => {
          this.server
            .to(socketId)
            .emit('add_remove_member', JSON.stringify(payload));
        });
      }
    }
  }

  private async addUserSocket(userId: string, socketId: string) {
    this.logger.log(`Added userId: ${userId}, socketId: ${socketId}`);
    const userIdExist = await this.getUserSockets(userId);

    if (userIdExist.length > 0) {
      // Remove the old socketId if the user already exists
      await this.redisClient.srem(`user:${userId}`, userIdExist[0]);
    }

    // Add the new socketId to the user's Redis set
    await this.redisClient.sadd(`user:${userId}`, socketId);

    // Set an expiry time (e.g., 24 hour = 86400 seconds)
    await this.redisClient.expire(`user:${userId}`, 86400);
  }

  private async removeUserSocket(userId: string, socketId: string) {
    await this.redisClient.srem(`user:${userId}`, socketId);
    const socketCount = await this.redisClient.scard(`user:${userId}`);

    if (socketCount === 0) {
      this.logger.log(`removed userId: ${userId}, socketId: ${socketId}`);
      await this.redisClient.del(`user:${userId}`);
    }
  }

  private async getUserSockets(userId: string): Promise<string[]> {
    return await this.redisClient.smembers(`user:${userId}`);
  }

  private async getAllSockets(): Promise<string[]> {
    const keys = await this.redisClient.keys('user:*');
    const allSockets: string[] = [];
    for (const key of keys) {
      const sockets = await this.redisClient.smembers(key);
      allSockets.push(...sockets);
    }
    return allSockets;
  }

  private async validateToken(token: string): Promise<boolean> {
    try {
      const decoded = await this.jwtService.verify(token, {
        publicKey: JWT_SECRET,
      });
      // Optionally, you can check the decoded token's content here
      return !!decoded; // Return true if the decoded token is valid
    } catch (e) {
      return false; // Token is invalid
    }
  }
}
