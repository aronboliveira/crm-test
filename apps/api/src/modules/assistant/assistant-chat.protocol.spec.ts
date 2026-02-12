import {
  createAssistantErrorFrame,
  createAssistantHistoryFrame,
  createAssistantMessageFrame,
  createAssistantPongFrame,
  parseAssistantInboundFrame,
} from './assistant-chat.protocol';

describe('AssistantChatProtocol', () => {
  describe('parseAssistantInboundFrame', () => {
    it('parses ping frames', () => {
      const frame = parseAssistantInboundFrame(
        JSON.stringify({ type: 'assistant.ping' }),
      );

      expect(frame.kind).toBe('ping');
    });

    it('parses user message frames', () => {
      const frame = parseAssistantInboundFrame(
        JSON.stringify({
          type: 'assistant.user.message',
          id: 'msg-1',
          content: 'Hello assistant',
        }),
      );

      expect(frame.kind).toBe('user-message');
      if (frame.kind === 'user-message') {
        expect(frame.id).toBe('msg-1');
        expect(frame.text).toBe('Hello assistant');
      }
    });

    it('rejects invalid json', () => {
      const frame = parseAssistantInboundFrame('not-json');
      expect(frame.kind).toBe('unsupported');
    });

    it('accepts fallback "message" field with generated id', () => {
      const frame = parseAssistantInboundFrame(
        JSON.stringify({
          type: 'assistant.user.message',
          message: 'fallback message field',
        }),
      );

      expect(frame.kind).toBe('user-message');
      if (frame.kind === 'user-message') {
        expect(frame.id).toBeTruthy();
        expect(frame.text).toBe('fallback message field');
      }
    });

    it('rejects empty content in user message frames', () => {
      const frame = parseAssistantInboundFrame(
        JSON.stringify({
          type: 'assistant.user.message',
          id: 'm-empty',
          content: '   ',
        }),
      );
      expect(frame.kind).toBe('unsupported');
      if (frame.kind === 'unsupported') {
        expect(frame.reason).toContain('Missing message content');
      }
    });

    it('rejects unsupported frame types with reason', () => {
      const frame = parseAssistantInboundFrame(
        JSON.stringify({
          type: 'assistant.unknown.frame',
        }),
      );
      expect(frame.kind).toBe('unsupported');
      if (frame.kind === 'unsupported') {
        expect(frame.reason).toContain('Unsupported frame type');
      }
    });
  });

  describe('outbound frame builders', () => {
    it('creates pong frame', () => {
      const wire = createAssistantPongFrame('2026-02-11T10:00:00.000Z');
      expect(wire).toContain('assistant.pong');
    });

    it('creates message frame', () => {
      const wire = createAssistantMessageFrame({
        id: 'a1',
        text: 'Server says hi',
        ts: '2026-02-11T10:00:00.000Z',
      });
      expect(wire).toContain('assistant.message');
      expect(wire).toContain('Server says hi');
    });

    it('creates error frame', () => {
      const wire = createAssistantErrorFrame(
        'Unsupported frame',
        '2026-02-11T10:00:00.000Z',
      );
      expect(wire).toContain('assistant.error');
      expect(wire).toContain('Unsupported frame');
    });

    it('creates history frame', () => {
      const wire = createAssistantHistoryFrame([
        {
          id: 'm1',
          direction: 'assistant',
          text: 'Hello',
          ts: '2026-02-11T10:00:00.000Z',
        },
      ]);
      expect(wire).toContain('assistant.history');
      expect(wire).toContain('"direction":"assistant"');
      expect(wire).toContain('"text":"Hello"');
    });

    it('normalizes history frame fields', () => {
      const wire = createAssistantHistoryFrame([
        {
          id: '  h-1 ',
          direction: 'user',
          text: '  hello history  ',
          ts: ' 2026-02-11T10:00:00.000Z ',
        },
      ]);

      expect(wire).toContain('"id":"h-1"');
      expect(wire).toContain('"text":"hello history"');
      expect(wire).toContain('"ts":"2026-02-11T10:00:00.000Z"');
    });
  });
});
