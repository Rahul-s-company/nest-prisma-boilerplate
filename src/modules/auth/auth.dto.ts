import { User, VerificationType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ERROR_MESSAGES } from 'src/shared/constants/strings';

export class AuthResponseDTO {
  @ApiProperty()
  user: User;

  @IsString()
  @ApiProperty()
  accessToken: string;

  @IsString()
  @ApiProperty()
  refreshToken: string;

  isProfileDone: boolean;

  @ApiProperty()
  @IsOptional()
  organization?: { companyName?: string };

  @ApiProperty()
  @IsArray()
  permissions: any;
}

export class RegisterUserDTO {
  @IsString()
  @ApiProperty()
  @IsEmail({}, { message: ERROR_MESSAGES.INVALID_EMAIL })
  email: string;

  @IsString()
  @ApiProperty()
  @IsNotEmpty()
  password: string;

  @IsNumber()
  @ApiProperty()
  roleId: number;

  organizationId: number;
  firstName: string;
}

export class LoginUserDTO {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  @IsEmail({}, { message: ERROR_MESSAGES.INVALID_EMAIL })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  password: string;
}

export class RefreshTokenDTO {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  refreshToken: string;
}

export class RefreshResponseDTO {
  accessToken: string;
  refreshToken: string;
}

export class TokenPayloadDTO {
  @ApiProperty({ description: 'User ID' })
  @IsNumber()
  id: number;

  @ApiProperty({ description: 'User email' })
  @IsOptional()
  @IsString()
  email?: string;
}

export class ChangePasswordDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  newPassword: string;

  email?: string;
}

export class ForgotPasswordDTO {
  @ApiProperty({ description: 'User email' })
  @IsOptional()
  @IsString()
  email?: string;
}

export class VerifyAccountDTO {
  @ApiProperty({ description: 'User email' })
  @IsString()
  email: string;

  @ApiProperty()
  @IsString()
  otp: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  type?: VerificationType;
}

export class VerifyTokenDTO {
  @ApiProperty()
  @IsString()
  token: string;

  @IsEnum(VerificationType)
  @IsOptional()
  type?: VerificationType;
}

export class ResetPasswordDTO {
  @ApiProperty({ description: 'User email' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'Set new password' })
  @IsString()
  password: string;

  @ApiProperty()
  @IsString()
  token: string;

  type: VerificationType;
}

export class ResponseDTO {
  @IsBoolean()
  @ApiProperty()
  success: boolean;

  @IsString()
  @ApiProperty()
  message?: string;

  @IsArray()
  @IsOptional()
  @ApiProperty()
  data?: any[] | { [key: string]: any };
}

export class ProfileDTO {
  @IsString()
  @ApiProperty()
  firstName: string;

  @IsString()
  @ApiProperty()
  lastName: string;

  @IsString()
  @ApiProperty()
  jobTitle: string;

  @IsString()
  @ApiProperty()
  companyName: string;

  @IsString()
  @ApiProperty()
  companyWebsite: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  linkedInUrl?: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  address?: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  industry?: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  country?: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  region?: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  geo?: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty()
  roleId?: number;

  @IsOptional()
  organizationId?: number;
}

interface Organization {
  id: number;
  salesforceOrgId: string | null;
  companyName: string;
  companyWebsite: string;
  linkedInUrl: string;
  industry: string | null;
  country: string | null;
  address: string | null;
  region: string | null;
  geo: string | null;
  socialMediaUrls: any | null;
  subscriptionId: string | null;
  subscribedAt: string | null;
  createdAt: string;
  updatedAt: string;
  status: string;
  whatCrmPlatformUsed: string | null;
}

export interface GetProfileResponseDto {
  message: string;
  data: {
    id: number;
    salesforceUserId: string | null;
    jobTitle: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string | null;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
    status: string;
    isVerified: boolean;
    roleId: number;
    organizationId: number;
    whatCrmPlatformUsed: string | null;
    industry: string | null;
    country: string | null;
    address: string | null;
    region: string | null;
    geo: string | null;
    organization: Organization;
    permissions: any;
  };
}

export interface authPayload {
  id: number;
  roleId: number;
  firstName: string;
  lastName: string;
  email: string;
  password: string | null;
  jobTitle: string | null;
  organizationId: number | null;
  isVerified: boolean;
  status: string;
}
