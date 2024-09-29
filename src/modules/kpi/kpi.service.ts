import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  Kpi,
  ModuleType,
  NotificationType,
  Prisma,
  StatusType,
} from '@prisma/client';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/shared/constants/strings';
import {
  KPI_NOTIFICATION,
  UPDATE_ACCEPT_NOTIFICATION,
  UPDATE_REJECT_NOTIFICATION,
  getUpdateContentNotification,
} from 'src/shared/constants/notification.constants';

import { PrismaService } from '../prisma/prisma.service';
import { PendingApprovalService } from '../pending_approval_actions/pending_approval_actions.service';
import { NotificationService } from '../notification/notification.service';

import { AcceptRejectDto, CreateKpiDto, UpdateKpiDto } from './kpi.dto';

@Injectable()
export class KpiService {
  constructor(
    private prisma: PrismaService,
    private pendingApprovalService: PendingApprovalService,
    private notificationService: NotificationService,
  ) {}

  async create(data: CreateKpiDto): Promise<boolean | HttpException> {
    if (data.attainment > data.target) {
      throw new HttpException(
        { message: ERROR_MESSAGES.ATTAINMENT_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      const ownerIds = data.ownerUserId.split(',');

      data.progress = parseFloat(
        ((data.attainment / data.target) * 100).toFixed(2),
      );

      if (ownerIds) {
        for (const userId of ownerIds) {
          // Create the KPI record
          const kpi = await tx.kpi.create({
            data: {
              ownerUserId: +userId,
              name: data.name,
              target: data.target,
              attainment: data.attainment,
              description: data.description,
              status: data.status,
              progress: data.progress,
              createdBy: data.createdBy,
              organizationId: data.organizationId,
            },
          });

          // Send a notification for the newly created KPI
          if (kpi && data.createdBy !== +userId) {
            await this.notificationService.create({
              resourceId: kpi.id,
              message: KPI_NOTIFICATION,
              type: NotificationType.KPI,
              userId: kpi.ownerUserId,
            });
          }
        }
      } else {
        throw new HttpException(
          { message: ERROR_MESSAGES.INTERNAL_ERR_MSG },
          HttpStatus.BAD_REQUEST,
        );
      }

      return true;
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.KpiWhereUniqueInput;
    where?: Prisma.KpiWhereInput;
    orderBy?: Prisma.KpiOrderByWithRelationInput;
  }): Promise<Kpi[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.kpi.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: {
        ownerUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        kpiCreatedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        kpiApprovalActionId: {
          select: {
            status: true,
          },
        },
      },
    });
  }

  async count(params: { where?: Prisma.KpiWhereInput }): Promise<number> {
    const { where } = params;
    return this.prisma.kpi.count({
      where,
    });
  }

  findOne(id: number): Promise<Kpi | null> {
    return this.prisma.kpi.findFirst({
      where: { id: id },
      include: {
        kpiApprovalActionId: {
          select: {
            updatedData: true,
            reason: true,
          },
        },
      },
    });
  }

