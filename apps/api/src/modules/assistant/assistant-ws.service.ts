import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { IncomingMessage, Server as HttpServer } from 'http';
import type { Socket as NetSocket } from 'net';
import WebSocket, { Server as WebSocketServer } from 'ws';
import {
  createAssistantErrorFrame,
  createAssistantHistoryFrame,
  createAssistantMessageFrame,
  createAssistantPongFrame,
  parseAssistantInboundFrame,
} from './assistant-chat.protocol';
import {
  ASSISTANT_MESSAGE_HANDLER,
  type AssistantMessageHandler,
  type AssistantMessageHandlerInput,
  type AssistantMessageHandlerResult,
} from './assistant-message-handler.port';
import {
  AssistantWsAuthService,
  type AssistantWsIdentity,
} from './assistant-ws-auth.service';
import { AssistantChatLogService } from './assistant-chat-log.service';

type AuthedRequest = IncomingMessage & {
  assistantIdentity?: AssistantWsIdentity;
};

@Injectable()
export class AssistantWsService implements OnModuleDestroy {
  private readonly logger = new Logger(AssistantWsService.name);
  private readonly upgradePath = '/ws/assistant/chat';

  private wss: WebSocketServer | null = null;
  private httpServer: HttpServer | null = null;

  constructor(
    private readonly authService: AssistantWsAuthService,
    private readonly logService: AssistantChatLogService,
    @Inject(ASSISTANT_MESSAGE_HANDLER)
    private readonly messageHandler: AssistantMessageHandler,
  ) {}

  bind(httpServer: HttpServer): void {
    if (this.wss) {
      return;
    }

    this.httpServer = httpServer;
    this.wss = new WebSocketServer({ noServer: true });

    this.wss.on('connection', (client, req) => {
      const request = req as AuthedRequest;
      const identity = request.assistantIdentity;
      if (!identity) {
        client.close(1008, 'Unauthorized');
        return;
      }
      this.handleConnection(client, identity);
    });

    this.httpServer.on('upgrade', this.onUpgrade);
    this.logger.log(`Assistant websocket bound on ${this.upgradePath}`);
  }

  onModuleDestroy(): void {
    if (this.httpServer) {
      this.httpServer.off('upgrade', this.onUpgrade);
      this.httpServer = null;
    }

    if (this.wss) {
      try {
        this.wss.clients.forEach((client) => {
          try {
            client.close(1001, 'Server shutting down');
          } catch {
            // ignore close failure during shutdown
          }
        });
        this.wss.close();
      } catch {
        // ignore
      }
      this.wss = null;
    }
  }

  private readonly onUpgrade = async (
    request: IncomingMessage,
    socket: NetSocket,
    head: Buffer,
  ): Promise<void> => {
    if (!this.wss) {
      socket.destroy();
      return;
    }

    const parsed = this.parseRequestUrl(request.url);
    if (!parsed || parsed.pathname !== this.upgradePath) {
      return;
    }

    const token = this.extractToken(parsed, request);
    const identity = await this.authService.authenticate(token);
    if (!identity) {
      this.rejectUpgrade(socket, 401, 'Unauthorized');
      return;
    }

    const authedRequest = request as AuthedRequest;
    authedRequest.assistantIdentity = identity;

    this.wss.handleUpgrade(authedRequest, socket, head, (client) => {
      this.wss?.emit('connection', client, authedRequest);
    });
  };

  private handleConnection(client: WebSocket, identity: AssistantWsIdentity) {
    this.logger.log(`Assistant WS connected: ${identity.email}`);

    this.send(
      client,
      createAssistantMessageFrame({
        text: `Connected to assistant socket as ${identity.email}.`,
        ts: this.now(),
      }),
    );

    void this.replayHistory(client, identity.userId);

    client.on('message', (payload, isBinary) => {
      if (isBinary) {
        return;
      }

      const inbound = parseAssistantInboundFrame(payload.toString());
      if (inbound.kind === 'ping') {
        this.send(client, createAssistantPongFrame(this.now()));
        return;
      }

      if (inbound.kind === 'user-message') {
        void this.processUserMessage(
          client,
          identity,
          inbound.id,
          inbound.text,
        );
        return;
      }

      this.send(client, createAssistantErrorFrame(inbound.reason, this.now()));
    });

    client.on('close', () => {
      this.logger.log(`Assistant WS disconnected: ${identity.email}`);
    });
  }

  private send(client: WebSocket, wire: string): void {
    if (client.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      client.send(wire);
    } catch (error) {
      this.logger.warn(
        `Assistant WS send failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async replayHistory(
    client: WebSocket,
    userId: string,
  ): Promise<void> {
    const history = await this.logService.listRecentByUser(userId, 25);
    if (history.length === 0) {
      return;
    }

    this.send(
      client,
      createAssistantHistoryFrame(
        history.map((entry) => ({
          id: String(entry.id),
          direction: entry.direction,
          text: String(entry.text ?? ''),
          ts: String(entry.createdAt ?? ''),
        })),
      ),
    );
  }

  private async processUserMessage(
    client: WebSocket,
    identity: AssistantWsIdentity,
    messageId: string,
    text: string,
  ): Promise<void> {
    const now = this.now();

    await this.logService.append({
      userId: identity.userId,
      direction: 'user',
      text,
      status: 'received',
      meta: { source: 'assistant-ws', messageId },
    });

    const handlerInput: AssistantMessageHandlerInput = {
      text,
      context: {
        userId: identity.userId,
        email: identity.email,
        role: identity.role,
        perms: identity.perms,
        messageId,
        transport: 'websocket',
        receivedAt: now,
      },
    };

    let handled: AssistantMessageHandlerResult | null = null;
    try {
      handled = await this.messageHandler.handleUserMessage(handlerInput);
    } catch (error) {
      this.send(
        client,
        createAssistantErrorFrame(
          error instanceof Error ? error.message : 'Message handling failed',
          this.now(),
        ),
      );
      return;
    }

    const replyText = String(handled?.text ?? '').trim();
    if (!replyText) {
      this.send(
        client,
        createAssistantErrorFrame(
          'Assistant handler returned empty text',
          this.now(),
        ),
      );
      return;
    }

    this.send(
      client,
      createAssistantMessageFrame({
        id: `assistant-${messageId}`,
        text: replyText,
        ts: this.now(),
      }),
    );

    await this.logService.append({
      userId: identity.userId,
      direction: 'assistant',
      text: replyText,
      status: 'sent',
      meta: {
        source: 'assistant-ws',
        correlatedId: messageId,
        ...(handled?.meta ?? {}),
      },
    });
  }

  private parseRequestUrl(url: string | undefined): URL | null {
    if (!url) {
      return null;
    }
    try {
      return new URL(url, 'http://localhost');
    } catch {
      return null;
    }
  }

  private extractToken(parsed: URL, request: IncomingMessage): string {
    const queryToken = parsed.searchParams.get('token') ?? '';
    if (queryToken) {
      return queryToken;
    }
    const authHeader = String(request.headers.authorization ?? '');
    if (!authHeader) {
      return '';
    }
    return authHeader;
  }

  private rejectUpgrade(
    socket: NetSocket,
    code: number,
    message: string,
  ): void {
    try {
      socket.write(
        `HTTP/1.1 ${code} ${message}\r\n` +
          'Connection: close\r\n' +
          'Content-Type: text/plain\r\n' +
          '\r\n',
      );
    } catch {
      // ignore write failure
    }
    socket.destroy();
  }

  private now(): string {
    return new Date().toISOString();
  }
}
