import { Module } from '@nestjs/common';
import { ExportService, S3Service } from 'src/shared/services';
import { ActivityService } from 'src/shared/services/activity.service';

import { PrismaService } from '../prisma/prisma.service';
import { PendingApprovalService } from '../pending_approval_actions/pending_approval_actions.service';
import { NotificationService } from '../notification/notification.service';
import { ScorecardService } from '../scorecard/scorecard.service';
import { AssetService } from '../asset/asset.service';

import { GoalService } from './goal.service';
import { GoalController } from './goal.controller';

@Module({
  controllers: [GoalController],
  providers: [
    PrismaService,
    GoalService,
    PendingApprovalService,
    NotificationService,
    ExportService,
    ScorecardService,
    ActivityService,
    S3Service,
    AssetService,
  ],
})
export class GoalModule {}
