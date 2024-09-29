import { Injectable } from '@nestjs/common';
import { PendingApprovalAction, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { actionDto } from './pending_approval_actions.dto';

@Injectable()
export class PendingApprovalService {
  constructor(private prisma: PrismaService) {}

  findOne(
    id: number,
    tx?: Prisma.TransactionClient,
  ): Promise<PendingApprovalAction | null> {
    const prisma = tx || this.prisma;

    return prisma.pendingApprovalAction.findFirst({
      where: { id: id },
    });
  }

  create(
    data: Prisma.PendingApprovalActionUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PendingApprovalAction | null> {
    const prisma = tx || this.prisma;

    return prisma.pendingApprovalAction.create({ data });
  }

  update(
    where: Prisma.PendingApprovalActionWhereUniqueInput,
    data: Prisma.PendingApprovalActionUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PendingApprovalAction | null> {
    const prisma = tx || this.prisma;

    return prisma.pendingApprovalAction.update({
      data,
      where,
    });
  }

  async upsert(
    data: actionDto,
    approvalId?: number,
    tx?: Prisma.TransactionClient,
  ) {
    let approvalInfo;
    if (approvalId) {
      approvalInfo = await this.findOne(approvalId, tx);
    }

    if (!approvalInfo) {
      approvalInfo = await this.create(data, tx);
      return approvalInfo.id;
    }

    const updateData = data;
    approvalInfo = await this.update({ id: approvalId }, updateData, tx);
    return approvalInfo.id;
  }

  async remove(id: number, tx?: Prisma.TransactionClient) {
    try {
      const prisma = tx || this.prisma;
      return await prisma.pendingApprovalAction.delete({
        where: { id },
      });
    } catch (error) {
      console.error('Error deleting actions:', error);
      throw error;
    }
  }

  async bulkRemove(
    where: Prisma.PendingApprovalActionWhereInput,
    tx?: Prisma.TransactionClient,
  ) {
    try {
      const prisma = tx || this.prisma;

      return await prisma.pendingApprovalAction.deleteMany({
        where,
      });
    } catch (error) {
      console.error('Error deleting approval actions:', error);
      throw error;
    }
  }
}
