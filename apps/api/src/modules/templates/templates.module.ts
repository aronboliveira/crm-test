import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import ProjectTemplateEntity from '../../entities/ProjectTemplateEntity';
import TemplatesController from './templates.controller';
import TemplatesService from './templates.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectTemplateEntity])],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export default class TemplatesModule {}
