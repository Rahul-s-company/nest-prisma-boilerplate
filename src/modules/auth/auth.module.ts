import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChimeService, EmailService } from 'src/shared/services';

import { UserService } from '../user/user.service';
import { JWT_SECRET } from '../../shared/constants/global.constants';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationService } from '../organization/organization.service';
import { SalesForceService } from '../sales-force/sales-force.service';
import { PartnerService } from '../partner/partner.service';
import { UserRoleService } from '../user-role/user-role.service';
import { PendingApprovalService } from '../pending_approval_actions/pending_approval_actions.service';

import { JwtStrategy } from './auth.jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.register({
      secret: JWT_SECRET,
    }),
    PrismaModule,
  ],
  providers: [
    UserService,
    UserRoleService,
    AuthService,
    JwtStrategy,
    PrismaService,
    EmailService,
    OrganizationService,
    SalesForceService,
    PartnerService,
    ChimeService,
    PendingApprovalService,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
