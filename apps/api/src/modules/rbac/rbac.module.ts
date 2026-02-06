import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import RoleEntity from '../../entities/RoleEntity';
import PermissionEntity from '../../entities/PermissionEntity';
import RbacService from './rbac.service';
import RbacController from './rbac.controller';
import RbacCatalogService from './rbac.catalog.service';

@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity, PermissionEntity])],
  controllers: [RbacController],
  providers: [RbacService, RbacCatalogService],
  exports: [RbacService],
})
export default class RbacModule {}
