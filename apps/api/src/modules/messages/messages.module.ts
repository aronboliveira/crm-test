import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import MessageEventEntity from '../../entities/MessageEventEntity';
import ClientEntity from '../../entities/ClientEntity';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [TypeOrmModule.forFeature([MessageEventEntity, ClientEntity])],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
