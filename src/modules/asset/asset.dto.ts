import { ApiProperty } from '@nestjs/swagger';
import { AssetFolderType, StatusType } from '@prisma/client';
import { int } from 'aws-sdk/clients/datapipeline';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

export class AssetCreateRepoDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  planId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  ownerUserId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(AssetFolderType)
  assetType: AssetFolderType;

  @ApiProperty()
  @IsInt()
  @IsOptional()
  assetRepoSourceId?: number; // Assuming this might be optional

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  assetUrl: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(StatusType)
  status: StatusType;
}

export class AssetUploadDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(AssetFolderType)
  assetType: AssetFolderType;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  assetRepoSourceId: int;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  ownerUserId: int;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  planId: int;

  @ApiProperty({
    description: 'Pass initiave id while assetType is Initiative or Goal',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  initiativeId: int;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  assetName: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  file: any; // Only for swagger documentation
}

export class FilterAssetDto {
  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
    description: 'search value (e.g. New Asset)',
  })
  searchString?: string;
}

export class GetAllPLanDto extends FilterAssetDto {
  @IsString()
  @ApiProperty({
    type: String,
    required: true,
  })
  partnerId: string;

  @IsSpecificAssetType([AssetFolderType.PLAN], {
    message: 'type must be PLAN',
  })
  @IsString()
  @ApiProperty({
    type: String,
    required: true,
    default: AssetFolderType.PLAN,
  })
  type: AssetFolderType = AssetFolderType.PLAN;
}

export class FilterAssetForPlanAndIntiativeDto extends FilterAssetDto {
  @IsString()
  @ApiProperty({
    type: String,
    required: true,
    description: 'Asset resource id',
  })
  assetResourceId: string;

  @IsSpecificAssetType(
    [AssetFolderType.PLAN, AssetFolderType.INITIATIVE, AssetFolderType.GOAL],
    {
      message: 'type must be PLAN,INITIATIVE,GOAL',
    },
  )
  @IsString()
  @ApiProperty({
    type: String,
    required: true,
    default:
      AssetFolderType.PLAN ||
      AssetFolderType.INITIATIVE ||
      AssetFolderType.GOAL,
  })
  type: AssetFolderType =
    AssetFolderType.PLAN || AssetFolderType.INITIATIVE || AssetFolderType.GOAL;
}

export class RenameFileDto {
  @ApiProperty({
    type: String,
    required: true,
    description: 'File name',
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    type: Number,
    required: true,
    description: 'Plan id',
  })
  @IsInt()
  planId: number;

  @ApiProperty({
    type: String,
    required: true,
    description: 'Type of Asset',
  })
  @IsEnum(AssetFolderType)
  assetType: string;

  @ApiProperty({
    type: String,
    required: true,
    description: 'Asset name',
  })
  @IsString()
  assetName: string;

  updatedBy?: number;
}

export interface AssetDetail {
  id: number;
  planId: number;
  ownerUserId: number;
  assetType: string;
  assetRepoSourceId: number;
  assetUrl: string;
  status: StatusType;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanFolder {
  id: number;
  planId: number;
  resourceId: number;
  assetName: string;
  type: string;
  status: StatusType;
  createdBy: number;
  updatedBy: number;
  createdAt: Date;
  updatedAt: Date;
}
export interface AssetCreateFolderDTO {
  resourceId: number;
  assetName: string;
  type: AssetFolderType;
  createdBy: number;
  partnerId: number;
  planId: number;
}

export function IsSpecificAssetType(
  value: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsSpecificAssetType',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(propertyValue: AssetFolderType) {
          return value.includes(propertyValue);
        },
        defaultMessage() {
          return `${propertyName} must be ${value}`;
        },
      },
    });
  };
}

export class deleteAssetsDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(AssetFolderType)
  assetType: AssetFolderType;

  @ApiProperty()
  @IsInt()
  @IsOptional()
  assetSourceId: number; // Assuming this might be optional

  planId?: number;
}
