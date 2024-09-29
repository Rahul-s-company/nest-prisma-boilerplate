import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { SpacesService } from './spaces.service';
import { SpacesController } from './spaces.controller';

@Module({
  controllers: [SpacesController],
  providers: [SpacesService, PrismaService],
})
export class SpacesModule {}
