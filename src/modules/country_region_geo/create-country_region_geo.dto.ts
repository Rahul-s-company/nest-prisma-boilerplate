import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateCountryRegionGeoDto {
  @ApiProperty()
  id: number;

  @IsString()
  @ApiProperty()
  name: string;
}
