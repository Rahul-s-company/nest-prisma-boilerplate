import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  Goal,
  ModuleType,
  NotificationType,
  Prisma,
  ProgressStatus,
  StatusType,
} from '@prisma/client';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/shared/constants/strings';
import {
  UPDATE_ACCEPT_NOTIFICATION,
  UPDATE_REJECT_NOTIFICATION,
  getUpdateContentNotification,
} from 'src/shared/constants/notification.constants';
import { ActivityService } from 'src/shared/services/activity.service';

import { PrismaService } from '../prisma/prisma.service';
import { PendingApprovalService } from '../pending_approval_actions/pending_approval_actions.service';
import { AcceptRejectDto } from '../kpi/kpi.dto';
import { NotificationService } from '../notification/notification.service';
import { ScorecardService } from '../scorecard/scorecard.service';
import { AssetService } from '../asset/asset.service';

import { UpdateGoalDto } from './goal.dto';

@Injectable()
export class GoalService {
  constructor(
    private prisma: PrismaService,
    private pendingApprovalService: PendingApprovalService,
    private notificationService: NotificationService,
    private scorecardService: ScorecardService,
    private activityService: ActivityService,
    private assetService: AssetService,
  ) {}
  logger = new Logger(GoalService.name);

  async create(
    data: Prisma.GoalUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Goal | HttpException> {
    const prisma = tx || this.prisma;
    let scoreCardCategoryObj;

    if (data.startValue > data.targetValue) {
      throw new HttpException(
        { message: ERROR_MESSAGES.TARGET_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }

    const initiativeInfo = await prisma.initiative.findFirst({
      where: {
        id: data.initiativeId,
      },
    });

    if (!initiativeInfo?.id) {
      throw new HttpException(
        { message: ERROR_MESSAGES.INVALID_INITIATIVE },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (data.scoreCardCategoryId) {
      scoreCardCategoryObj = {
        planId: data.planId,
        scoreCardCategoryId: data.scoreCardCategoryId,
        goalId: '',
      };

      delete data.scoreCardCategoryId;
    }

    if (data.startValue > 0) {
      data.status = ProgressStatus.IN_PROGRESS;
    } else if (data.startValue === data.targetValue) {
      data.status = ProgressStatus.COMPLETED;
    } else {
      data.status = ProgressStatus.NOT_STARTED;
    }

    const goal = await prisma.goal.create({
      data,
    });

    if (!goal) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (initiativeInfo?.approvalId) {
      await this.pendingApprovalService.remove(initiativeInfo.approvalId);
    }

    await this.activityService.updateInitiativeProgress(goal.initiativeId, tx);

    if (data.status !== ProgressStatus.NOT_STARTED) {
      await prisma.initiative.update({
        where: { id: initiativeInfo.id },
        data: { status: ProgressStatus.IN_PROGRESS },
      });
    }

    if (scoreCardCategoryObj) {
      scoreCardCategoryObj.goalId = goal.id;
      const planGoalScoreCardCategory =
        await this.scorecardService.createReportCard(scoreCardCategoryObj, tx);

      await this.updateGoal(
        goal.id,
        {
          scoreCardCategoryId: planGoalScoreCardCategory.id,
          updatedBy: data.createdBy,
        },
        tx,
      );
    }

    return goal;
  }

  async createGoalIndividual(
    data: Prisma.GoalUncheckedCreateInput,
  ): Promise<Goal | HttpException> {
    return this.prisma.$transaction(async (tx) => {
      return await this.create(data, tx); // Explicitly return the result of this.create
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.GoalWhereUniqueInput;
    where?: Prisma.GoalWhereInput;
    orderBy?: Prisma.GoalOrderByWithRelationInput;
  }): Promise<Goal[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.goal.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: {
        initiative: {
          select: {
            id: true,
            name: true,
          },
        },
        goalApprovalActionId: {
          select: {
            updatedData: true,
            reason: true,
            status: true,
          },
        },
        goalCreatedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        goalOwner: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async count(params: { where?: Prisma.GoalWhereInput }): Promise<number> {
    const { where } = params;
    return this.prisma.goal.count({
      where,
    });
  }

  findOne(id: number): Promise<Goal | null> {
    return this.prisma.goal.findFirst({
      where: { id: id },
      include: {
        goalApprovalActionId: {
          select: {
            updatedData: true,
            reason: true,
          },
        },
        initiative: {
          select: {
            id: true,
            name: true,
          },
        },
        project: {
          select: {
            name: true,
            id: true,
          },
        },
        ScoreCardCategory: {
          select: {
            category: true,
            scoreCardId: true,
          },
        },
        goalOwner: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async update(id: number, userId: number, updateData: UpdateGoalDto) {
    const goalInfo = await this.findOne(id);
    let infoMsg: string;

    if (!goalInfo) {
      throw new HttpException(
        { message: ERROR_MESSAGES.INVALID_DATA + 'Goal' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (userId !== goalInfo.ownerId && userId !== goalInfo.createdBy) {
      throw new HttpException(
        { message: ERROR_MESSAGES.UPDATE_DENIED + 'Goal' },
        HttpStatus.FORBIDDEN,
      );
    }

    if (updateData.startValue > updateData.targetValue) {
      throw new HttpException(
        { message: ERROR_MESSAGES.TARGET_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }

    let updateGoal;

    const updateGoalData: UpdateGoalDto = updateData;
    updateGoalData.updatedBy = userId;

    if (updateData.startValue === goalInfo.targetValue) {
      updateGoalData.status = ProgressStatus.COMPLETED;
    } else if (updateData.startValue > 0) {
      updateGoalData.status = ProgressStatus.IN_PROGRESS;
    } else {
      updateGoalData.status = ProgressStatus.NOT_STARTED;
    }

    if (goalInfo.createdBy === userId) {
      updateGoal = await this.prisma.goal.update({
        data: updateGoalData,
        where: { id: id },
      });

      if (updateData?.startValue !== goalInfo.startValue) {
        this.activityService.updateInitiativeProgress(goalInfo.initiativeId);

        if (goalInfo.scoreCardCategoryId) {
          const progress = parseFloat(
            ((updateGoalData.startValue / goalInfo.targetValue) * 100).toFixed(
              2,
            ),
          );
          const updateReportObj = {
            id: goalInfo.scoreCardCategoryId,
            attainment: updateGoalData.startValue,
            score: progress,
            updatedBy: userId,
          };

          await this.scorecardService.updateReportCard(updateReportObj);
        }
      }

      infoMsg = 'Goal ' + SUCCESS_MESSAGES.UPDATED_SUCCESS;
    } else {
      const updatedData = {
        description: updateGoalData.description,
        category: updateGoalData.category,
        status: updateGoalData.status,
        startValue: updateGoalData.startValue,
      };

      const approvalInfoId = await this.pendingApprovalService.upsert(
        {
          updatedData,
          updateId: goalInfo.id,
          updatedByUserId: userId,
          moduleType: ModuleType.INITIATIVES,
          requiredApprovalBy: goalInfo.createdBy,
          status: StatusType.PENDING,
        },
        goalInfo.approvalId,
      );

      if (!approvalInfoId) {
        throw new HttpException(
          { message: ERROR_MESSAGES.INTERNAL_ERR_MSG },
          HttpStatus.BAD_REQUEST,
        );
      }

      updateGoal = await this.prisma.goal.update({
        data: { approvalId: approvalInfoId, updatedBy: userId },
        where: { id: id },
      });

      const updateContentNotification = getUpdateContentNotification('Goal');

      await this.notificationService.create({
        resourceId: goalInfo.id,
        message: updateContentNotification,
        type: NotificationType.INITIATIVE,
        userId: goalInfo.createdBy,
      });

      infoMsg = 'Goal ' + SUCCESS_MESSAGES.UPDATE_REQ;
    }

    return { msg: infoMsg, data: updateGoal };
  }

  updateGoal(id: number, data: UpdateGoalDto, tx?: Prisma.TransactionClient) {
    const prisma = tx || this.prisma;

    return prisma.goal.update({
      data,
      where: { id: id },
    });
  }

  async remove(id: number, userId: number) {
    try {
      const goalInfo = await this.findOne(Number(id));

      if (!goalInfo) {
        throw new HttpException(
          { message: ERROR_MESSAGES.INVALID_DATA },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (goalInfo.createdBy !== userId && goalInfo.ownerId !== userId) {
        throw new HttpException(
          { message: ERROR_MESSAGES.ALLOW_DELETE_PLAN },
          HttpStatus.FORBIDDEN,
        );
      }
      return this.prisma.$transaction(async (tx) => {
        if (goalInfo?.approvalId) {
          this.pendingApprovalService.remove(goalInfo.approvalId, tx);
        }

        const deleteGoal = await tx.goal.delete({
          where: { id: id },
        });

        await this.activityService.updateInitiativeProgress(
          goalInfo.initiativeId,
          tx,
        );

        await this.assetService.deleteAssets(
          {
            planId: goalInfo.planId,
            assetType: 'GOAL',
            assetSourceId: id,
          },
          tx,
        );

        return deleteGoal;
      });
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  }

  async bulkRemove(
    where: Prisma.GoalWhereInput,
    tx?: Prisma.TransactionClient,
  ) {
    try {
      const prisma = tx || this.prisma;

      // Fetch the IDs of the goals you want to delete
      const goalsToDelete = await prisma.initiative.findMany({
        where,
        select: {
          id: true,
        },
      });

      // Extract the IDs from the fetched goals
      const goalIds = goalsToDelete.map((goal) => goal.id);

      // Delete the initiatives
      await prisma.goal.deleteMany({
        where,
      });

      if (goalIds) {
        this.pendingApprovalService.bulkRemove(
          {
            updateId: {
              in: goalIds,
            },
            moduleType: ModuleType.GOALS,
          },
          tx,
        );
      }
    } catch (error) {
      this.logger.error('Error deleting bulk goal actions:', error);
      throw error;
    }
  }

  async acceptRejectUpdate(data: AcceptRejectDto) {
    const goalInfo = await this.findOne(data.id);

    if (!goalInfo || !goalInfo.approvalId) {
      throw new HttpException(
        { message: ERROR_MESSAGES.INVALID_DATA + 'goal' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (data.userId !== goalInfo.createdBy) {
      throw new HttpException(
        { message: ERROR_MESSAGES.UPDATE_DENIED + 'goal' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const approvalInfo = await this.pendingApprovalService.findOne(
      goalInfo.approvalId,
    );
    const updateData: any = approvalInfo.updatedData;

    updateData.approvalId = null;

    if (data.status === StatusType.ACCEPT) {
      await this.prisma.goal.update({
        data: updateData,
        where: { id: data.id },
      });

      await this.pendingApprovalService.remove(goalInfo.approvalId);

      this.activityService.updateInitiativeProgress(goalInfo.initiativeId);

      if (goalInfo.scoreCardCategoryId && updateData?.startValue) {
        const progress = parseFloat(
          ((updateData.startValue / goalInfo.targetValue) * 100).toFixed(2),
        );

        const updateReportObj = {
          id: goalInfo.scoreCardCategoryId,
          attainment: updateData.startValue,
          score: progress,
          updatedBy: data.userId,
        };

        await this.scorecardService.updateReportCard(updateReportObj);
      }
    } else {
      await this.pendingApprovalService.update(
        { id: goalInfo.approvalId },
        {
          status: StatusType.REJECT,
          reason: data.reason,
        },
      );
    }

    const updateMsg =
      'Goal ' + (data.status === StatusType.ACCEPT)
        ? UPDATE_ACCEPT_NOTIFICATION
        : UPDATE_REJECT_NOTIFICATION;

    await this.notificationService.create({
      resourceId: goalInfo.id,
      message: updateMsg,
      type: NotificationType.INITIATIVE,
      userId: goalInfo.ownerId,
    });

    return approvalInfo;
  }
}
