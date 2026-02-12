import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import UserEntity from '../../entities/UserEntity';
import AssistantChatMessageEntity from '../../entities/AssistantChatMessageEntity';
import { AssistantChatController } from './assistant-chat.controller';
import { AssistantWsAuthService } from './assistant-ws-auth.service';
import { AssistantWsService } from './assistant-ws.service';
import { AssistantChatLogService } from './assistant-chat-log.service';
import {
  ASSISTANT_MESSAGE_HANDLER,
} from './assistant-message-handler.port';
import { AssistantEchoMessageHandler } from './assistant-echo-message.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, AssistantChatMessageEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev_secret_change_me',
    }),
  ],
  controllers: [AssistantChatController],
  providers: [
    AssistantWsAuthService,
    AssistantWsService,
    AssistantChatLogService,
    AssistantEchoMessageHandler,
    {
      provide: ASSISTANT_MESSAGE_HANDLER,
      useExisting: AssistantEchoMessageHandler,
    },
  ],
  exports: [AssistantWsService],
})
export class AssistantWsModule {}
