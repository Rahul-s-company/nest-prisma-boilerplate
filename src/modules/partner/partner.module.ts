import { Module } from '@nestjs/common';
import { ChimeService, EmailService } from 'src/shared/services';

import { UserService } from '../user/user.service';
import { OrganizationService } from '../organization/organization.service';
import { PrismaService } from '../prisma/prisma.service';
import { PendingApprovalService } from '../pending_approval_actions/pending_approval_actions.service';

import { PartnerController } from './partner.controller';
import { PartnerService } from './partner.service';

@Module({
  controllers: [PartnerController],
  providers: [
    PrismaService,
    PartnerService,
    UserService,
    OrganizationService,
    EmailService,
    ChimeService,
    PendingApprovalService,
  ],
})
export class PartnerModule {}
