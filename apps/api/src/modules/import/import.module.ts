import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import ProjectEntity from '../../entities/ProjectEntity';
import TaskEntity from '../../entities/TaskEntity';
import ImportController from './import.controller';
import ImportService from './import.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity, TaskEntity])],
  controllers: [ImportController],
  providers: [ImportService],
})
export default class ImportModule {}
