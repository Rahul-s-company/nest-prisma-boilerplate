import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePartnerDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  companyWebsite: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  linkedInUrl?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  socialMediaUrls?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  partnerType: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerFirstName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerLastName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerEmail: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  customerPhoneNo?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  roleId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  jobTitle: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  industry: string;

  partnerUserId: number;
  isInvitedBy: number;
  partnerOrganizationId: number;
  organizationId: number;
}

export class UpdatePartnerDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  companyWebsite?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  linkedInUrl?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  socialMediaUrls?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  partnerType?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerFirstName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerLastName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerEmail: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  customerPhoneNo?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  roleId: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  industry?: string;

  partnerUserId?: number;
  isInvitedBy: number;
}

export enum PartnerModuleType {
  GOALS = 'GOALS',
  INITIATIVES = 'INITIATIVES',
  PLAN = 'PLAN',
  PROJECT_ACTIVITY = 'PROJECT_ACTIVITY',
  OPPORTUNITIES = 'OPPORTUNITIES',
}

export class UserListDto {
  @ApiProperty({
    required: true,
    enum: PartnerModuleType,
    description: 'type of module',
  })
  @IsString()
  type: PartnerModuleType;
}
