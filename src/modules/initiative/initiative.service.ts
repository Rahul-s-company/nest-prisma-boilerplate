import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  AssetFolderType,
  Initiative,
  ModuleType,
  NotificationType,
  Prisma,
  ProgressStatus,
  StatusType,
} from '@prisma/client';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/shared/constants/strings';
import {
  CREATE_INITIATIVE_NOTIFICATION,
  UPDATE_ACCEPT_NOTIFICATION,
  UPDATE_REJECT_NOTIFICATION,
  getUpdateContentNotification,
} from 'src/shared/constants/notification.constants';

import { PrismaService } from '../prisma/prisma.service';
import { PendingApprovalService } from '../pending_approval_actions/pending_approval_actions.service';
import { AcceptRejectDto } from '../kpi/kpi.dto';
import { NotificationService } from '../notification/notification.service';
import { GoalService } from '../goal/goal.service';
import { ScorecardService } from '../scorecard/scorecard.service';
import { AssetService } from '../asset/asset.service';

import { CreateInitiativeDto, UpdateInitiativeDto } from './initiative.dto';

@Injectable()
export class InitiativeService {
  constructor(
    private prisma: PrismaService,
    private pendingApprovalService: PendingApprovalService,
    private notificationService: NotificationService,
    private goalService: GoalService,
    private scorecardService: ScorecardService,
    private assetService: AssetService,
  ) {}
  logger = new Logger(InitiativeService.name);

  async createInitiativeWithGoal(
    data: CreateInitiativeDto,
  ): Promise<Initiative> {
    const planInfo = await this.prisma.plan.findFirst({
      where: { id: data.planId },
    });

    if (!planInfo) {
      throw new HttpException(
        { message: 'Invalid Plan id' },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const initiativeData: any = {
        planId: data.planId,
        name: data.name,
        category: data.category,
        industry: data.industry,
        completionDate: data.completionDate,
        tags: data.tags,
        ownerId: data.ownerId,
        description: data.description,
        country: data.country,
        region: data.region,
        geo: data.geo,
        status: data.status,
        createdBy: data.createdBy,
      };
      const assetArr = [];

      const initiativeInfo: any = await this.create(initiativeData, tx);

      assetArr.push({
        resourceId: initiativeInfo.id,
        type: AssetFolderType.INITIATIVE,
        assetName: initiativeInfo.name,
        createdBy: data.createdBy,
        partnerId: planInfo.partnerId,
        planId: initiativeInfo.planId,
        initiativeId: initiativeInfo.id,
      });

      if (data.goalDetails) {
        let scoreCardCategoryObj;

        if (data.goalDetails.scoreCardCategoryId) {
          scoreCardCategoryObj = {
            planId: data.planId,
            scoreCardCategoryId: data.goalDetails.scoreCardCategoryId,
          };

          delete data.goalDetails.scoreCardCategoryId;
        }

        const goalObj = data.goalDetails;
        goalObj.planId = data.planId;
        goalObj.initiativeId = initiativeInfo.id;
        goalObj.createdBy = data.createdBy;

        //create a goal
        const goalInfo: any = await this.goalService.create(goalObj, tx);
        initiativeInfo.goalId = goalInfo.id;

        if (scoreCardCategoryObj) {
          scoreCardCategoryObj.goalId = goalInfo.id;

          const planGoalScoreCardCategory =
            await this.scorecardService.createReportCard(
              scoreCardCategoryObj,
              tx,
            );

          await this.goalService.updateGoal(
            goalInfo.id,
            {
              scoreCardCategoryId: planGoalScoreCardCategory.id,
              updatedBy: data.createdBy,
            },
            tx,
          );
        }

        assetArr.push({
          resourceId: goalInfo.id,
          type: AssetFolderType.GOAL,
          assetName: goalInfo.name,
          createdBy: data.createdBy,
          partnerId: planInfo.partnerId,
          planId: initiativeInfo.planId,
          initiativeId: initiativeInfo.id,
        });

        await this.notificationService.create(
          {
            resourceId: initiativeInfo.id,
            message: CREATE_INITIATIVE_NOTIFICATION,
            type: NotificationType.INITIATIVE,
            userId: initiativeInfo.ownerId,
          },
          tx,
        );
      }

      if (data.status !== ProgressStatus.NOT_STARTED) {
        await tx.plan.update({
          where: { id: initiativeInfo.planId },
          data: { status: ProgressStatus.IN_PROGRESS },
        });
      }

      await this.assetService.createFolder(assetArr, tx);

      return initiativeInfo;
    });
  }

