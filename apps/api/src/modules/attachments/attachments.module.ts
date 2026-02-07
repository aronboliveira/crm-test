import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import AttachmentEntity from '../../entities/AttachmentEntity';
import AttachmentsController from './attachments.controller';
import AttachmentsService from './attachments.service';

@Module({
  imports: [TypeOrmModule.forFeature([AttachmentEntity])],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export default class AttachmentsModule {}
