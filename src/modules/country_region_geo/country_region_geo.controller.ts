import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { CountryRegionGeoService } from './country_region_geo.service';
import { CreateCountryRegionGeoDto } from './create-country_region_geo.dto';

@ApiTags('Country Region Geo')
@ApiResponse({ type: CreateCountryRegionGeoDto })
@Controller('country-region-geo')
export class CountryRegionGeoController {
  constructor(
    private readonly countryRegionGeoService: CountryRegionGeoService,
  ) {}

  @Get('country-list')
  findAllCountry() {
    return this.countryRegionGeoService.findAll('country', ['id', 'name']);
  }

  @Get('region-list')
  findAllRegion() {
    return this.countryRegionGeoService.findAll('region', ['id', 'name']);
  }

  @Get('geo-list')
  findAllGeo() {
    return this.countryRegionGeoService.findAll('geo', ['id', 'name']);
  }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.countryRegionGeoService.remove(+id);
  // }
}
