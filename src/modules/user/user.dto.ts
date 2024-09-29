import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ERROR_MESSAGES } from 'src/shared/constants/strings';
import { StatusType } from '@prisma/client';

export class CreateUserDTO {
  @IsString()
  @ApiProperty()
  @IsEmail({}, { message: ERROR_MESSAGES.INVALID_EMAIL })
  email: string;

  @IsString()
  @ApiProperty()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @ApiProperty()
  @IsNotEmpty()
  lastName: string;

  @IsNumber()
  @ApiProperty()
  roleId: number;

  password: string;

  status: StatusType;

  isInvitedBy: number;

  organizationId: number;

  isInvitationPending?: boolean;
}

export class FilterUsersDto {
  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
    description: 'search value (e.g. John)',
  })
  searchString?: string;

  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
    description: 'Fields to search (e.g., firstName, lastName, email)',
  })
  fields?: string;

  @IsOptional()
  @ApiProperty({
    required: false,
    description: 'Role ID to filter users (e.g., 1 )',
  })
  roleId?: number;

  @IsOptional()
  @ApiProperty({
    required: false,
    enum: StatusType,
    description: 'User status to filter users',
  })
  status?: StatusType;
}
