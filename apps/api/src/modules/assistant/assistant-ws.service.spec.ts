import { AssistantWsService } from './assistant-ws.service';

class FakeWsClient {
  readyState = 1;
  readonly send = jest.fn();
  private readonly handlers = new Map<string, Function[]>();

  on(event: string, handler: Function): this {
    const arr = this.handlers.get(event) ?? [];
    arr.push(handler);
    this.handlers.set(event, arr);
    return this;
  }

  emitMessage(payload: string, isBinary = false): void {
    const arr = this.handlers.get('message') ?? [];
    for (const handler of arr) {
      handler(Buffer.from(payload, 'utf8'), isBinary);
    }
  }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const createUpgradeSocket = () => ({
  write: jest.fn(),
  destroy: jest.fn(),
});

const createService = (overrides?: {
  auth?: Partial<{ authenticate: jest.Mock }>;
  log?: Partial<{ append: jest.Mock; listRecentByUser: jest.Mock }>;
  handler?: Partial<{ handleUserMessage: jest.Mock }>;
}) => {
  const auth = {
    authenticate: jest.fn(),
    ...(overrides?.auth ?? {}),
  };

  const log = {
    append: jest.fn().mockResolvedValue(undefined),
    listRecentByUser: jest.fn().mockResolvedValue([]),
    ...(overrides?.log ?? {}),
  };

  const handler = {
    handleUserMessage: jest.fn().mockResolvedValue({ text: 'echo' }),
    ...(overrides?.handler ?? {}),
  };

  return {
    auth,
    log,
    handler,
    service: new AssistantWsService(auth as any, log as any, handler as any),
  };
};

describe('AssistantWsService', () => {
  const identity = {
    userId: 'user-1',
    email: 'jane@example.com',
    role: 'viewer',
    perms: ['projects.read'],
  };

  it('responds with pong on ping frame', async () => {
    const { service } = createService();
    const client = new FakeWsClient();

    (service as any).handleConnection(client as any, identity);
    client.send.mockClear();

    client.emitMessage(JSON.stringify({ type: 'assistant.ping' }));
    expect(client.send).toHaveBeenCalledTimes(1);
    expect(client.send.mock.calls[0]?.[0]).toContain('assistant.pong');
  });

  it('ignores binary websocket frames', async () => {
    const { service, handler, log } = createService();
    const client = new FakeWsClient();

    (service as any).handleConnection(client as any, identity);
    client.send.mockClear();

    client.emitMessage(
      JSON.stringify({
        type: 'assistant.user.message',
        id: 'm-binary',
        content: 'should-not-process',
      }),
      true,
    );

    await tick();

    expect(handler.handleUserMessage).not.toHaveBeenCalled();
    expect(log.append).not.toHaveBeenCalled();
    expect(client.send).not.toHaveBeenCalled();
  });

  it('emits assistant.error for unsupported inbound frames', async () => {
    const { service } = createService();
    const client = new FakeWsClient();

    (service as any).handleConnection(client as any, identity);
    client.send.mockClear();

    client.emitMessage(JSON.stringify({ type: 'assistant.unknown' }));

    expect(client.send).toHaveBeenCalledTimes(1);
    expect(client.send.mock.calls[0]?.[0]).toContain('assistant.error');
    expect(client.send.mock.calls[0]?.[0]).toContain('Unsupported frame type');
  });

  it('delegates user message to handler and persists both directions', async () => {
    const { service, handler, log } = createService({
      handler: {
        handleUserMessage: jest.fn().mockResolvedValue({
          text: 'processed reply',
          meta: { model: 'test' },
        }),
      },
    });
    const client = new FakeWsClient();

    (service as any).handleConnection(client as any, identity);
    client.send.mockClear();

    client.emitMessage(
      JSON.stringify({
        type: 'assistant.user.message',
        id: 'm-1',
        content: 'hello there',
      }),
    );

    await tick();

    expect(handler.handleUserMessage).toHaveBeenCalledTimes(1);
    expect(log.append).toHaveBeenCalledTimes(2);
    expect(client.send).toHaveBeenCalledTimes(1);
    expect(client.send.mock.calls[0]?.[0]).toContain('assistant.message');
    expect(client.send.mock.calls[0]?.[0]).toContain('processed reply');
  });

  it('emits assistant.error when handler throws', async () => {
    const { service, log } = createService({
      handler: {
        handleUserMessage: jest
          .fn()
          .mockRejectedValue(new Error('handler-failed')),
      },
    });
    const client = new FakeWsClient();

    (service as any).handleConnection(client as any, identity);
    client.send.mockClear();

    client.emitMessage(
      JSON.stringify({
        type: 'assistant.user.message',
        id: 'm-1',
        content: 'hello there',
      }),
    );

    await tick();

    expect(log.append).toHaveBeenCalledTimes(1);
    expect(client.send).toHaveBeenCalledTimes(1);
    expect(client.send.mock.calls[0]?.[0]).toContain('assistant.error');
    expect(client.send.mock.calls[0]?.[0]).toContain('handler-failed');
  });

  it('emits assistant.error when handler returns empty text', async () => {
    const { service, log } = createService({
      handler: {
        handleUserMessage: jest.fn().mockResolvedValue({ text: '   ' }),
      },
    });
    const client = new FakeWsClient();

    (service as any).handleConnection(client as any, identity);
    client.send.mockClear();

    client.emitMessage(
      JSON.stringify({
        type: 'assistant.user.message',
        id: 'm-empty',
        content: 'hello there',
      }),
    );

    await tick();

    expect(log.append).toHaveBeenCalledTimes(1);
    expect(client.send).toHaveBeenCalledTimes(1);
    expect(client.send.mock.calls[0]?.[0]).toContain('assistant.error');
    expect(client.send.mock.calls[0]?.[0]).toContain(
      'Assistant handler returned empty text',
    );
  });

  it('replays persisted history after connection', async () => {
    const { service, log } = createService({
      log: {
        listRecentByUser: jest.fn().mockResolvedValue([
          {
            id: 'h1',
            direction: 'assistant',
            text: 'past answer',
            createdAt: '2026-02-11T10:00:00.000Z',
          },
        ]),
      },
    });
    const client = new FakeWsClient();

    (service as any).handleConnection(client as any, identity);
    await tick();

    expect(log.listRecentByUser).toHaveBeenCalledWith('user-1', 25);
    const wires = client.send.mock.calls.map((call) => String(call[0]));
    expect(wires.some((wire) => wire.includes('assistant.history'))).toBe(true);
  });

  it('skips send attempts when socket is not open', async () => {
    const { service } = createService();
    const client = new FakeWsClient();
    client.readyState = 0;

    (service as any).handleConnection(client as any, identity);

    expect(client.send).not.toHaveBeenCalled();
  });

  it('destroys upgrade socket when websocket server is not bound', async () => {
    const { service, auth } = createService();
    const socket = createUpgradeSocket();

    await (service as any).onUpgrade(
      {
        url: '/ws/assistant/chat?token=test-token',
        headers: {},
      },
      socket,
      Buffer.alloc(0),
    );

    expect(socket.destroy).toHaveBeenCalledTimes(1);
    expect(auth.authenticate).not.toHaveBeenCalled();
  });

  it('ignores upgrade attempts outside assistant websocket path', async () => {
    const { service, auth } = createService();
    const socket = createUpgradeSocket();
    const wss = {
      handleUpgrade: jest.fn(),
      emit: jest.fn(),
    };
    (service as any).wss = wss;

    await (service as any).onUpgrade(
      {
        url: '/ws/other/path?token=abc',
        headers: {},
      },
      socket,
      Buffer.alloc(0),
    );

    expect(auth.authenticate).not.toHaveBeenCalled();
    expect(wss.handleUpgrade).not.toHaveBeenCalled();
    expect(socket.destroy).not.toHaveBeenCalled();
  });

  it('rejects upgrade with 401 when authentication fails', async () => {
    const { service, auth } = createService({
      auth: {
        authenticate: jest.fn().mockResolvedValue(null),
      },
    });
    const socket = createUpgradeSocket();
    const wss = {
      handleUpgrade: jest.fn(),
      emit: jest.fn(),
    };
    (service as any).wss = wss;

    await (service as any).onUpgrade(
      {
        url: '/ws/assistant/chat?token=bad-token',
        headers: {},
      },
      socket,
      Buffer.alloc(0),
    );

    expect(auth.authenticate).toHaveBeenCalledWith('bad-token');
    expect(socket.write).toHaveBeenCalledWith(
      expect.stringContaining('HTTP/1.1 401 Unauthorized'),
    );
    expect(socket.destroy).toHaveBeenCalledTimes(1);
    expect(wss.handleUpgrade).not.toHaveBeenCalled();
  });

  it('uses authorization header token when query token is missing', async () => {
    const { service, auth } = createService({
      auth: {
        authenticate: jest.fn().mockResolvedValue(identity),
      },
    });
    const socket = createUpgradeSocket();
    const client = new FakeWsClient();
    const wss = {
      handleUpgrade: jest.fn((_req: unknown, _socket: unknown, _head: unknown, cb: Function) => {
        cb(client);
      }),
      emit: jest.fn(),
    };
    const request = {
      url: '/ws/assistant/chat',
      headers: {
        authorization: 'Bearer token-from-header',
      },
    };
    (service as any).wss = wss;

    await (service as any).onUpgrade(request as any, socket as any, Buffer.alloc(0));

    expect(auth.authenticate).toHaveBeenCalledWith('Bearer token-from-header');
    expect(wss.handleUpgrade).toHaveBeenCalledTimes(1);
    expect(wss.emit).toHaveBeenCalledWith('connection', client, request);
    expect((request as any).assistantIdentity).toEqual(identity);
  });

  it('upgrades authorized requests and emits connection', async () => {
    const { service, auth } = createService({
      auth: {
        authenticate: jest.fn().mockResolvedValue(identity),
      },
    });
    const socket = createUpgradeSocket();
    const client = new FakeWsClient();
    const wss = {
      handleUpgrade: jest.fn((_req: unknown, _socket: unknown, _head: unknown, cb: Function) => {
        cb(client);
      }),
      emit: jest.fn(),
    };
    const request = {
      url: '/ws/assistant/chat?token=query-token',
      headers: {},
    };
    (service as any).wss = wss;

    await (service as any).onUpgrade(request as any, socket as any, Buffer.alloc(0));

    expect(auth.authenticate).toHaveBeenCalledWith('query-token');
    expect(wss.handleUpgrade).toHaveBeenCalledTimes(1);
    expect(wss.emit).toHaveBeenCalledWith('connection', client, request);
    expect((request as any).assistantIdentity).toEqual(identity);
  });
});
