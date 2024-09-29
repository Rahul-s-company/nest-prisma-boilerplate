import { Module } from '@nestjs/common';
import { S3Service } from 'src/shared/services';
import { ExportService } from 'src/shared/services';
import { ActivityService } from 'src/shared/services/activity.service';

import { PrismaService } from '../prisma/prisma.service';
import { GoalService } from '../goal/goal.service';
import { InitiativeService } from '../initiative/initiative.service';
import { NotificationService } from '../notification/notification.service';
import { ScorecardService } from '../scorecard/scorecard.service';
import { AssetService } from '../asset/asset.service';
import { PendingApprovalService } from '../pending_approval_actions/pending_approval_actions.service';

import { PartnerPlanController } from './partner-plan.controller';
import { PartnerPlanService } from './partner-plan.service';

@Module({
  controllers: [PartnerPlanController],
  providers: [
    PartnerPlanService,
    PrismaService,
    InitiativeService,
    GoalService,
    NotificationService,
    ScorecardService,
    AssetService,
    PendingApprovalService,
    S3Service,
    ExportService,
    ActivityService,
  ],
})
export class PartnerPlanModule {}
