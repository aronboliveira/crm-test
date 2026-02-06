import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import PermissionEntity from '../entities/PermissionEntity';
import RoleEntity from '../entities/RoleEntity';
import UserEntity from '../entities/UserEntity';

import MockSeedService from './mock-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PermissionEntity, RoleEntity, UserEntity]),
  ],
  providers: [MockSeedService],
})
export default class MockSeedModule implements OnModuleInit {
  constructor(private readonly seed: MockSeedService) {}

  async onModuleInit() {
    process.env.SEED_MOCKS === '1' ? await this.seed.run() : void 0;
  }
}
