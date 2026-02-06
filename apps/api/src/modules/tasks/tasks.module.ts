import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import TaskEntity from '../../entities/TaskEntity';
import ProjectEntity from '../../entities/ProjectEntity';

import TasksController from './tasks.controller';
import TasksService from './tasks.service';

import { PROJECTS_LOOKUP_PORT } from './ports/projects-lookup.token';
import TypeOrmProjectsLookupService from './adapters/TypeOrmProjectsLookupService';

@Module({
  imports: [TypeOrmModule.forFeature([TaskEntity, ProjectEntity])],
  controllers: [TasksController],
  providers: [
    TasksService,
    { provide: PROJECTS_LOOKUP_PORT, useClass: TypeOrmProjectsLookupService },
  ],
  exports: [TasksService],
})
export default class TasksModule {}
