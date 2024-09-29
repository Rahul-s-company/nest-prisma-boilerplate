import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgressStatus } from '@prisma/client';
import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { OrderByAndPaginationDTO } from 'src/shared/dto/orderAndPagination.dto';

export class CreateGoalDto {
  @ApiProperty({ description: 'The name of the goal' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'The ID of the plan', type: Number })
  @IsNumber()
  planId: number;

  @ApiProperty({ description: 'The ID of the initiative', type: Number })
  @IsNumber()
  initiativeId: number;

  @ApiProperty({ description: 'The target value of the goal', type: Number })
  @IsNumber()
  @Min(1, { message: 'Target must be a positive number.' })
  @Max(100, { message: 'Target must not be greater than 100.' })
  targetValue: number;

  @ApiProperty({ description: 'The start value of the goal', type: Number })
  @IsNumber()
  startValue: number;

  @ApiProperty({ description: 'The industry related to the goal' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({ description: 'The completion date of the goal' })
  @IsISO8601()
  completionDate: string;

  @ApiProperty({ description: 'Description of the goal' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'The country associated with the goal' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ description: 'The region associated with the goal' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ description: 'Geographical information of the goal' })
  @IsOptional()
  @IsString()
  geo?: string;

  @ApiProperty({ description: 'The category of the goal' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'The ID of the associated project',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  projectId?: number;

  @ApiPropertyOptional({
    description: 'The ID of the scorecard category',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  scoreCardCategoryId?: number;

  @ApiProperty({ description: 'The ID of the owner', type: Number })
  @IsNumber()
  ownerId: number;

  createdBy: number;
  status?: ProgressStatus;
}

export class UpdateGoalDto {
  updatedBy: number;

  @ApiPropertyOptional({
    example: '50',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  startValue?: number;

  @ApiPropertyOptional({
    example: '50',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @ApiProperty({ description: 'The category of the goal' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'Description of the initiative' })
  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  scoreCardCategoryId?: number;

  @IsNumber()
  @IsOptional()
  projectId?: number;

  @ApiProperty({ description: 'The ID of the owner', type: Number })
  @IsNumber()
  @IsOptional()
  ownerId?: number;

  @ApiProperty({ description: 'The completion date of the goal' })
  @IsISO8601()
  @IsOptional()
  completionDate?: string;

  status?: ProgressStatus;
}

export class FilterGoalDto extends OrderByAndPaginationDTO {
  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
    description: 'search value (e.g. New Goal)',
  })
  searchString?: string;

  @IsOptional()
  @ApiProperty({
    required: false,
    enum: ProgressStatus,
    description: 'Status to filter Goal',
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
