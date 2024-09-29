import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgressStatus } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { OrderByAndPaginationDTO } from 'src/shared/dto/orderAndPagination.dto';

import { CreateGoal } from '../partner-plan/partner-plan.dto';

export class CreateInitiativeDto {
  @ApiProperty({ description: 'The name of the initiative' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'The ID of the plan', type: Number })
  @IsNumber()
  planId: number;

  @ApiProperty({
    description: 'The status of the initiative',
    enum: ProgressStatus,
    example: 'IN_PROGRESS',
  })
  @IsEnum(ProgressStatus)
  status: ProgressStatus;

  @ApiProperty({ description: 'The category of the initiative' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'The industry of the initiative' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({ description: 'The completion date of the initiative' })
  @IsISO8601()
  completionDate: string;

  @ApiProperty({ description: 'Tags associated with the initiative' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiProperty({ description: 'The ID of the owner', type: Number })
  @IsNumber()
  ownerId: number;

  @ApiProperty({ description: 'Description of the initiative' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'The country of the initiative' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ description: 'The region of the initiative' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ description: 'Geographical information of the initiative' })
  @IsOptional()
  @IsString()
  geo?: string;

  @ApiPropertyOptional({
    description: 'The ID of the associated project',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  projectId?: number;

  createdBy?: number;

  @IsObject()
  @IsOptional()
  @ApiProperty({
    example: {
      name: 'Create a goal',
      industry: 'IT',
      completionDate: new Date('2024-07-24'),
      startValue: 0,
      targetValue: 90,
      description: 'goal describe here',
      region: 'Northern Region',
      geo: 'NAMER',
    },
  })
  goalDetails?: CreateGoal;
}

export class UpdateInitiativeDto {
  updatedBy: number;

  @ApiPropertyOptional({
    example: '50',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  progress?: GLfloat;

  @ApiProperty({
    description: 'The status of the initiative',
    enum: ProgressStatus,
    example: 'IN_PROGRESS',
  })
  @IsEnum(ProgressStatus)
  @IsOptional()
  status?: ProgressStatus;

  @ApiProperty({ description: 'Tags associated with the initiative' })
  @IsString()
  @IsOptional()
  tags?: string;

  @ApiProperty({ description: 'Description of the initiative' })
  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @IsNumber()
  projectId?: number;

  @ApiProperty({ description: 'The ID of the owner', type: Number })
  @IsNumber()
  @IsOptional()
  ownerId?: number;

  @ApiProperty({ description: 'The industry of the initiative' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({ description: 'The completion date of the initiative' })
  @IsISO8601()
  @IsOptional()
  completionDate?: string;

  @ApiProperty({ description: 'The country of the initiative' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ description: 'The region of the initiative' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ description: 'Geographical information of the initiative' })
  @IsOptional()
  @IsString()
  geo?: string;
}

export class RemoveTagDto {
  updatedBy: number;

  @ApiProperty({ description: 'Tag associated with the initiative' })
  @IsString()
  @IsOptional()
  tags?: string;
}

export class FilterInitiativeDto extends OrderByAndPaginationDTO {
  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
    description: 'search value (e.g. New Initiative)',
  })
  searchString?: string;

  @IsOptional()
  @ApiProperty({
    required: false,
    enum: ProgressStatus,
    description: 'Status to filter Initiative',
  })
  status?: ProgressStatus;

  @IsOptional()
  @ApiProperty({
    required: false,
    type: Number,
    description: 'date to filter Opportunity (eg. 30, 60, 90)',
  })
  date?: number;

  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
  })
  planId?: string;
}

export class FilterExportInitiativeDto {
  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
    description: 'search value (e.g. New Initiative)',
  })
  searchString?: string;

  @IsOptional()
  @ApiProperty({
    required: false,
    enum: ProgressStatus,
    description: 'Status to filter Initiative',
  })
  status?: ProgressStatus;

  @IsOptional()
  @ApiProperty({
    required: false,
    type: Number,
    description: 'date to filter Opportunity (eg. 30, 60, 90)',
  })
  date?: number;
}
