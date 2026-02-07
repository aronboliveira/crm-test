import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import CommentEntity from '../../entities/CommentEntity';
import CommentsController from './comments.controller';
import CommentsService from './comments.service';

@Module({
  imports: [TypeOrmModule.forFeature([CommentEntity])],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export default class CommentsModule {}
