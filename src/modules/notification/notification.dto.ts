import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  resourceId: number;
}

export class UpdateNotificationDto {
  @IsOptional()
  @IsNumber()
  isRead?: boolean;

  @IsOptional()
  @IsNumber()
  isReadBy?: number;

  @ApiProperty({
    example: '1,2,21',
  })
  @IsNotEmpty()
  @IsString()
  notificationIds: string;
}

export class DeleteNotificationDto {
  userId: number;

  @ApiProperty({
    example: '1,2,21',
  })
  @IsNotEmpty()
  @IsString()
  notificationIds: string;
}
