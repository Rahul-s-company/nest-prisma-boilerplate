import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ERROR_MESSAGES } from 'src/shared/constants/strings';

export class ContactUsDTO {
  @IsString()
  @ApiProperty()
  @IsEmail({}, { message: ERROR_MESSAGES.INVALID_EMAIL })
  email: string;

  @IsString()
  @ApiProperty()
  name: string;

  @IsString()
  @ApiProperty()
  @IsOptional()
  message: string;

  @IsString()
  @ApiProperty()
  subject: string;
}
