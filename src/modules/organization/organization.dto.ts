import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrganizationDTO {
  @IsString()
  @ApiProperty()
  @IsOptional()
  companyName?: string;

  @IsString()
  @ApiProperty()
  @IsOptional()
  companyWebsite?: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  linkedInUrl?: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  address?: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  industry?: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  country?: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  region?: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  geo?: string;

  @IsOptional()
  salesForceOrgId?: string;

  @IsString()
  @ApiProperty()
  @IsOptional()
  whatCrmPlatformUsed?: string;
}
