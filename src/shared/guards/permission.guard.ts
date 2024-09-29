// permission.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { PermissionMetadata } from 'src/core/decorators';

import { PermissionService } from '../services/permission.service';

@Injectable()
export class PermissionGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<PermissionMetadata[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions) {
      return true;
    }

    await super.canActivate(context); // Ensure the user is authenticated

    const { user, params } = context.switchToHttp().getRequest();
    const userRole = user.roleId;

    for (const permissionMetadata of requiredPermissions) {
      const { operation, spaceId } = permissionMetadata;
      const hasPermission = await this.permissionService.hasPermission(
        userRole,
        user.organizationId,
        spaceId || params.spaceId,
        operation,
      );

      if (!hasPermission) {
        return false;
      }
    }

    return true;
  }
}
