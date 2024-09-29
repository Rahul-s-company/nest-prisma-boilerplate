import { Module } from '@nestjs/common';
import { ChimeService, EmailService, S3Service } from 'src/shared/services';

import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { UserRoleService } from '../user-role/user-role.service';
import { NotificationService } from '../notification/notification.service';
import { SalesForceService } from '../sales-force/sales-force.service';
import { PendingApprovalService } from '../pending_approval_actions/pending_approval_actions.service';

import { OpportunityService } from './opportunity.service';
import { OpportunityController } from './opportunity.controller';

@Module({
  imports: [],
  controllers: [OpportunityController],
  providers: [
    OpportunityService,
    PrismaService,
    UserService,
    EmailService,
    UserRoleService,
    NotificationService,
    SalesForceService,
    S3Service,
    ChimeService,
    PendingApprovalService,
  ],
  exports: [OpportunityService],
})
export class OpportunityModule {}
