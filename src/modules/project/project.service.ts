import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  AssetFolderType,
  NotificationType,
  Prisma,
  Project,
} from '@prisma/client';
import { ERROR_MESSAGES } from 'src/shared/constants/strings';
import { ADD_AS_PROJECT_MANAGER } from 'src/shared/constants/notification.constants';
import { ActivityService } from 'src/shared/services/activity.service';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateNotificationDto } from '../notification/notification.dto';
import { InitiativeService } from '../initiative/initiative.service';
import { GoalService } from '../goal/goal.service';
import { AssetService } from '../asset/asset.service';
import { PartnerPlanService } from '../partner-plan/partner-plan.service';

import { CreateProjectDto, UpdateProjectDto } from './project.dto';

@Injectable()
export class ProjectService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private goalService: GoalService,
    private assetService: AssetService,
    private initiativeService: InitiativeService,
    private partnerPlanService: PartnerPlanService,
    private activityService: ActivityService,
  ) {}
  logger = new Logger(ProjectService.name);

  async createProject(data: CreateProjectDto): Promise<Project> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        let ownerId: number;

        if (data.ownerId) {
          ownerId = data.ownerId;
        } else {
          const partnerPlanInfo = await this.partnerPlanService.findOne(
            data.planId,
          );
          ownerId = partnerPlanInfo.createdBy;
        }

        const projectData: any = {
          planId: data.planId,
          partnerId: data.partnerId,
          name: data.name,
          description: data.description,
          createdBy: data.createdBy,
          ownerId,
        };

        const projectInfo = await this.create(projectData, tx);

        if (data.initiativeId || data.goalId) {
          const updatePromises = [];

          if (data.initiativeId) {
            const initiativeIds = data.initiativeId.split(',');
            updatePromises.push(
              ...initiativeIds.map((id) =>
                this.initiativeService.updateInitiative(
                  +id,
                  {
                    projectId: projectInfo.id,
                    updatedBy: data.createdBy,
                  },
                  tx,
                ),
              ),
            );
          }

          if (data.goalId) {
            const goalIds = data.goalId.split(',');
            updatePromises.push(
              ...goalIds.map((id) =>
                this.goalService.updateGoal(
                  +id,
                  {
                    projectId: projectInfo.id,
                    updatedBy: data.createdBy,
                  },
                  tx,
                ),
              ),
            );
          }

          await Promise.all(updatePromises);
        }

        if (data.projectActivity) {
          const projectActivityArr = [];

          for (const activity of data.projectActivity) {
            projectActivityArr.push({
              projectId: projectInfo.id,
              name: activity.name,
              tag: activity.tag,
              description: activity.description,
              status: activity.status,
              estimatedCompletionDate: activity.estimatedCompletionDate,
              ownerId: activity.ownerId,
            });
          }

          await this.createProjectActivities(projectActivityArr, tx);

          if (data.initiativeId) {
            await this.activityService.updateInitiativesProgressByProject(
              projectInfo.id,
              tx,
            );
            return;
          }
        }

        await this.assetService.createFolder(
          [
            {
              resourceId: projectInfo.id,
              type: AssetFolderType.PROJECT,
              assetName: projectInfo.name,
              createdBy: data.createdBy,
              partnerId: projectInfo.partnerId,
              planId: projectInfo.planId,
            },
          ],
          tx,
        );

        return projectInfo;
      });
    } catch (error) {
      this.logger.error('create project Error:', error);

      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          { message: ERROR_MESSAGES.INTERNAL_ERR_MSG, error: error },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  async create(
    data: Prisma.ProjectUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Project> {
    const prisma = tx || this.prisma;

    const project = await prisma.project.create({
      data,
    });

    return project;
  }

  async createProjectActivities(
    data: Prisma.ProjectActivityUncheckedCreateInput[],
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;

    const projectActivity = await prisma.projectActivity.createMany({
      data,
    });

    const message = ADD_AS_PROJECT_MANAGER;

    const bulkNotificationArr = [];
    for (const activity of data) {
      bulkNotificationArr.push({
        resourceId: activity.projectId,
        userId: activity.ownerId,
        type: NotificationType.PROJECT,
        message,
      });
    }

    await this.sentActivityNotification(bulkNotificationArr, tx);

    return projectActivity;
  }

  async sentActivityNotification(
    data: CreateNotificationDto[],
    tx: Prisma.TransactionClient,
  ) {
    const notificationSent = await this.notificationService.bulkCreate(
      data,
      tx,
    );
    return notificationSent;
  }

  async findAll(
    params: {
      skip?: number;
      take?: number;
      cursor?: Prisma.ProjectWhereUniqueInput;
      where?: Prisma.ProjectWhereInput;
      orderBy?: Prisma.ProjectOrderByWithRelationInput;
    },
    userId: number,
  ): Promise<Project[]> {
    const { skip, take, cursor, where, orderBy } = params;
    const projectList = await this.prisma.project.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: {
        Initiative: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        Goal: {
          select: {
            id: true,
            name: true,
          },
        },
        plan: {
          select: {
            name: true,
            createdBy: true,
          },
        },
        ProjectActivity: {
          select: {
            id: true,
            ownerId: true,
          },
        },
        projectOwner: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        projectCreatedByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const projectArr: any[] = [];

    projectList.forEach((data) => {
      let initiative = '';
      const initiativeOwners: any[] = [];
      const activityOwners: any[] = [];

      for (const initiativeData of data.Initiative) {
        initiative += `${initiativeData.name},`;

        initiativeOwners.push(initiativeData.ownerId);
      }

      for (const activityData of data.ProjectActivity) {
        activityOwners.push(activityData.ownerId);
      }

      const goal = data.Goal.map((data) => data.name).join(',');
      const owner = `${data.projectOwner?.firstName} ${data.projectOwner?.lastName}`;

      let isEdit = false;

      const editAccess = [
        data.plan.createdBy,
        data.createdBy,
        ...initiativeOwners,
        ...activityOwners,
      ];

      if (editAccess.includes(userId)) {
        isEdit = true;
      }

      projectArr.push({
        id: data.id,
        name: data.name,
        partnerId: data.partnerId,
        planId: data.planId,
        description: data.description,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
        initiative,
        goal,
        projectActivity: data.ProjectActivity.length,
        owner,
        projectCreatedByUser: data.projectCreatedByUser,
        isEdit,
      });
    });

    return projectArr;
  }

  findOne(id: number): Promise<Project | null> {
    return this.prisma.project.findFirst({
      where: { id: id },
      include: {
        Initiative: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        plan: {
          select: {
            name: true,
            planCreatedByUser: {
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
          },
        },
        ProjectActivity: {
          select: {
            id: true,
            name: true,
            description: true,
            tag: true,
            estimatedCompletionDate: true,
            ownerId: true,
            status: true,
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  async count(params: { where?: Prisma.ProjectWhereInput }): Promise<number> {
    const { where } = params;
    return this.prisma.project.count({
      where,
    });
  }

  async update(id: number, data: UpdateProjectDto) {
    const projectInfo: any = await this.findOne(id);
    const initiativeOwners: any[] = [];
    const activityOwners: any[] = [];

    if (!projectInfo) {
      throw new HttpException(
        { message: ERROR_MESSAGES.INVALID_DATA + ' project' },
        HttpStatus.BAD_REQUEST,
      );
    }

    for (const activityData of projectInfo.ProjectActivity) {
      activityOwners.push(activityData.ownerId);
    }

    for (const initiativeData of projectInfo.Initiative) {
      initiativeOwners.push(initiativeData.ownerId);
    }

    const editAccess = [
      projectInfo.plan.createdBy,
      projectInfo.createdBy,
      ...initiativeOwners,
      ...activityOwners,
    ];

    if (!editAccess.includes(data.updatedBy)) {
      throw new HttpException(
        { message: ERROR_MESSAGES.UPDATE_DENIED + ' project' },
        HttpStatus.FORBIDDEN,
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      const updateData = {
        name: data.name,
        description: data.description,
        updatedBy: data.updatedBy,
      };

      const updatedProject = await tx.project.update({
        data: updateData,
        where: { id: id },
      });

      const projectActivityIds = data.projectActivity
        .map((data) => data.id)
        .join(',');

      const excludeActivityIds = projectInfo.ProjectActivity.filter(
        (data) => !projectActivityIds.includes(data.id.toString()),
      ).map((data) => data.id);

      if (excludeActivityIds.length > 0) {
        await tx.projectActivity.deleteMany({
          where: { id: { in: excludeActivityIds } },
        });
      }

      if (data.projectActivity.length > 0) {
        const createActivityArr = [];
        for (const activity of data.projectActivity) {
          if (activity.id) {
            await this.updateProjectActivities(
              +activity.id,
              {
                name: activity.name,
                tag: activity.tag,
                description: activity.description,
                status: activity.status,
                estimatedCompletionDate: activity.estimatedCompletionDate,
                ownerId: activity.ownerId,
              },
              tx,
            );
          } else {
            createActivityArr.push({
              projectId: projectInfo.id,
              name: activity.name,
              tag: activity.tag,
              description: activity.description,
              status: activity.status,
              estimatedCompletionDate: activity.estimatedCompletionDate,
              ownerId: activity.ownerId,
            });
          }
        }

        if (createActivityArr.length > 0) {
          await this.createProjectActivities(createActivityArr, tx);
        }
      }

      if (data.initiativeId || data.goalId) {
        const updatePromises = [];

        if (data?.initiativeId) {
          const initiativeIds = data?.initiativeId.split(',');
          const excludeInitiativeIds = projectInfo.Initiative.filter(
            (data) => !initiativeIds.includes(data.id.toString()),
          );

          updatePromises.push(
            ...initiativeIds.map((id) =>
              this.initiativeService.updateInitiative(
                +id,
                {
                  projectId: projectInfo.id,
                  updatedBy: data.updatedBy,
                },
                tx,
              ),
            ),
            ...excludeInitiativeIds.map((data) =>
              this.initiativeService.updateInitiative(
                +data.id,
                {
                  projectId: null,
                  updatedBy: data.updatedBy,
                },
                tx,
              ),
            ),
          );
        }

        if (data?.goalId) {
          const goalIds = data.goalId.split(',');
          const excludeGoalIds = projectInfo.Goal.filter(
            (data) => !goalIds.includes(data.id.toString()),
          );

          updatePromises.push(
            ...goalIds.map((id) =>
              this.goalService.updateGoal(
                +id,
                {
                  projectId: projectInfo.id,
                  updatedBy: data.updatedBy,
                },
                tx,
              ),
            ),
            ...excludeGoalIds.map((data) =>
              this.goalService.updateGoal(
                +data.id,
                {
                  projectId: null,
                  updatedBy: data.updatedBy,
                },
                tx,
              ),
            ),
          );
        }

        await Promise.all(updatePromises);

        await this.activityService.updateInitiativesProgressByProject(id, tx);
      }
      return updatedProject;
    });
  }

  async updateProjectActivities(
    id: number,
    data: Prisma.ProjectActivityUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;

    const projectActivity = await prisma.projectActivity.update({
      data,
      where: { id: id },
    });

    //TODO: add notification if any new owner assigned

    return projectActivity;
  }

  async remove(id: number, userId: number) {
    try {
      const projectInfo = await this.findOne(Number(id));

      if (!projectInfo) {
        throw new HttpException(
          { message: ERROR_MESSAGES.INVALID_RESOURCE },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (projectInfo.createdBy !== userId) {
        throw new HttpException(
          { message: ERROR_MESSAGES.ALLOW_DELETE_PLAN },
          HttpStatus.FORBIDDEN,
        );
      }

      return await this.prisma.$transaction(async (tx) => {
        await tx.projectActivity.deleteMany({
          where: { projectId: id },
        });

        const deleteProject = await tx.project.delete({
          where: { id: id },
        });

        return deleteProject;
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }
}
