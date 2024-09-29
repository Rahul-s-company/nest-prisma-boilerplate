import { ApiProperty } from '@nestjs/swagger';
import { RoomType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class SendMessageDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  senderId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsArray()
  userIds: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(RoomType)
  roomType: RoomType;

  @ApiProperty()
  @IsString()
  @IsOptional()
  channelArn: string;
}

export class ListMessage {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  channelArn: string;
}

export class AddMemberInChannelDto {
  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  userId: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  channelArn: string;
}

export class RemoveMemberInChannelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  channelArn: string;
}

export class SearchDto {
  @ApiProperty()
  @IsString()
  search: string;
}

export class ChannelDto {
  @ApiProperty()
  @IsString()
  token: string;
}

export enum MessageType {
  NORMAL = '1',
  ADD = '2',
  REMOVE = '3',
}
