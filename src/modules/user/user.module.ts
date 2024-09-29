import { Module } from '@nestjs/common';
import { ChimeService, EmailService } from 'src/shared/services';

import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UserRoleService } from '../user-role/user-role.service';
import { PendingApprovalService } from '../pending_approval_actions/pending_approval_actions.service';

import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserListener } from './user.listener';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [
    EmailService,
    UserService,
    UserRoleService,
    PrismaService,
    UserListener,
    ChimeService,
    PendingApprovalService,
  ],
  exports: [UserService],
})
export class UserModule {}
