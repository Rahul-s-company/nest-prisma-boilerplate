import { Module } from '@nestjs/common';
import { ExportService, S3Service } from 'src/shared/services';

import { PrismaService } from '../prisma/prisma.service';

import { ScorecardService } from './scorecard.service';
import { ScorecardController } from './scorecard.controller';

@Module({
  controllers: [ScorecardController],
  providers: [ScorecardService, PrismaService, ExportService, S3Service],
})
export class ScorecardModule {}
