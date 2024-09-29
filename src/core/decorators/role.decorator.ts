import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { UserRoles } from 'src/types';

export const Roles = (...roles: UserRoles[]): CustomDecorator<string> =>
  SetMetadata('roles', roles);
