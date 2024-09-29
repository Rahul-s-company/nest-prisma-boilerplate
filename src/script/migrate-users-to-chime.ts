import { PrismaClient } from '@prisma/client';
import {
  ChimeSDKIdentityClient,
  CreateAppInstanceCommand,
  CreateAppInstanceUserCommand,
} from '@aws-sdk/client-chime-sdk-identity';
import { fromEnv } from '@aws-sdk/credential-providers';
import { HttpException, HttpStatus } from '@nestjs/common';

// Initialize Prisma Client
const prisma = new PrismaClient();

// Initialize AWS Chime SDK
const chime = new ChimeSDKIdentityClient({
  region: 'us-east-1',
  credentials: fromEnv(),
});

let appInstanceArn =
  'arn:aws:chime:us-east-1:730335567299:app-instance/5b7ce6f3-ac70-46b3-a4ea-69bc37e9e164';
async function createAppInstance() {
  const createInstance = new CreateAppInstanceCommand({
    // Define the necessary parameters for creating a user in AWS Chime
    Name: 'nest-dev',
  });
  try {
    const response = await chime.send(createInstance);
    appInstanceArn = response.AppInstanceArn;
    migrateUsers();
  } catch (error) {
    throw new HttpException({ message: error.message }, HttpStatus.BAD_REQUEST);
  }
}
createAppInstance();

async function migrateUsers() {
  try {
    // Fetch users from the database
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null, // Only fetch active users
      },
    });

    // Iterate over each user and sync them with AWS Chime
    for (const user of users) {
      try {
        const createUserCommand = new CreateAppInstanceUserCommand({
          AppInstanceArn: appInstanceArn,
          AppInstanceUserId: String(user.id),
          Name: `${user.firstName} ${user.lastName}`,
          Metadata: user.email,
        });

        // Execute the command to create the user in AWS Chime
        return await chime.send(createUserCommand);
      } catch (error) {
        throw new HttpException(
          { message: error.message },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  } catch (error) {
    throw new HttpException({ message: error.message }, HttpStatus.BAD_REQUEST);
  } finally {
    await prisma.$disconnect();
  }
}
migrateUsers();

// async function listAppInstances() {
//   const command = new ListAppInstancesCommand();
//   try {
//     const response = await chime.send(command);
//     console.log('Users in App Instance:', response);
//   } catch (error) {
//     console.error('Error listing users:', error);
//   }
// }

// async function listAppInstanceUsers(appInstanceArn) {
//   const command = new ListAppInstanceUsersCommand({
//     AppInstanceArn: appInstanceArn,
//   });
//   try {
//     return await chime.send(command);
//   } catch (error) {
//     throw new HttpException({ message: error.message }, HttpStatus.BAD_REQUEST);
//   }
// }

// listAppInstanceUsers(appInstanceArn)
// async function deleteAppInstanceUser(appInstanceArn) {
//   const command = new DeleteAppInstanceUserCommand({
//     AppInstanceUserArn: appInstanceArn,
//   });
//   try {
//     const response = await chime.send(command);
//     console.log('Users in App Instance:', response);
//   } catch (error) {
//     console.error('Error listing users:', error);
//   }
// }

// deleteAppInstanceUser('arn:aws:chime:us-east-1:730335567299:app-instance/5b7ce6f3-ac70-46b3-a4ea-69bc37e9e164/user/5')
