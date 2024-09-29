import { ApiProperty } from '@nestjs/swagger';
import { ProgressStatus, StatusType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { OrderByAndPaginationDTO } from 'src/shared/dto/orderAndPagination.dto';

export class CreateKpiDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  ownerUserId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Target must be a positive number.' })
  @Max(100, { message: 'Target must not be greater than 100.' })
  target: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  attainment: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNotEmpty()
  status: ProgressStatus;

  @IsOptional()
  progress?: GLfloat;

  createdBy: number;
  organizationId: number;
}

export class UpdateKpiDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  ownerUserId?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Target must be a positive number.' })
  @Max(100, { message: 'Target must not be greater than 100.' })
  target?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Attainment must be a positive number.' })
  attainment?: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsOptional()
  @IsNotEmpty()
  status?: ProgressStatus;

  @IsOptional()
  progress?: GLfloat;

  updatedBy?: number;
  approvalId?: number;
}

export class AcceptRejectDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(StatusType)
  status: StatusType;

  @IsNumber()
  userId: number;

  @IsOptional()
  reason?: string;
}

export class FilterKpiDto extends OrderByAndPaginationDTO {
  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
    description: 'search value (e.g. New Kpi)',
  })
  searchString?: string;

  @IsOptional()
  @ApiProperty({
    required: false,
    description: 'Status to filter Kpi',
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
    required: false,
    type: String,
    description: 'All kpi | My kpi',
  })
  kpiType?: string;
}
