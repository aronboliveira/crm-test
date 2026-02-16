import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import UserEntity from '../../entities/UserEntity';
import AssistantChatMessageEntity from '../../entities/AssistantChatMessageEntity';
import { AssistantChatController } from './assistant-chat.controller';
import { AssistantWsAuthService } from './assistant-ws-auth.service';
import { AssistantWsService } from './assistant-ws.service';
import { AssistantChatLogService } from './assistant-chat-log.service';
import { ASSISTANT_MESSAGE_HANDLER } from './assistant-message-handler.port';
import { IntegrationsModule } from '../integrations/integrations.module';
import { OpenAiProvider } from './llm/providers/openai/openai.provider';
import { LlmMessageHandler } from './llm/llm-message.handler';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([UserEntity, AssistantChatMessageEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev_secret_change_me',
    }),
    IntegrationsModule, // For IntegrationConfigsService
  ],
  controllers: [AssistantChatController],
  providers: [
    AssistantWsAuthService,
    AssistantWsService,
    AssistantChatLogService,
    OpenAiProvider,
    LlmMessageHandler,
    {
      provide: ASSISTANT_MESSAGE_HANDLER,
      useExisting: LlmMessageHandler, // Changed from EchoMessageHandler
    },
  ],
  exports: [AssistantWsService],
})
export class AssistantWsModule {}
