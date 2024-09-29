import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseSuccess } from 'src/utils/response/response';
import { ResponseInterface } from 'src/utils/response/response.interface';

import { JwtAuthGuard } from '../auth/auth.jwt.guard';
import { Permissions } from '../../core/decorators/permission.decorator';

import { UserRoleService } from './user-role.service';
import {
  GetPermissionDto,
  RolePermissionDto,
  UpdatePermissionDto,
} from './user-role.dto';

@ApiTags('userRole')
@Controller('user-role')
export class UserRoleController {
  constructor(private userRoleService: UserRoleService) {}

  @Get()
  @Permissions({ operation: 'read', spaceId: 21 })
  @ApiOperation({ description: 'List of Roles' })
  @UseGuards(JwtAuthGuard)
  async getAll(@Req() req): Promise<UserRole[]> {
    return this.userRoleService.getRolesWithUserCountsFromOrganization(
      req.user.organizationId,
    );
  }

  @Post()
  @Permissions({ operation: 'create', spaceId: 21 })
  @ApiOperation({ description: 'Create a Role' })
  @ApiBody({ type: RolePermissionDto })
  async createRole(
    @Body() data: RolePermissionDto,
    @Req() req,
  ): Promise<ResponseInterface> {
    try {
      const roleInfo = await this.userRoleService.createRole({
        name: data.name,
      });
      await this.userRoleService.createOrUpdateRolePermission(
        data.permissions,
        roleInfo.id,
        req.user.organizationId,
      );

      return new ResponseSuccess('Role created Successfully', roleInfo);
    } catch (error) {
      throw new HttpException(
        { message: 'Role already exist' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('/:id/get-role-permission')
  @Permissions({ operation: 'read', spaceId: 21 })
  @ApiOperation({ description: 'Get role permissions' })
  async getRoleAndPermission(
    @Param('id') id: string,
    @Req() req,
  ): Promise<GetPermissionDto> {
    const rolePermissionInfo = await this.userRoleService.getRoleAndPermission(
      req.user.organizationId,
      Number(id),
    );

    return rolePermissionInfo;
  }

  @Put('/:id/update-permission')
  @Permissions({ operation: 'create', spaceId: 21 })
  @ApiOperation({ description: 'Update role permissions' })
  @ApiBody({ type: UpdatePermissionDto })
  async updatePermission(
    @Param('id') id: string,
    @Body() data: UpdatePermissionDto,
    @Req() req,
  ): Promise<ResponseInterface> {
    await this.userRoleService.createOrUpdateRolePermission(
      data.permissions,
      Number(id),
      Number(req.user.organizationId),
    );

    const rolePermissionInfo = await this.userRoleService.getRoleAndPermission(
      req.user.organizationId,
      Number(id),
    );

    return new ResponseSuccess(
      'Permission Updated Successfully',
      rolePermissionInfo,
    );
  }

  @Delete('/:id')
  @Permissions({ operation: 'delete', spaceId: 21 })
  @ApiOperation({ description: 'Delete Role' })
  @UseGuards(JwtAuthGuard)
  async deleteRole(@Param('id') id: string): Promise<UserRole> {
    return this.userRoleService.deleteRole({ id: Number(id) });
  }
}
