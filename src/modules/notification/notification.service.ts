import { Injectable, Logger } from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}
  logger = new Logger(NotificationService.name);

  create(
    data: Prisma.NotificationUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;
    this.logger.log('Notification created', data);

    return prisma.notification.create({
      data,
    });
  }

  bulkCreate(
    data: Prisma.NotificationUncheckedCreateInput[],
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;
    this.logger.log('Notification created', data);

    return prisma.notification.createMany({
      data,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.NotificationWhereUniqueInput;
    where?: Prisma.NotificationWhereInput;
    orderBy?: Prisma.NotificationOrderByWithRelationInput;
  }): Promise<Notification[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.notification.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  findOne(id: number) {
    return this.prisma.notification.findFirst({
      where: { id: id },
    });
  }

  getNotificationCount(where: Prisma.NotificationWhereInput) {
    return this.prisma.notification.count({
      where,
    });
  }

  async updateNotifications(
    where: object,
    data: Prisma.NotificationUncheckedUpdateInput,
  ) {
    const updateNotifications = await this.prisma.notification.updateMany({
      data,
      where,
    });

    return updateNotifications;
  }

  async deleteNotifications(condition: Prisma.NotificationWhereInput) {
    const deleteNotifications = await this.prisma.notification.deleteMany({
      where: condition,
    });

    return deleteNotifications;
  }
}
