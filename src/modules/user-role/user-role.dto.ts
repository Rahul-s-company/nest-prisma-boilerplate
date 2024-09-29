import { UserRole } from '@prisma/client';
import { IsArray, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDTO {
  user: UserRole;

  @IsString()
  @ApiProperty()
  name: string;
}

export interface RolePermission {
  spaceId: number;
  spaceParentId?: number;
  roleId?: number;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export class RolePermissionDto {
  @IsString()
  @ApiProperty()
  name: string;

  @IsArray()
  @ApiProperty()
  permissions: RolePermission[];
}

export class GetPermissionDto {
  @IsString()
  @ApiProperty()
  name: string;

  @IsNumber()
  @ApiProperty()
  id: number;

  @IsArray()
  @ApiProperty()
  permissions: any;
}

export class UpdatePermissionDto {
  @IsArray()
  @ApiProperty({
    example: [
      {
        spaceId: 1,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: false,
      },
    ],
  })
  permissions: RolePermission[];
}
