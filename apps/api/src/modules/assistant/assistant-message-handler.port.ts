export type AssistantHandlerContext = Readonly<{
  userId: string;
  email: string;
  role: string;
  perms: readonly string[];
  messageId: string;
  transport: 'websocket';
  receivedAt: string;
}>;

export type AssistantMessageHandlerInput = Readonly<{
  text: string;
  context: AssistantHandlerContext;
}>;

export type AssistantMessageHandlerResult = Readonly<{
  text: string;
  meta?: Record<string, unknown>;
}>;

export interface AssistantMessageHandler {
  handleUserMessage(
    input: AssistantMessageHandlerInput,
  ): Promise<AssistantMessageHandlerResult>;
}

export const ASSISTANT_MESSAGE_HANDLER = Symbol('ASSISTANT_MESSAGE_HANDLER');
