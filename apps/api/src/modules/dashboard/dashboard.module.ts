import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import ProjectEntity from '../../entities/ProjectEntity';
import TaskEntity from '../../entities/TaskEntity';
import ClientEntity from '../../entities/ClientEntity';
import DashboardController from './dashboard.controller';
import DashboardService from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity, TaskEntity, ClientEntity])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export default class DashboardModule {}
