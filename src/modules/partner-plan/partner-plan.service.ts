import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  AssetFolderType,
  NotificationType,
  Plan,
  Prisma,
  ProgressStatus,
} from '@prisma/client';
import { ERROR_MESSAGES } from 'src/shared/constants/strings';
import { CREATE_PLAN_NOTIFICATION } from 'src/shared/constants/notification.constants';

import { PrismaService } from '../prisma/prisma.service';
import { InitiativeService } from '../initiative/initiative.service';
import { GoalService } from '../goal/goal.service';
import { NotificationService } from '../notification/notification.service';
import { ScorecardService } from '../scorecard/scorecard.service';
import { AssetService } from '../asset/asset.service';

import { CreatePartnerPlanDto, UpdatePartnerPlanDto } from './partner-plan.dto';

@Injectable()
export class PartnerPlanService {
  constructor(
    private prisma: PrismaService,
    private goalService: GoalService,
    private initiativeService: InitiativeService,
    private notificationService: NotificationService,
    private scorecardService: ScorecardService,
    private assetService: AssetService,
  ) {}
  logger = new Logger(PartnerPlanService.name);

  create(data: Prisma.PlanUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    const prisma = tx || this.prisma;

    return prisma.plan.create({ data });
  }

  async createPartnerPlan(userId: number, data: CreatePartnerPlanDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        //create a plan
        const assetArr = [];

        data.planOverview.createdBy = userId;
        const planInfo: any = await this.create(data.planOverview, tx);

        if (!planInfo) {
          throw new HttpException(
            { message: ERROR_MESSAGES.INTERNAL_ERR_MSG, err: planInfo },
            HttpStatus.BAD_REQUEST,
          );
        }

        const planId = planInfo.id;
        assetArr.push({
          resourceId: planInfo.id,
          type: AssetFolderType.PLAN,
          assetName: planInfo.name,
          createdBy: userId,
          partnerId: planInfo.partnerId,
          planId,
        });

        if (data.initiativeDetails) {
          //create a initiative
          const initiativeObj = data.initiativeDetails;
          initiativeObj.planId = planInfo.id;
          initiativeObj.createdBy = userId;

          if (initiativeObj.status === ProgressStatus.COMPLETED) {
            initiativeObj.progress = 100;
          }

          const initiativeInfo = await this.initiativeService.create(
            initiativeObj,
            tx,
          );

          if (!initiativeInfo) {
            throw new HttpException(
              { message: ERROR_MESSAGES.INTERNAL_ERR_MSG, err: initiativeInfo },
              HttpStatus.BAD_REQUEST,
            );
          }
          planInfo.initiativeId = initiativeInfo.id;

          assetArr.push({
            resourceId: initiativeInfo.id,
            type: AssetFolderType.INITIATIVE,
            assetName: initiativeInfo.name,
            createdBy: userId,
            partnerId: planInfo.partnerId,
            planId,
            initiativeId: initiativeInfo.id,
          });

          if (data.goalDetails) {
            let goalScoreCardCategoryObj;

            if (data.goalDetails.scoreCardCategoryId) {
              goalScoreCardCategoryObj = {
                planId,
                scoreCardCategoryId: data.goalDetails.scoreCardCategoryId,
              };

              delete data.goalDetails.scoreCardCategoryId;
            }

            const goalObj = data.goalDetails;
            goalObj.planId = planInfo.id;
            goalObj.initiativeId = initiativeInfo.id;
            goalObj.createdBy = userId;

            //create a goal
            const goalInfo: any = await this.goalService.create(goalObj, tx);
            planInfo.goalId = goalInfo.id;

            assetArr.push({
              resourceId: goalInfo.id,
              type: AssetFolderType.GOAL,
              assetName: goalInfo.name,
              createdBy: userId,
              partnerId: planInfo.partnerId,
              planId,
              initiativeId: initiativeInfo.id,
            });

            if (goalScoreCardCategoryObj) {
              goalScoreCardCategoryObj.goalId = goalInfo.id;
              const planGoalScoreCardCategory =
                await this.scorecardService.createReportCard(
                  goalScoreCardCategoryObj,
                  tx,
                );

              await this.goalService.updateGoal(
                goalInfo.id,
                {
                  scoreCardCategoryId: planGoalScoreCardCategory.id,
                  updatedBy: userId,
                },
                tx,
              );
            }

            await this.notificationService.create(
              {
                resourceId: planInfo.id,
                message: CREATE_PLAN_NOTIFICATION,
                type: NotificationType.PLAN,
                userId: planInfo.partnerManagerId,
              },
              tx,
            );
          }
        }

        await this.assetService.createFolder(assetArr, tx);

        if (
          data.initiativeDetails?.status === ProgressStatus.IN_PROGRESS ||
          data.goalDetails?.status === ProgressStatus.IN_PROGRESS
        ) {
          await tx.plan.update({
            data: {
              status: ProgressStatus.IN_PROGRESS,
            },
            where: { id: planInfo.id },
          });
        } else if (
          data.initiativeDetails?.status === ProgressStatus.COMPLETED
        ) {
          await tx.plan.update({
            data: {
              status: ProgressStatus.COMPLETED,
            },
            where: { id: planInfo.id },
          });
        }

        return planInfo;
      });
    } catch (error) {
      this.logger.error('Error create partner plan:', error);
      throw error;
    }
  }

  findAll(
    params: {
      skip?: number;
      take?: number;
      cursor?: Prisma.PlanWhereUniqueInput;
      where?: Prisma.PlanWhereInput;
      orderBy?: Prisma.PlanOrderByWithRelationInput;
    },
    organizationId?: number,
  ): Promise<Plan[]> {
    const { skip, take, cursor, where, orderBy } = params;

    return this.prisma.plan.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: {
        partnerPlanManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            organization: {
              select: {
                companyName: true,
              },
            },
          },
        },
        planCreatedByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            Goal: true,
            Initiative: true,
          },
        },
      },
    });
  }

  findPlanForExport(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.PlanWhereUniqueInput;
    where?: Prisma.PlanWhereInput;
    orderBy?: Prisma.PlanOrderByWithRelationInput;
  }): Promise<Plan[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.plan.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: {
        planCreatedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        partnerPlanManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        partner: {
          select: {
            partnerOrganization: {
              select: {
                companyName: true,
              },
            },
          },
        },
        Initiative: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            category: true,
            industry: true,
            completionDate: true,
            progress: true,
            geo: true,
            tags: true,
            initiativeOwner: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        Goal: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            targetValue: true,
            startValue: true,
            industry: true,
            geo: true,
            completionDate: true,
            goalOwner: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: { Goal: true, Initiative: true },
        },
      },
    });
  }

  async count(params: { where?: Prisma.PlanWhereInput }): Promise<number> {
    const { where } = params;
    return this.prisma.plan.count({
      where,
    });
  }

  findOne(id: number): Promise<Plan | null> {
    return this.prisma.plan.findFirst({
      where: { id: id },
      include: {
        partnerPlanManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            organization: {
              select: {
                companyName: true,
              },
            },
          },
        },
      },
    });
  }

  async update(
    id: number,
    userId: number,
    updatePartnerPlanDto: UpdatePartnerPlanDto,
  ) {
    const planInfo = await this.findOne(id);

    if (!planInfo) {
      throw new HttpException(
        { message: ERROR_MESSAGES.INVALID_DATA + 'plan' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (planInfo.createdBy !== userId && planInfo.partnerManagerId !== userId) {
      throw new HttpException(
        { message: ERROR_MESSAGES.UPDATE_DENIED + 'plan' },
        HttpStatus.FORBIDDEN,
      );
    }

    const updateData: UpdatePartnerPlanDto = updatePartnerPlanDto;
    updateData.updatedBy = userId;

    const updatedPlan = await this.prisma.plan.update({
      data: updateData,
      where: { id: id },
    });

    return updatedPlan;
  }

  async remove(id: number, userId: number) {
    try {
      const planInfo = await this.findOne(Number(id));

      if (!planInfo) {
        throw new HttpException(
          { message: ERROR_MESSAGES.INVALID_PLAN },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (
        planInfo.createdBy !== userId &&
        planInfo.partnerManagerId !== userId
      ) {
        throw new HttpException(
          { message: ERROR_MESSAGES.ALLOW_DELETE_PLAN },
          HttpStatus.FORBIDDEN,
        );
      }

      if (planInfo.status !== ProgressStatus.NOT_STARTED) {
        throw new HttpException(
          { message: ERROR_MESSAGES.PLAN_INPROGRESS_ERR },
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.prisma.$transaction(async (tx) => {
        //remove all connected entity
        await this.initiativeService.bulkRemove({ planId: id }, tx);

        await this.goalService.bulkRemove({ planId: id }, tx);

        await tx.scoreCardCategory.deleteMany({
          where: { goalId: id },
        });

        await tx.project.deleteMany({
          where: { planId: id },
        });
        await this.assetService.deleteAssetFolder(id);
        const deletePlan = await tx.plan.delete({
          where: { id: id },
        });
        return deletePlan;
      });
    } catch (error) {
      this.logger.error('Error deleting partner plan:', error);
      throw error;
    }
  }
}
