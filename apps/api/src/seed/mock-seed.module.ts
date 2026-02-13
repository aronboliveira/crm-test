import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import PermissionEntity from '../entities/PermissionEntity';
import RoleEntity from '../entities/RoleEntity';
import UserEntity from '../entities/UserEntity';
import ProjectEntity from '../entities/ProjectEntity';
import TaskEntity from '../entities/TaskEntity';
import MailOutboxEntity from '../entities/MailOutboxEntity';
import TagEntity from '../entities/TagEntity';
import MilestoneEntity from '../entities/MilestoneEntity';
import CommentEntity from '../entities/CommentEntity';
import ProjectTemplateEntity from '../entities/ProjectTemplateEntity';
import ClientEntity from '../entities/ClientEntity';
import AuthAuditEventEntity from '../entities/AuthAuditEventEntity';
import DeviceEntity from '../entities/DeviceEntity';

import MockSeedService from './mock-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PermissionEntity,
      RoleEntity,
      UserEntity,
      ProjectEntity,
      TaskEntity,
      MailOutboxEntity,
      TagEntity,
      MilestoneEntity,
      CommentEntity,
      ProjectTemplateEntity,
      ClientEntity,
      AuthAuditEventEntity,
      DeviceEntity,
    ]),
  ],
  providers: [MockSeedService],
})
export default class MockSeedModule implements OnModuleInit {
  constructor(private readonly seed: MockSeedService) {}

  async onModuleInit() {
    if (process.env.SEED_MOCKS === '1') {
      await this.seed.run();
    }
  }
}
