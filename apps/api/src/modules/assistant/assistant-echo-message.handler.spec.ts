import { AssistantEchoMessageHandler } from './assistant-echo-message.handler';

describe('AssistantEchoMessageHandler', () => {
  it('returns a deterministic shell reply and meta', async () => {
    const handler = new AssistantEchoMessageHandler();

    const result = await handler.handleUserMessage({
      text: 'help me with this lead',
      context: {
        userId: 'u1',
        email: 'john@example.com',
        role: 'viewer',
        perms: ['projects.read'],
        messageId: 'm1',
        transport: 'websocket',
        receivedAt: '2026-02-11T00:00:00.000Z',
      },
    });

    expect(result.text).toContain('Thanks john.');
    expect(result.text).toContain('help me with this lead');
    expect(result.meta?.handler).toBe('echo');
    expect(result.meta?.messageId).toBe('m1');
  });
});
