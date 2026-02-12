import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import ProjectEntity from '../../entities/ProjectEntity';
import TaskEntity from '../../entities/TaskEntity';
import ImportTemplateEntity from '../../entities/ImportTemplateEntity';
import ImportController from './import.controller';
import ImportService from './import.service';
import ImportTemplatesController from './import-templates.controller';
import ImportTemplatesService from './import-templates.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectEntity, TaskEntity, ImportTemplateEntity]),
  ],
  controllers: [ImportController, ImportTemplatesController],
  providers: [ImportService, ImportTemplatesService],
})
export default class ImportModule {}
