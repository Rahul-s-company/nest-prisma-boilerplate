import {
  ChimeSDKIdentityClient,
  CreateAppInstanceAdminCommand,
  CreateAppInstanceCommand,
  CreateAppInstanceUserCommand,
  DeleteAppInstanceUserCommand,
  ListAppInstanceUsersCommand,
  UpdateAppInstanceUserCommand,
} from '@aws-sdk/client-chime-sdk-identity';
import { ChimeSDKMessagingClient } from '@aws-sdk/client-chime-sdk-messaging';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { GLOBAL_CONFIG } from 'src/configs/global.config';
import { PrismaService } from 'src/modules/prisma/prisma.service';

@Injectable()
export class ChimeService {
  chimeIdentity: ChimeSDKIdentityClient;
  appInstanceArn = GLOBAL_CONFIG.app.awsChimeAccountId;
  logger = new Logger(ChimeService.name);
  chimeMessage: ChimeSDKMessagingClient;
  chimeBearerAdmin = `${this.appInstanceArn}/user/${GLOBAL_CONFIG.app.awsChimeAdminId}`;
  constructor(private prismaClient: PrismaService) {
    this.chimeIdentity = new ChimeSDKIdentityClient({
      region: 'us-east-1',
    });
  }

  async createAppInstanceUser(data) {
    try {
      const createUserCommand = new CreateAppInstanceUserCommand({
        AppInstanceArn: this.appInstanceArn,
        AppInstanceUserId: String(data.id),
        Name: data.email,
        Metadata: data.email,
      });
      // Execute the command to create the user in AWS Chime
      await this.chimeIdentity.send(createUserCommand);
      return true;
    } catch (error) {
      this.logger.error('Error create user in chime:', error);
      throw new HttpException(
        { message: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async deleteAppInstanceUser(data) {
    try {
      const deleteUserInChime = new DeleteAppInstanceUserCommand({
        AppInstanceUserArn: `${this.appInstanceArn}/user/${data.id}`,
      });
      await this.chimeIdentity.send(deleteUserInChime);
      return true;
    } catch (error) {
      this.logger.error('Error create user in chime:', error);
      throw new HttpException(
        { message: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateAppInstanceUser(userData, profileResponse) {
    try {
      const getUserDetails = new ListAppInstanceUsersCommand({
        AppInstanceArn: this.appInstanceArn,
      });
      const getUserDetail = await this.chimeIdentity.send(getUserDetails);
      const filterUser = getUserDetail.AppInstanceUsers.filter(
        (user) =>
          user.AppInstanceUserArn ===
          `${this.appInstanceArn}/user/${userData.id}`,
      );

      if (filterUser.length > 0) {
        const createUserCommand = new UpdateAppInstanceUserCommand({
          AppInstanceUserArn: filterUser[0].AppInstanceUserArn,
          Metadata: filterUser[0].Metadata,
          Name: `${profileResponse.firstName} ${profileResponse.lastName}`,
        });
        await this.chimeIdentity.send(createUserCommand);
      }
      return true;
    } catch (error) {
      this.logger.error('Error create user in chime:', error);
      throw new HttpException(
        { message: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async createAppInstance() {
    const createInstance = new CreateAppInstanceCommand({
      // Define the necessary parameters for creating a user in AWS Chime
      Name: 'demo-dev-chime',
    });
    try {
      return await this.chimeIdentity.send(createInstance);
    } catch (error) {
      throw new HttpException(
        { message: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async migrateUsers(appInstanceArn) {
    try {
      // Fetch users from the database
      const users = await this.prismaClient.user.findMany({
        where: {
          deletedAt: null, // Only fetch active users
        },
      });

      const BATCH_SIZE = 20;
      for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);

        // Process the current batch using Promise.all
        await this.processBatch(batch, appInstanceArn.appInstance);
      }
    } catch (error) {
      throw new HttpException(
        { message: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async processBatch(batch, appInstanceArn) {
    const promises = batch.map(async (user) => {
      try {
        const createUserCommand = new CreateAppInstanceUserCommand({
          AppInstanceArn: appInstanceArn,
          AppInstanceUserId: String(user.id),
          Name: `${user.firstName} ${user.lastName}`,
          Metadata: user.email, // Ensure Metadata conforms to Chime's requirements
        });
        console.log(`Processing user: ${user.id}`);

        // Send the command to Chime
        return await this.chimeIdentity.send(createUserCommand);
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error.message);
        // Handle individual user errors here, but continue with others
      }
    });

    // Wait for all promises in the batch to complete
    await Promise.all(promises);
  }

  async makeAppInstanceAdmin() {
    try {
      const addAdmin = new CreateAppInstanceAdminCommand({
        AppInstanceAdminArn: `${GLOBAL_CONFIG.app.awsChimeAccountId}/user/${GLOBAL_CONFIG.app.awsChimeAdminId}`,
        AppInstanceArn: GLOBAL_CONFIG.app.awsChimeAccountId,
      });
      return await this.chimeIdentity.send(addAdmin);
    } catch (error) {
      throw new HttpException(
        { message: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
