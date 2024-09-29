// permission.decorator.ts
import { SetMetadata } from '@nestjs/common';

export interface PermissionMetadata {
  operation: 'read' | 'create' | 'update' | 'delete';
  spaceId?: number;
}

export const Permissions = (...permissions: PermissionMetadata[]) =>
  SetMetadata('permissions', permissions);
