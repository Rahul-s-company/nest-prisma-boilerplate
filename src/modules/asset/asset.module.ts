import { Module } from '@nestjs/common';
import { S3Service } from 'src/shared/services';

import { PrismaService } from '../prisma/prisma.service';

import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';

@Module({
  controllers: [AssetController],
  providers: [PrismaService, AssetService, S3Service],
})
export class AssetModule {}
