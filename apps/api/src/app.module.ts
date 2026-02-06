import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import PermissionEntity from './entities/PermissionEntity';
import RoleEntity from './entities/RoleEntity';
import UserEntity from './entities/UserEntity';

import AuthModule from './modules/auth/auth.module';
import UsersModule from './modules/users/users.module';
import RbacModule from './modules/rbac/rbac.module';
import MockSeedModule from './seed/mock-seed.module';

import ProjectEntity from './entities/ProjectEntity';
import TaskEntity from './entities/TaskEntity';

import ProjectsModule from './modules/projects/projects.module';
import TasksModule from './modules/tasks/tasks.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mongodb',
      url: process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/corp_admin',
      entities: [
        PermissionEntity,
        RoleEntity,
        UserEntity,
        ProjectEntity,
        TaskEntity,
      ],
      synchronize: process.env.TYPEORM_SYNC === '1',
      logging: process.env.TYPEORM_LOGGING === '1',
    }),
    ScheduleModule.forRoot(),
    RbacModule,
    UsersModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    MockSeedModule,
  ],
})
export class AppModule {
  constructor() {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
      console.warn('[AppModule] MONGO_URL not set, using default localhost');
    }
    console.log('[AppModule] Initialized with', {
      sync: process.env.TYPEORM_SYNC === '1',
      logging: process.env.TYPEORM_LOGGING === '1',
    });
  }
}
