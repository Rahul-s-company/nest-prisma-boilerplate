import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { OrderByAndPaginationDTO } from 'src/shared/dto/orderAndPagination.dto';

export interface ScoreCardCategory {
  category: string;
  requirement: string;
  target: number;
  scoreCardId: number;
}

export interface UpdateScoreCardCategory extends ScoreCardCategory {
  id?: number;
  attainment?: number;
}

export class CreateScorecardDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  partnerId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  partnerManagerId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  partnerCompanyId: number;

  @ApiProperty({
    example: [
      {
        category: 'Build',
        requirement: 'Required Example',
        target: 10,
      },
    ],
  })
  @IsArray()
  scoreCardCategory: ScoreCardCategory[];

  createdBy?: number;
}

export class UpdateScorecardDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  partnerManagerId?: number;

  @IsNumber()
  @IsOptional()
  updatedBy?: number;

  @ApiProperty({
    example: [
      {
        category: 'Build',
        requirement: 'Required Example',
        target: 10,
      },
    ],
  })
  @IsArray()
  scoreCardCategory?: UpdateScoreCardCategory[];
}

export class ScoreCardFilterDto extends OrderByAndPaginationDTO {
  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
    description: 'search value (e.g. New Scorecard)',
  })
  searchString?: string;

  @ApiProperty({
    required: true,
    description: 'partner Id',
  })
  @IsString()
  partnerId: string;

  @IsOptional()
  @ApiProperty({
    required: false,
    type: Number,
    description: 'date to filter Scorecard (eg. 30, 60, 90)',
  })
  date?: number;
}

export class ScoreCardCategoryFilterDto extends OrderByAndPaginationDTO {
  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
    description: 'search value (e.g. category 1)',
  })
  searchString?: string;

  @IsOptional()
  @ApiProperty({
    required: false,
    type: Number,
    description: 'date to filter Scorecard (eg. 30, 60, 90)',
  })
  date?: number;

  @IsOptional()
  @ApiProperty({
    type: Number,
    required: false,
    description: 'enter partner id',
  })
  partnerId?: number;

  @IsOptional()
  @ApiProperty({
    type: Number,
    required: false,
    description: 'enter score card id',
  })
  scoreCardId?: number;
}

export interface ScoreCardPlanDTO {
  scoreCardCategoryId: number;
  planId: number;
  initiativeId?: number;
  goalId?: number;
  attainment?: number;
}

export class UpdateScoreCardPlanDTO {
  id: number;

  @IsOptional()
  @ApiProperty({
    type: Number,
    required: false,
    description: 'attainment of score card',
  })
  attainment?: number;

  score?: GLfloat;
  updatedBy: number;
}
