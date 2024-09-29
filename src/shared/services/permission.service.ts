// permission.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRedis() private readonly redisClient: Redis,
    private readonly prisma: PrismaService, // Assuming you are using Prisma
  ) {}
  async hasPermission(
    roleId: number,
    organizationId: number,
    spaceId: number,
    operation: string,
  ): Promise<boolean> {
    const redisKey = `sy-${process.env.NODE_ENV}-permissions:${roleId}:${organizationId}`;

    // Check Redis cache first
    const cachedPermissions = await this.redisClient.get(redisKey);
    let permissionsArray;

    if (cachedPermissions) {
      permissionsArray = JSON.parse(cachedPermissions); // Parse cached permissions array
    } else {
      const permission = await this.prisma.permission.findMany({
        where: {
          roleId,
          organizationId,
        },
      });

      if (permission.length === 0) {
        const rolePermission = await this.prisma.userRole.findFirst({
          where: { id: roleId },
        });

        if (rolePermission?.permissions) {
          permissionsArray = rolePermission.permissions;
        }
      } else {
        permissionsArray = permission;
      }
      await this.redisClient.set(
        redisKey,
        JSON.stringify(permissionsArray),
        'EX',
        process.env.REDIS_EXPIRE,
      );
    }

    // Find the specific permission for the given spaceId
    const permission = permissionsArray.find(
      (perm) => perm.spaceId === spaceId,
    );

    if (!permission) {
      return false;
    }

    switch (operation) {
      case 'read':
        return permission.canRead;
      case 'create':
        return permission.canCreate;
      case 'update':
        return permission.canUpdate;
      case 'delete':
        return permission.canDelete;
      default:
        return false;
    }
  }
}
