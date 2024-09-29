import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { PendingApprovalService } from '../pending_approval_actions/pending_approval_actions.service';
import { NotificationService } from '../notification/notification.service';

import { KpiService } from './kpi.service';
import { KpiController } from './kpi.controller';

@Module({
  controllers: [KpiController],
  providers: [
    KpiService,
    PendingApprovalService,
    PrismaService,
    NotificationService,
  ],
})
export class KpiModule {}