  async create(
    data: Prisma.InitiativeUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Initiative> {
    const prisma = tx || this.prisma;

    const initiative = await prisma.initiative.create({
      data,
    });

    return initiative;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.InitiativeWhereUniqueInput;
    where?: Prisma.InitiativeWhereInput;
    orderBy?: Prisma.InitiativeOrderByWithRelationInput;
  }): Promise<Initiative[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.initiative.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: {
        initiativeApprovalActionId: {
          select: {
            id: true,
            updatedData: true,
            reason: true,
            status: true,
          },
        },
        initiativeOwner: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        Goal: {
          select: {
            id: true,
            name: true,
          },
        },
        initiativeCreatedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async count(params: {
    where?: Prisma.InitiativeWhereInput;
  }): Promise<number> {
    const { where } = params;
    return this.prisma.initiative.count({
      where,
    });
  }

  findOne(id: number): Promise<Initiative | null> {
    return this.prisma.initiative.findFirst({
      where: { id: id },
      include: {
        initiativeOwner: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        initiativeApprovalActionId: {
          select: {
            updatedData: true,
            reason: true,
          },
        },
        project: {
          select: {
            name: true,
            id: true,
          },
        },
        _count: {
          select: { Goal: true },
        },
      },
    });
  }

  async update(id: number, userId: number, updateData: UpdateInitiativeDto) {
    const initiativeInfo = await this.findOne(id);
    let infoMsg: string;

    if (!initiativeInfo) {
      throw new HttpException(
        { message: ERROR_MESSAGES.INVALID_DATA + 'Initiative' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      initiativeInfo.ownerId !== userId &&
      initiativeInfo.createdBy !== userId
    ) {
      throw new HttpException(
        { message: ERROR_MESSAGES.UPDATE_DENIED + 'Initiative' },
        HttpStatus.FORBIDDEN,
      );
    }

    if (updateData.progress > 100) {
      throw new HttpException(
        { message: ERROR_MESSAGES.PROGRESS_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }

    let updateInitiative;

    const updateInitiativeData: UpdateInitiativeDto = updateData;
    updateInitiativeData.updatedBy = userId;

    if (initiativeInfo.createdBy === userId) {
      updateInitiative = await this.prisma.initiative.update({
        data: updateInitiativeData,
        where: { id: id },
      });

      infoMsg = 'Initiative ' + SUCCESS_MESSAGES.UPDATED_SUCCESS;
    } else {
      const updatedData = {
        description: updateInitiativeData.description,
        tags: updateInitiativeData.tags,
        status: updateInitiativeData.status,
        progress: updateInitiativeData.progress,
      };

      const approvalInfoId = await this.pendingApprovalService.upsert(
        {
          updatedData,
          updateId: initiativeInfo.id,
          updatedByUserId: userId,
          moduleType: ModuleType.INITIATIVES,
          requiredApprovalBy: initiativeInfo.createdBy,
          status: StatusType.PENDING,
        },
        initiativeInfo.approvalId,
      );

      if (!approvalInfoId) {
        throw new HttpException(
          { message: ERROR_MESSAGES.INTERNAL_ERR_MSG },
          HttpStatus.BAD_REQUEST,
        );
      }

      updateInitiative = await this.prisma.initiative.update({
        data: { approvalId: approvalInfoId, updatedBy: userId },
        where: { id: id },
      });

      const updateContentNotification =
        getUpdateContentNotification('Initiative');

      await this.notificationService.create({
        resourceId: initiativeInfo.id,
        message: updateContentNotification,
        type: NotificationType.INITIATIVE,
        userId: initiativeInfo.createdBy,
      });

      infoMsg = 'Initiative ' + SUCCESS_MESSAGES.UPDATE_REQ;
    }

    return { msg: infoMsg, data: updateInitiative };
  }

  updateInitiative(
    id: number,
    data: UpdateInitiativeDto,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;

    return prisma.initiative.update({
      data,
      where: { id: id },
    });
  }

  async remove(id: number, userId: number) {
    try {
      const initiativeInfo = await this.findOne(Number(id));

      if (!initiativeInfo) {
        throw new HttpException(
          { message: ERROR_MESSAGES.INVALID_DATA },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (
        initiativeInfo.createdBy !== userId &&
        initiativeInfo.ownerId !== userId
      ) {
        throw new HttpException(
          { message: ERROR_MESSAGES.ALLOW_DELETE_PLAN },
          HttpStatus.FORBIDDEN,
        );
      }

      const goalInfo = await this.prisma.goal.findMany({
        where: { initiativeId: id },
        select: {
          id: true,
        },
      });

      return this.prisma.$transaction(async (tx) => {
        if (initiativeInfo?.approvalId) {
          this.pendingApprovalService.remove(initiativeInfo.approvalId, tx);
        }

        await this.assetService.deleteAssets(
          {
            planId: initiativeInfo.planId,
            assetType: 'INITIATIVE',
            assetSourceId: id,
          },
          tx,
        );

        if (goalInfo) {
          for (const data of goalInfo) {
            await this.assetService.deleteAssets(
              {
                planId: initiativeInfo.planId,
                assetType: 'GOAL',
                assetSourceId: data.id,
              },
              tx,
            );
          }
        }

        await tx.goal.deleteMany({
          where: { initiativeId: id },
        });

        const deleteInitiative = await tx.initiative.delete({
          where: { id: id },
        });

        return deleteInitiative;
      });
    } catch (error) {
      console.error('Error deleting initiative:', error);
      throw error;
    }
  }

  async bulkRemove(
    where: Prisma.InitiativeWhereInput,
    tx?: Prisma.TransactionClient,
  ) {
    try {
      const prisma = tx || this.prisma;

      // Fetch the IDs of the initiatives you want to delete
      const initiativesToDelete = await prisma.initiative.findMany({
        where,
        select: {
          id: true,
        },
      });

      // Extract the IDs from the fetched initiatives
      const initiativeIds = initiativesToDelete.map(
        (initiative) => initiative.id,
      );

      // Delete the initiatives
      await prisma.initiative.deleteMany({
        where,
      });

      if (initiativeIds) {
        this.pendingApprovalService.bulkRemove(
          {
            updateId: {
              in: initiativeIds,
            },
            moduleType: ModuleType.INITIATIVES,
          },
          tx,
        );
      }
    } catch (error) {
      this.logger.error('Error deleting bulk initiative actions:', error);
      throw error;
    }
  }

  async acceptRejectUpdate(data: AcceptRejectDto) {
    const initiativeInfo = await this.findOne(data.id);

    if (!initiativeInfo || !initiativeInfo.approvalId) {
      throw new HttpException(
        { message: ERROR_MESSAGES.INVALID_DATA + 'initiative' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (data.userId !== initiativeInfo.createdBy) {
      throw new HttpException(
        { message: ERROR_MESSAGES.UPDATE_DENIED + 'initiative' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const approvalInfo = await this.pendingApprovalService.findOne(
      initiativeInfo.approvalId,
    );
    const updateData: any = approvalInfo.updatedData;

    updateData.approvalId = null;

    if (data.status === StatusType.ACCEPT) {
      await this.prisma.initiative.update({
        data: updateData,
        where: { id: data.id },
      });

      await this.pendingApprovalService.remove(initiativeInfo.approvalId);
    } else {
      await this.pendingApprovalService.update(
        { id: initiativeInfo.approvalId },
        {
          status: StatusType.REJECT,
          reason: data.reason,
        },
      );
    }

    const updateMsg =
      'Initiative ' + (data.status === StatusType.ACCEPT)
        ? UPDATE_ACCEPT_NOTIFICATION
        : UPDATE_REJECT_NOTIFICATION;

    await this.notificationService.create({
      resourceId: initiativeInfo.id,
      message: updateMsg,
      type: NotificationType.INITIATIVE,
      userId: initiativeInfo.ownerId,
    });

    return approvalInfo;
  }
}
