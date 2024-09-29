import { Module } from '@nestjs/common';
import { ExportService, S3Service } from 'src/shared/services';
import { ActivityService } from 'src/shared/services/activity.service';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { GoalService } from '../goal/goal.service';
import { InitiativeService } from '../initiative/initiative.service';
import { PendingApprovalService } from '../pending_approval_actions/pending_approval_actions.service';
import { ScorecardService } from '../scorecard/scorecard.service';
import { AssetService } from '../asset/asset.service';
import { PartnerPlanService } from '../partner-plan/partner-plan.service';

import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

@Module({
  controllers: [ProjectController],
  providers: [
    ProjectService,
    PrismaService,
    NotificationService,
    InitiativeService,
    GoalService,
    PendingApprovalService,
    ScorecardService,
    AssetService,
    S3Service,
    ActivityService,
    PartnerPlanService,
    ExportService,
  ],
})
export class ProjectModule {}
