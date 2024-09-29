import { Prisma, User } from '@prisma/client';
import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { EMAIL_SUBJECTS, ERROR_MESSAGES } from 'src/shared/constants/strings';
import { EmailService } from 'src/shared/services';
import { ChimeService } from 'src/shared/services/chime.service';

import { PrismaService } from '../prisma/prisma.service';
import { PendingApprovalService } from '../pending_approval_actions/pending_approval_actions.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private chimeService: ChimeService,
    private pendingApprovalService: PendingApprovalService,
  ) {}

  async findUser(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: userWhereUniqueInput,
      });
    } catch (error) {
      // Handle the error here
      console.error('Error finding user:', error);
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_USER);
    }
  }

  async findUserWithDetail(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
    tx?: Prisma.TransactionClient,
  ) {
    try {
      const prisma = tx || this.prisma;

      return await prisma.user.findUnique({
        where: userWhereUniqueInput,
        include: {
          organization: {
            select: {
              companyName: true,
            },
          },
          role: {
            select: {
              name: true,
            },
          },
        },
      });
    } catch (error) {
      // Handle the error here
      console.error('Error finding user:', error);
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_USER);
    }
  }

  async users(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    data.email = data.email.toLowerCase();

    return this.prisma.user.create({
      data,
    });
  }

  async signUpUser(
    data: Prisma.UserUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    try {
      const prisma = tx || this.prisma;
      data.email = data.email.toLowerCase();

      const userCreated = await prisma.user.create({
        data,
      });
      await this.chimeService.createAppInstanceUser(userCreated);
      return userCreated;
    } catch (error) {
      let msg = ERROR_MESSAGES.ACCOUNT_EXIST;
      if (data?.isInvitedBy) {
        msg = ERROR_MESSAGES.USER_EXIST;
      }

      // Handle the error here
      throw new HttpException(
        { message: msg, error: 'Bad Request' },
        HttpStatus.CONFLICT,
      );
    }
  }

  async updateUser(
    params: {
      where: Prisma.UserWhereUniqueInput;
      data: Prisma.UserUncheckedUpdateInput;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    const prisma = tx || this.prisma;
    const { where, data } = params;

    return prisma.user.update({
      data,
      where,
    });
  }

  async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<any> {
    const opportunityCount = await this.prisma.opportunity.count({
      where: {
        opportunityOwnerUserId: where.id,
        opportunityReceiverId: where.id,
      },
    });

    if (opportunityCount > 0) {
      throw new HttpException(
        { message: ERROR_MESSAGES.DELETE_USER_ERROR },
        HttpStatus.BAD_REQUEST,
      );
    }

    const getUserDetailById = await this.prisma.user.findFirst({
      where: {
        id: where.id,
      },
    });

    if (getUserDetailById.approvalId) {
      await this.pendingApprovalService.remove(getUserDetailById.approvalId);
    }

    const deleteUser = await this.prisma.user.delete({
      where,
    });

    if (deleteUser) {
      this.chimeService.deleteAppInstanceUser(getUserDetailById);
    }

    return deleteUser;
  }

  async sentAccountCreationEmail(data, tx?: Prisma.TransactionClient) {
    const userData = await this.findUserWithDetail(
      {
        email: data.email,
      },
      tx ?? undefined,
    );

    const emailData = {
      name: data.firstName,
      email: data.email,
      password: data.password,
      frontendUrl: process.env.FRONTEND_URL,
      companyName: userData.organization.companyName,
      role: userData.role.name
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .toUpperCase(),
    };

    this.emailService.processEmail(
      'account-creation',
      [data.email],
      emailData,
      EMAIL_SUBJECTS.INVITE_USER,
    );

    return true;
  }

  async findUserDetail(params: {
    where?: Prisma.UserWhereInput;
  }): Promise<User | null> {
    const { where } = params;
    return this.prisma.user.findFirst({
      where,
    });
  }
}
