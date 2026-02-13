import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import ProjectEntity from '../../entities/ProjectEntity';
import TaskEntity from '../../entities/TaskEntity';
import ImportTemplateEntity from '../../entities/ImportTemplateEntity';
import ImportIngestionRunEntity from '../../entities/ImportIngestionRunEntity';
import ClientEntity from '../../entities/ClientEntity';
import LeadEntity from '../../entities/LeadEntity';
import MessageEventEntity from '../../entities/MessageEventEntity';
import UserEntity from '../../entities/UserEntity';
import ImportController from './import.controller';
import ImportService from './import.service';
import ImportTemplatesController from './import-templates.controller';
import ImportTemplatesService from './import-templates.service';
import ImportFieldSuggestionsService from './import-field-suggestions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectEntity,
      TaskEntity,
      ImportTemplateEntity,
      ImportIngestionRunEntity,
      ClientEntity,
      LeadEntity,
      MessageEventEntity,
      UserEntity,
    ]),
  ],
  controllers: [ImportController, ImportTemplatesController],
  providers: [ImportService, ImportTemplatesService, ImportFieldSuggestionsService],
})
export default class ImportModule {}
