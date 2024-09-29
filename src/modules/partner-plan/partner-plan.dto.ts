import { ApiProperty } from '@nestjs/swagger';
import { ProgressStatus } from '@prisma/client';
import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { OrderByAndPaginationDTO } from 'src/shared/dto/orderAndPagination.dto';

interface CreatePlan {
  name: string;
  organizationId: number;
  partnerId: number;
  partnerManagerId: number;
  xattrs?: object;
  createdBy: number;
}

interface CreateInitiative {
  name: string;
  planId: number;
  status: ProgressStatus;
  category: string;
  industry?: string;
  completionDate: string;
  tags?: string;
  ownerId: number;
  description: string;
  country?: string;
  region?: string;
  geo?: string;
  projectId?: number;
  createdBy: number;
  progress?: GLfloat;
}

export interface CreateGoal {
  name: string;
  planId: number;
  initiativeId: number;
  ownerId: number;
  createdBy: number;
  status: ProgressStatus;
  industry?: string;
  completionDate: string;
  startValue: number;
  targetValue: number;
  description: string;
  country?: string;
  region?: string;
  geo?: string;
  projectId?: number;
  scoreCardCategoryId?: number;
  category?: string;
}

export class CreatePartnerPlanDto {
  @IsObject()
  @ApiProperty({
    example: {
      name: 'Create Plan',
      partnerId: 1,
      partnerManagerId: 66,
      xattrs: {
        description1: 'Sample 1',
        description2: 'Sample 2',
      },
    },
  })
  planOverview: CreatePlan;

  @IsObject()
  @IsOptional()
  @ApiProperty({
    example: {
      name: 'Take a initiative',
      category: 'Build',
      industry: 'IT',
      completionDate: new Date('2024-07-24'),
      tags: 'Relationship,sales',
      ownerId: 66,
      description: 'Initiative describe here',
      country: 'Argentina',
      region: 'Northern Region',
      geo: 'NAMER',
      status: 'NOT_STARTED',
    },
  })
  initiativeDetails?: CreateInitiative;

  @IsObject()
  @IsOptional()
  @ApiProperty({
    example: {
      name: 'Create a goal',
      industry: 'IT',
      completionDate: new Date('2024-07-24'),
      startValue: 0,
      targetValue: 90,
      ownerId: 66,
      description: 'goal describe here',
      region: 'Northern Region',
      geo: 'NAMER',
      category: 'Build',
    },
  })
  goalDetails?: CreateGoal;
}

export class UpdatePartnerPlanDto {
  updatedBy: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'Plan update' })
  name?: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ example: 'enter partner manager Id' })
  partnerManagerId?: number;

  @IsObject()
  @IsOptional()
  @ApiProperty({
    example: {
      description1: 'Sample 1',
      description2: 'Sample 2',
    },
  })
  xattrs?: object;
}

export class FilterPlanDto extends OrderByAndPaginationDTO {
  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
    description: 'search value (e.g. New Plan)',
  })
  searchString?: string;

  @IsOptional()
  @ApiProperty({
    required: false,
    type: Number,
    description: 'date to filter Opportunity (eg. 30, 60, 90)',
  })
  date?: number;
}