  async update(id: number, userId: number, updateKpiData: UpdateKpiDto) {
    const kpiInfo = await this.findOne(id);
    let infoMsg: string;

    if (!kpiInfo) {
      throw new HttpException(
        { message: ERROR_MESSAGES.INVALID_KPI },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (userId !== kpiInfo.ownerUserId && userId !== kpiInfo.createdBy) {
      throw new HttpException(
        { message: ERROR_MESSAGES.UPDATE_KPI_DENIED },
        HttpStatus.FORBIDDEN,
      );
    }

    if (updateKpiData.attainment > kpiInfo.target) {
      throw new HttpException(
        { message: ERROR_MESSAGES.ATTAINMENT_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }

    let updateKpi: UpdateKpiDto;

    updateKpiData.updatedBy = userId;
    updateKpiData.progress = parseFloat(
      ((updateKpiData.attainment / kpiInfo.target) * 100).toFixed(2),
    );

    if (kpiInfo.createdBy === userId) {
      if (
        updateKpiData.ownerUserId &&
        kpiInfo.ownerUserId !== updateKpiData.ownerUserId
      ) {
        if (kpiInfo?.approvalId) {
          this.pendingApprovalService.remove(kpiInfo.approvalId);
        }
      }

      updateKpi = await this.prisma.kpi.update({
        data: updateKpiData,
        where: { id: id },
      });

      infoMsg = SUCCESS_MESSAGES.KPI_UPDATED;
    } else {
      const updatedData = {
        attainment: updateKpiData.attainment,
        description: updateKpiData.description,
        status: updateKpiData.status,
        progress: updateKpiData.progress,
      };

      const approvalInfoId = await this.pendingApprovalService.upsert(
        {
          updatedData,
          updateId: kpiInfo.id,
          updatedByUserId: userId,
          moduleType: ModuleType.KPI,
          requiredApprovalBy: kpiInfo.createdBy,
          status: StatusType.PENDING,
        },
        kpiInfo.approvalId,
      );

      if (!approvalInfoId) {
        throw new HttpException(
          { message: ERROR_MESSAGES.INTERNAL_ERR_MSG },
          HttpStatus.BAD_REQUEST,
        );
      }

      const updateContentNotification = getUpdateContentNotification('Kpi');

      await this.notificationService.create({
        resourceId: kpiInfo.id,
        message: updateContentNotification,
        type: NotificationType.INITIATIVE,
        userId: kpiInfo.createdBy,
      });

      updateKpi = await this.prisma.kpi.update({
        data: { approvalId: approvalInfoId, updatedBy: userId },
        where: { id: id },
      });
      infoMsg = SUCCESS_MESSAGES.KPI_UPDATE_REQ;
    }

    return { msg: infoMsg, data: updateKpi };
  }

  async remove(id: number, userId: number) {
    try {
      const kpiInfo = await this.findOne(Number(id));

      if (!kpiInfo) {
        throw new HttpException(
          { message: ERROR_MESSAGES.INVALID_KPI },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (kpiInfo.createdBy !== userId) {
        throw new HttpException(
          { message: ERROR_MESSAGES.ALLOW_DELETE_KPI },
          HttpStatus.FORBIDDEN,
        );
      }

      if (kpiInfo?.approvalId) {
        this.pendingApprovalService.remove(kpiInfo.approvalId);
      }

      const deleteKpi = await this.prisma.kpi.delete({
        where: { id: id },
      });

      return deleteKpi;
    } catch (error) {
      console.error('Error deleting kpi:', error);
      throw error;
    }
  }

  async acceptRejectKpiUpdate(data: AcceptRejectDto) {
    const kpiInfo = await this.findOne(data.id);

    if (!kpiInfo || !kpiInfo.approvalId) {
      throw new HttpException(
        { message: ERROR_MESSAGES.INVALID_KPI },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (data.userId !== kpiInfo.createdBy) {
      throw new HttpException(
        { message: ERROR_MESSAGES.UPDATE_KPI_DENIED },
        HttpStatus.BAD_REQUEST,
      );
    }

    const approvalInfo = await this.pendingApprovalService.findOne(
      kpiInfo.approvalId,
    );
    const updateData: any = approvalInfo.updatedData;

    updateData.approvalId = null;

    if (data.status === StatusType.ACCEPT) {
      await this.prisma.kpi.update({
        data: updateData,
        where: { id: data.id },
      });

      await this.pendingApprovalService.remove(kpiInfo.approvalId);
    } else {
      await this.pendingApprovalService.update(
        { id: kpiInfo.approvalId },
        {
          status: StatusType.REJECT,
          reason: data.reason,
        },
      );
    }

    const kpiUpdateMsg =
      'Kpi ' + (data.status === StatusType.ACCEPT)
        ? UPDATE_ACCEPT_NOTIFICATION
        : UPDATE_REJECT_NOTIFICATION;

    await this.notificationService.create({
      resourceId: kpiInfo.id,
      message: kpiUpdateMsg,
      type: NotificationType.KPI,
      userId: kpiInfo.ownerUserId,
    });

    return approvalInfo;
  }
}
