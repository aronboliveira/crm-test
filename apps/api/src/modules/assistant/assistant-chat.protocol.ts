import SafeJsonUtil from '../../common/json/safe-json.util';

type AssistantInboundPing = Readonly<{
  kind: 'ping';
}>;

type AssistantInboundUserMessage = Readonly<{
  kind: 'user-message';
  id: string;
  text: string;
}>;

type AssistantInboundUnsupported = Readonly<{
  kind: 'unsupported';
  reason: string;
}>;

export type AssistantInboundFrame =
  | AssistantInboundPing
  | AssistantInboundUserMessage
  | AssistantInboundUnsupported;

export type AssistantMessageFrameInput = Readonly<{
  id?: string;
  text: string;
  ts: string;
}>;

export type AssistantHistoryFrameItem = Readonly<{
  id: string;
  direction: 'user' | 'assistant' | 'system';
  text: string;
  ts: string;
}>;

const normalizeText = (value: unknown): string => String(value ?? '').trim();

const createId = (): string =>
  `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const toObject = (wire: string): Record<string, unknown> | null => {
  return SafeJsonUtil.parseObject(wire);
};

export const parseAssistantInboundFrame = (
  frame: string,
): AssistantInboundFrame => {
  const wire = normalizeText(frame);
  if (!wire) {
    return { kind: 'unsupported', reason: 'Empty frame' };
  }

  const obj = toObject(wire);
  if (!obj) {
    return { kind: 'unsupported', reason: 'Invalid JSON frame' };
  }

  const type = normalizeText(obj.type);
  if (type === 'assistant.ping' || type === 'ping') {
    return { kind: 'ping' };
  }

  if (type === 'assistant.user.message') {
    const id = normalizeText(obj.id) || createId();
    const content = normalizeText(obj.content ?? obj.message);
    if (!content) {
      return { kind: 'unsupported', reason: 'Missing message content' };
    }
    return { kind: 'user-message', id, text: content };
  }

  return { kind: 'unsupported', reason: `Unsupported frame type: "${type}"` };
};

export const createAssistantPongFrame = (ts: string): string =>
  SafeJsonUtil.stringify({
    type: 'assistant.pong',
    ts,
  });

export const createAssistantMessageFrame = (
  input: AssistantMessageFrameInput,
): string =>
  SafeJsonUtil.stringify({
    type: 'assistant.message',
    id: input.id ?? createId(),
    message: normalizeText(input.text),
    ts: input.ts,
  });

export const createAssistantErrorFrame = (reason: string, ts: string): string =>
  SafeJsonUtil.stringify({
    type: 'assistant.error',
    reason: normalizeText(reason),
    ts,
  });

export const createAssistantHistoryFrame = (
  items: readonly AssistantHistoryFrameItem[],
): string =>
  SafeJsonUtil.stringify({
    type: 'assistant.history',
    items: items.map((item) => ({
      id: normalizeText(item.id),
      direction: item.direction,
      text: normalizeText(item.text),
      ts: normalizeText(item.ts),
    })),
  });
