import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { IndustryService } from './industry.service';
import { IndustryController } from './industry.controller';

@Module({
  controllers: [IndustryController],
  providers: [IndustryService, PrismaService],
  exports: [IndustryService],
})
export class IndustryModule {}
