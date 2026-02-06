import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import PermissionEntity from '../../entities/PermissionEntity';
import RoleEntity from '../../entities/RoleEntity';

@Injectable()
export default class RbacCatalogService {
  private readonly logger = new Logger(RbacCatalogService.name);

  constructor(
    @InjectRepository(RoleEntity)
    private readonly rolesRepo: MongoRepository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permsRepo: MongoRepository<PermissionEntity>,
  ) {
    try {
      if (!rolesRepo || !permsRepo) {
        this.logger.error('One or more repositories not injected');
        throw new Error('Repository initialization failed');
      }
      this.logger.log('RbacCatalogService initialized');
    } catch (error) {
      this.logger.error('RbacCatalogService constructor error:', error);
      throw error;
    }
  }

  async roles() {
    try {
      const rows = await this.rolesRepo.find({ take: 200 } as any);
      this.logger.log(`Retrieved ${rows.length} roles`);
      return rows.map((r) => ({
        id: String(r._id),
        key: r.key,
        name: r.name,
        description: r.description,
        permissionKeys: r.permissionKeys,
      }));
    } catch (error) {
      this.logger.error('Error fetching roles:', error);
      throw error;
    }
  }

  async permissions() {
    try {
      const rows = await this.permsRepo.find({ take: 500 } as any);
      this.logger.log(`Retrieved ${rows.length} permissions`);
      return rows.map((p) => ({
        id: String(p._id),
        key: p.key,
        description: p.description,
      }));
    } catch (error) {
      this.logger.error('Error fetching permissions:', error);
      throw error;
    }
  }
}
