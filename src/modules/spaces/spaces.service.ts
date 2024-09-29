import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SpacesService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.SpaceUncheckedCreateInput) {
    return this.prisma.space.create({ data });
  }

  findAll() {
    return this.prisma.space.findMany({
      select: {
        id: true,
        spaceParentId: true,
        name: true,
      },
    });
  }

  findOne(spaceWhereUniqueInput: Prisma.SpaceWhereUniqueInput) {
    return this.prisma.space.findUnique({
      where: spaceWhereUniqueInput,
    });
  }
}
