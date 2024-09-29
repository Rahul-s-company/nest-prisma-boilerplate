import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { PendingApprovalService } from './pending_approval_actions.service';

@Module({
  providers: [PendingApprovalService, PrismaService],
})
export class PendingApprovalModule {}
