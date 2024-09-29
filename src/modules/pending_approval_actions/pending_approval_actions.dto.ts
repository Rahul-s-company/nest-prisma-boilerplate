import { ApiProperty } from '@nestjs/swagger';
import { ModuleType, ProgressStatus, StatusType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class actionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  updatedData: object;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  updateId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  updatedByUserId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(ModuleType)
  moduleType: ModuleType;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  approvedBy?: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  requiredApprovalBy: number;

  @ApiProperty()
  @IsNotEmpty()
  status: StatusType;

  @IsOptional()
  approvalId?: number;
}

export class UpdateActionDto {
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
  target?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  attainment?: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsOptional()
  @IsNotEmpty()
  status?: ProgressStatus;
}

export class AcceptRejectRequestDto {
  @ApiProperty({
    required: true,
    enum: ['ACCEPT', 'REJECT'],
    description: 'Accept or reject Update',
  })
  @IsEnum(StatusType)
  status: StatusType;

  @ApiProperty({
    required: false,
    type: String,
    description: 'Enter reason incase of reject',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
