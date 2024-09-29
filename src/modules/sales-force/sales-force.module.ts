import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ChimeService, EmailService } from 'src/shared/services';
import { JWT_SECRET } from 'src/shared/constants/global.constants';

import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { OrganizationService } from '../organization/organization.service';
import { PartnerService } from '../partner/partner.service';
import { UserRoleService } from '../user-role/user-role.service';
import { PendingApprovalService } from '../pending_approval_actions/pending_approval_actions.service';

import { SalesForceController } from './sales-force.controller';
import { SalesForceService } from './sales-force.service';

@Module({
  controllers: [SalesForceController],
  imports: [
    JwtModule.register({
      secret: JWT_SECRET,
    }),
  ],
  providers: [
    SalesForceService,
    UserRoleService,
    AuthService,
    UserService,
    PrismaService,
    OrganizationService,
    JwtService,
    EmailService,
    PartnerService,
    ChimeService,
    PendingApprovalService,
  ],
})
export class SalesForceModule {}
