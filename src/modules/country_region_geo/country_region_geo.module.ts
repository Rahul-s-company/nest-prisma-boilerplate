import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CountryRegionGeoService } from './country_region_geo.service';
import { CountryRegionGeoController } from './country_region_geo.controller';

@Module({
  imports: [],
  controllers: [CountryRegionGeoController],
  providers: [CountryRegionGeoService, PrismaService],
  exports: [CountryRegionGeoService],
})
export class CountryRegionGeoModule {}
