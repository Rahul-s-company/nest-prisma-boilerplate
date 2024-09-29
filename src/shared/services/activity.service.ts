import { Injectable } from '@nestjs/common';
import { ModuleType, Prisma, ProgressStatus } from '@prisma/client';
import { PendingApprovalService } from 'src/modules/pending_approval_actions/pending_approval_actions.service';
import { PrismaService } from 'src/modules/prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(
    private prisma: PrismaService,
    private pendingApprovalService: PendingApprovalService,
  ) {}
  getProjectActivity(where: Prisma.ProjectActivityWhereInput) {
    return this.prisma.projectActivity.findMany({
      where,
    });
  }

  //calculate initiative progress
  async updateInitiativeProgress(id: number, tx?: Prisma.TransactionClient) {
    const prisma = tx || this.prisma;
    let initiativeProgress: any = 0;

    const initiativeInfo = await prisma.initiative.findFirst({
      where: { id: id },
    });

    const goalList = await prisma.goal.findMany({
      where: { initiativeId: id },
      select: {
        id: true,
        status: true,
        targetValue: true,
        startValue: true,
      },
    });

    if (goalList.length > 0) {
      const { totalTarget, totalAttainment } = goalList.reduce(
        (acc, goal) => {
          acc.totalTarget += goal.targetValue;
          acc.totalAttainment += goal.startValue;
          return acc;
        },
        { totalTarget: 0, totalAttainment: 0 },
      );

      initiativeProgress = (totalAttainment / totalTarget) * 100;
    } else if (initiativeInfo.projectId) {
      const activityInfo = await this.getProjectActivity({
        projectId: initiativeInfo.projectId,
      });
      const totalTarget = activityInfo.length;
      let totalAttainment = 0;

      activityInfo.map((activity) => {
        if (activity.status === ProgressStatus.COMPLETED) {
          totalAttainment += 1;
        }
      });

      initiativeProgress = (totalAttainment / totalTarget) * 100;
    }

    const status: ProgressStatus =
      initiativeProgress === 100
        ? ProgressStatus.COMPLETED
        : ProgressStatus.IN_PROGRESS;

    return prisma.initiative.update({
      data: { progress: +parseFloat(initiativeProgress).toFixed(2), status },
      where: { id: id },
    });
  }

  async updateInitiativesProgressByProject(
    projectId: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;
    let initiativeProgress: any = 0;

    const initiativeInfo = await prisma.initiative.findMany({
      where: { projectId: projectId },
      include: {
        Goal: {
          select: {
            id: true,
          },
        },
      },
    });

    // Filter initiatives where the Goal array is empty
    const initiativeIds = initiativeInfo
      .filter((data) => data.Goal.length === 0) // Check if Goal array is empty
      .map((data) => +data.id);

    const activityInfo = await this.getProjectActivity({
      projectId: projectId,
    });
    const totalTarget = activityInfo.length;
    let totalAttainment = 0;

    activityInfo.map((activity) => {
      if (activity.status === ProgressStatus.COMPLETED) {
        totalAttainment += 1;
      }
    });

    initiativeProgress = (totalAttainment / totalTarget) * 100;

    const status: ProgressStatus =
      initiativeProgress === 100
        ? ProgressStatus.COMPLETED
        : totalAttainment === 0
        ? ProgressStatus.NOT_STARTED
        : ProgressStatus.IN_PROGRESS;

    if (initiativeIds) {
      await this.pendingApprovalService.bulkRemove(
        {
          updateId: {
            in: initiativeIds,
          },
          moduleType: ModuleType.INITIATIVES,
        },
        tx,
      );
    }
    initiativeProgress =
      totalAttainment > 0 ? +parseFloat(initiativeProgress).toFixed(2) : 0;

    return prisma.initiative.updateMany({
      data: { progress: initiativeProgress, status },
      where: { id: { in: initiativeIds } },
    });
  }
}
