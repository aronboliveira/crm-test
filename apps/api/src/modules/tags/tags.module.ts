import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import TagEntity from '../../entities/TagEntity';
import TagsController from './tags.controller';
import TagsService from './tags.service';

@Module({
  imports: [TypeOrmModule.forFeature([TagEntity])],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export default class TagsModule {}
