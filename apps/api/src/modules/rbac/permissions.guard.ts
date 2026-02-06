import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionKey } from '../../types/permissions';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export default class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private reflector: Reflector) {
    try {
      if (!reflector) {
        this.logger.warn('Reflector not injected properly');
      }
    } catch (error) {
      this.logger.error('PermissionsGuard constructor error:', error);
    }
  }

  canActivate(context: ExecutionContext): boolean {
    try {
      const requiredPermissions = this.reflector.getAllAndOverride<
        PermissionKey[]
      >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

      if (!requiredPermissions || requiredPermissions.length === 0) {
        return true;
      }

      const request = context.switchToHttp().getRequest();
      const user = request?.user;

      if (!user) {
        this.logger.warn('No user found in request');
        throw new ForbiddenException('Authentication required');
      }

      const userPerms = Array.isArray(user.perms) ? user.perms : [];
      const hasPermission = requiredPermissions.every((p) =>
        userPerms.includes(p),
      );

      if (!hasPermission) {
        this.logger.warn(
          `User ${user.email || user.id || 'unknown'} lacks required permissions: ${requiredPermissions.join(', ')}`,
        );
        throw new ForbiddenException('Insufficient permissions');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('PermissionsGuard canActivate error:', error);
      throw new ForbiddenException('Permission check failed');
    }
  }
}
