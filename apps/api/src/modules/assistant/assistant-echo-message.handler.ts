import { Injectable } from '@nestjs/common';
import type {
  AssistantMessageHandler,
  AssistantMessageHandlerInput,
  AssistantMessageHandlerResult,
} from './assistant-message-handler.port';

@Injectable()
export class AssistantEchoMessageHandler implements AssistantMessageHandler {
  async handleUserMessage(
    input: AssistantMessageHandlerInput,
  ): Promise<AssistantMessageHandlerResult> {
    const text = String(input.text ?? '').trim();
    const name = String(input.context.email ?? '').split('@')[0] || 'user';

    return {
      text: `Thanks ${name}. I received: "${text}". Realtime backend shell is active and awaiting full AI pipeline wiring.`,
      meta: {
        handler: 'echo',
        messageId: input.context.messageId,
      },
    };
  }
}
