import { Module } from '@nestjs/common';
import { ExportService, S3Service } from 'src/shared/services';
import { ActivityService } from 'src/shared/services/activity.service';

import { PendingApprovalService } from '../pending_approval_actions/pending_approval_actions.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { ScorecardService } from '../scorecard/scorecard.service';
import { GoalService } from '../goal/goal.service';
import { AssetService } from '../asset/asset.service';
import { PartnerPlanService } from '../partner-plan/partner-plan.service';

import { InitiativeService } from './initiative.service';
import { InitiativeController } from './initiative.controller';

@Module({
  controllers: [InitiativeController],
  providers: [
    PrismaService,
    InitiativeService,
    PendingApprovalService,
    NotificationService,
    GoalService,
    ScorecardService,
    AssetService,
    PartnerPlanService,
    PendingApprovalService,
    S3Service,
    ExportService,
    ActivityService,
  ],
})
export class InitiativeModule {}
