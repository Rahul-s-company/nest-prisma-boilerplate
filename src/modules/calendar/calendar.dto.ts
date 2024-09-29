import { ApiProperty } from '@nestjs/swagger';
import { Frequency, StatusType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCalendarInviteDto {
  @ApiProperty({ description: 'The name of the calendar invite' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'The email of the calendar invite Attendees' })
  @IsArray()
  @IsString({ each: true })
  requiredCandidates: string[];

  @ApiProperty({ description: 'The start time of the calendar invite' })
  @IsDateString()
  startDateTime: Date;

  @ApiProperty({ description: 'The end time of the calendar invite' })
  @IsDateString()
  endDateTime: Date;

  @ApiProperty({ description: 'The occurance of the calendar invite' })
  @IsEnum(Frequency)
  frequency: Frequency;

  @ApiProperty({ description: 'The description of the calendar invite' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'The url of the calendar invite' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({ description: 'The ID of partner', type: Number })
  @IsNumber()
  partnerId: number;

  @ApiProperty({
    description:
      'Add custom start date , end date , count and frequency based on recurrance',
    default: {
      frequency: 'WEEKLY',
      interval: 10,
      startDate: '2024-08-10T12:00:00.000Z',
      endDate: '2024-08-11T12:05:00.000Z',
    },
  })
  @IsOptional()
  customRecurrenceRule?: any;

  createdBy: number;

  updatedBy: number;

  status: StatusType;
}

export class DateRangeDto {
  @ApiProperty({
    description: 'Start date of calendar range',
    default: '2024-08-01T00:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({
    description: 'End date of calendar range',
    default: '2024-10-01T23:59:59.000Z',
  })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @ApiProperty({ description: 'The ID of partner', type: String })
  @IsString()
  partnerId: string;
}
