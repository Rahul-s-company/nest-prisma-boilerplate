import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { ERROR_MESSAGES } from 'src/shared/constants/strings';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

import { PrismaService } from '../prisma/prisma.service';

import { GetPermissionDto, RolePermission } from './user-role.dto';

@Injectable()
export class UserRoleService {
  private readonly logger = new Logger(UserRoleService.name);

  constructor(
    private prisma: PrismaService,
    @InjectRedis() private readonly redisClient: Redis,
  ) {}

  async findUser(
    userRoleWhereUniqueInput: Prisma.UserRoleWhereUniqueInput,
  ): Promise<UserRole | null> {
    return this.prisma.userRole.findUnique({
      where: userRoleWhereUniqueInput,
    });
  }

  async getRolesWithUserCountsFromOrganization(
    organizationId: number,
  ): Promise<UserRole[]> {
    try {
      // Step 1: Fetch all roles
      const roles = await this.prisma.userRole.findMany({
        orderBy: {
          id: 'asc', // Optional: order by id
        },
      });

      // Step 2: Count users for each role
      const rolesWithUserCounts = await Promise.all(
        roles.map(async (role) => {
          const noOfUsers = await this.prisma.user.count({
            where: {
              role: {
                id: role.id,
              },
              organizationId,
            },
          });

          return {
            ...role,
            noOfUsers,
          };
        }),
      );

      return rolesWithUserCounts;
    } catch (error) {
      console.error('Error fetching roles with user counts:', error);
      throw error;
    }
  }

  async createRole(data: Prisma.UserRoleCreateInput): Promise<UserRole> {
    return await this.prisma.userRole.create({
      data,
    });
  }

  async deleteRole(where: Prisma.UserRoleWhereUniqueInput): Promise<UserRole> {
    const usersWithRole = await this.prisma.user.findMany({
      where: {
        roleId: where.id,
      },
    });

    if (usersWithRole.length > 0) {
      throw new HttpException(
        {
          message:
            'Cannot delete role as it is being used by one or more users',
        },
        HttpStatus.CONFLICT,
      );
    }

    const deleteData = await this.prisma.$transaction([
      this.prisma.permission.deleteMany({ where: { roleId: where.id } }),
      this.prisma.userRole.delete({
        where,
      }),
    ]);

    return deleteData[1];
  }

  async createOrUpdateRolePermission(
    permissionData: RolePermission[],
    roleId: number,
    organizationId: number,
  ) {
    try {
      const permissionCreateInput = permissionData.map((p) => ({
        ...p,
        roleId,
        organizationId,
      }));

      const redisKey = `sy-${process.env.NODE_ENV}-permissions:${roleId}:${organizationId}`;

      await this.redisClient.set(
        redisKey,
        JSON.stringify(permissionCreateInput),
        'EX',
        process.env.REDIS_EXPIRE,
      );

      return await this.prisma.$transaction([
        this.prisma.permission.deleteMany({ where: { roleId } }),
        this.prisma.permission.createMany({ data: permissionCreateInput }),
      ]);
    } catch (error) {
      this.logger.log('error in edit permission', error);

      throw new HttpException(
        { message: ERROR_MESSAGES.INTERNAL_ERR_MSG, error },
        HttpStatus.NON_AUTHORITATIVE_INFORMATION,
      );
    }
  }

  async getRoleAndPermission(
    organizationId: number,
    roleId: number,
  ): Promise<GetPermissionDto> {
    const role = await this.getUserRoleById(roleId);

    if (!role) {
      throw new HttpException(
        { message: 'Role does not exist' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const permissions = await this.getPermissionsForRole(
      roleId,
      organizationId,
    );

    return {
      name: role.name,
      id: role.id,
      permissions,
    };
  }

  async getUserRoleById(roleId: number) {
    return this.prisma.userRole.findUnique({ where: { id: roleId } });
  }

  async getPermissionsForRole(roleId: number, organizationId: number) {
    const permissions = await this.prisma.permission.findMany({
      where: { roleId, organizationId },
      include: {
        space: {
          select: {
            id: true,
            name: true,
            spaceParentId: true,
          },
        },
      },
    });

    if (permissions.length > 0) {
      return permissions.map((permission) => ({
        spaceId: permission.spaceId,
        spaceParentId: permission.space.spaceParentId,
        spaceName: permission.space.name,
        canRead: permission.canRead,
        canCreate: permission.canCreate,
        canUpdate: permission.canUpdate,
        canDelete: permission.canDelete,
      }));
    } else {
      const rolePermission = await this.prisma.userRole.findFirst({
        where: { id: roleId },
      });

      return rolePermission.permissions;
    }
  }
}
