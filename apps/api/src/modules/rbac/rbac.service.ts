import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import type { PermissionKey, RoleKey } from '../../types/permissions';
import RoleEntity from '../../entities/RoleEntity';

@Injectable()
export default class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(
    @InjectRepository(RoleEntity)
    private readonly rolesRepo: MongoRepository<RoleEntity>,
  ) {
    try {
      if (!rolesRepo) {
        this.logger.error('RolesRepo not injected');
        throw new Error('Repository initialization failed');
      }
      this.logger.log('RbacService initialized');
    } catch (error) {
      this.logger.error('RbacService constructor error:', error);
      throw error;
    }
  }

  async resolvePermissions(
    roles: readonly RoleKey[],
  ): Promise<readonly PermissionKey[]> {
    try {
      const list = roles?.length ? roles : ['viewer'];
      const found = await this.rolesRepo.find({
        where: { key: { $in: list as any } } as any,
      });

      if (found.length === 0) {
        this.logger.warn(`No roles found for: ${list.join(', ')}`);
        return [];
      }

      const set = new Set<PermissionKey>();
      found.forEach((r) => (r.permissionKeys || []).forEach((p) => set.add(p)));

      this.logger.log(
        `Resolved ${set.size} permissions for roles: ${list.join(', ')}`,
      );
      return Array.from(set);
    } catch (error) {
      this.logger.error('Error resolving permissions:', error);
      return [];
    }
  }
}
