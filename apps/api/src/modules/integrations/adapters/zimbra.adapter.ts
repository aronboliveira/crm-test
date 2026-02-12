import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import type {
  IntegrationAdapter,
  IntegrationConfig,
  IntegrationSyncDataset,
  IntegrationStatus,
} from '../types';
import {
  IntegrationValueSanitizer,
  MAIL_DATASET_TYPES,
  MAIL_DEFAULTS,
  MailSmtpProfileFactory,
  type MailSmtpProfile,
  SafeJsonCodec,
} from './shared/mail-integration.shared';

/**
 * Zimbra Mail Integration Adapter
 *
 * Adapter for integrating with Zimbra Collaboration Suite.
 */
@Injectable()
export class ZimbraAdapter implements IntegrationAdapter {
  private readonly logger = new Logger(ZimbraAdapter.name);
  private config: IntegrationConfig = {};
  private httpClient: ReturnType<typeof axios.create>;
  private authToken?: string;
  private isConnected = false;
  private lastSyncAt?: string;
  private lastError?: string;

  constructor() {
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private readonly mockEmails = [
    {
      id: 'email_001',
      subject: 'Proposta aprovada - seguir com contrato',
      from: 'financeiro@cliente.com.br',
      receivedAt: new Date().toISOString(),
      link: 'https://mail.exemplo.com/app/mail',
    },
  ];

  private readonly mockCalls = [
    {
      id: 'call_001',
      title: 'Call de alinhamento com cliente',
      startAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      endAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      organizer: 'comercial@corp.local',
      link: 'https://mail.exemplo.com/app/calendar',
    },
  ];

  async getStatus(): Promise<IntegrationStatus> {
    const configured = this.isConfigured();
    const status = !configured
      ? 'disconnected'
      : this.lastError
        ? 'error'
        : this.isConnected
          ? 'connected'
          : 'disconnected';

    return {
      id: 'zimbra',
      name: 'Zimbra Mail',
      type: 'Email/Collaboration',
      status,
      configured,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
      features: [
        'Email sync (send/receive)',
        'Calendar integration',
        'Contact sync',
        'Task sync',
        'Attachment handling',
      ],
    };
  }

  async testConnection(): Promise<boolean> {
    this.logger.log('Testing Zimbra connection...');

    if (!this.isConfigured()) {
      this.lastError = 'Integration not configured';
      this.isConnected = false;
      return false;
    }

    try {
      await this.authenticate();
      const info = await this.getAccountInfo();
      this.isConnected = true;
      this.lastError = undefined;
      this.logger.log(
        `Zimbra connection successful: ${info.name || 'Unknown account'}`,
      );
      return true;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.isConnected = false;
      this.logger.error(`Zimbra connection failed: ${this.lastError}`);
      return false;
    }
  }

  async configure(config: Partial<IntegrationConfig>): Promise<void> {
    this.logger.log('Updating Zimbra configuration');
    const merged = { ...this.config, ...config };

    this.config = {
      ...merged,
      baseUrl: IntegrationValueSanitizer.normalizeUrl(
        merged.baseUrl ?? merged.apiUrl,
      ),
      apiUrl: undefined,
      username: IntegrationValueSanitizer.normalizeString(merged.username),
      password: IntegrationValueSanitizer.normalizeString(
        merged.password ?? merged.apiKey,
      ),
      smtpHost: IntegrationValueSanitizer.normalizeString(merged.smtpHost),
      smtpPort: IntegrationValueSanitizer.normalizePort(merged.smtpPort),
      smtpSecure:
        IntegrationValueSanitizer.normalizeBoolean(merged.smtpSecure)
        ?? undefined,
      smtpUser: IntegrationValueSanitizer.normalizeString(merged.smtpUser),
      smtpPass: IntegrationValueSanitizer.normalizeString(merged.smtpPass),
      smtpFrom: IntegrationValueSanitizer.normalizeString(merged.smtpFrom),
      smtpProfile: merged.smtpProfile,
      mockNotifications:
        IntegrationValueSanitizer.normalizeBoolean(merged.mockNotifications)
        ?? false,
    };

    this.authToken = undefined;
    this.isConnected = false;
    this.lastError = undefined;
  }

  getSmtpProfile(): MailSmtpProfile | null {
    return MailSmtpProfileFactory.fromConfig(this.config, {
      fallbackHost: this.extractHost(this.config.baseUrl),
      fallbackPort: MAIL_DEFAULTS.smtpPort,
      fallbackSecure: MAIL_DEFAULTS.smtpSecure,
      profile: 'zimbra',
    });
  }

  isConfigured(): boolean {
    return Boolean(
      IntegrationValueSanitizer.hasString(this.config.baseUrl)
      && IntegrationValueSanitizer.hasString(this.config.username)
      && IntegrationValueSanitizer.hasString(this.config.password),
    );
  }

  async sync(): Promise<void> {
    await this.pullSyncSnapshot();
  }

  async pullSyncSnapshot(): Promise<IntegrationSyncDataset[]> {
    if (!this.isConfigured()) {
      throw new Error('Zimbra integration not configured');
    }

    try {
      const [emails, calls] = await Promise.all([
        this.getUnreadEmails(),
        this.getUpcomingCalls(MAIL_DEFAULTS.zimbraSyncWindowMinutes),
      ]);

      this.lastSyncAt = new Date().toISOString();
      this.lastError = undefined;

      // * FINISH INTEGRATION HERE [ZIMBRA]:
      // * Extend dataset coverage for contacts/tasks and project records into CRM domain entities.
      // * Current pipeline persists unread emails + upcoming calls only.
      return [
        {
          recordType: MAIL_DATASET_TYPES.unreadEmails,
          records: emails.map((item) => item as unknown as Record<string, unknown>),
          externalIdField: 'id',
        },
        {
          recordType: MAIL_DATASET_TYPES.upcomingCalls,
          records: calls.map((item) => item as unknown as Record<string, unknown>),
          externalIdField: 'id',
        },
      ];
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Sync failed';
      throw error;
    }
  }

  async getUnreadEmails(since?: Date): Promise<
    Array<{
      id: string;
      subject: string;
      from: string;
      receivedAt: string;
      link?: string;
    }>
  > {
    if (!this.isConfigured()) {
      return [];
    }

    if (this.config.mockNotifications) {
      return this.mockEmails;
    }

    try {
      await this.authenticate();

      const query = since
        ? `is:unread after:${this.formatZimbraDate(since)}`
        : 'is:unread';

      const response = await this.httpClient.post<unknown>(
        `${this.config.baseUrl}/service/soap/SearchRequest`,
        {
          Body: {
            SearchRequest: {
              _jsns: 'urn:zimbraMail',
              query,
              types: 'message',
              limit: 100,
              offset: 0,
            },
          },
        },
        {
          headers: this.getAuthHeaders(),
        },
      );

      const data = SafeJsonCodec.parseObject(response.data);
      const body = this.readObject(data, 'Body');
      const searchResponse = this.readObject(body, 'SearchResponse');
      const messages = this.readArray(searchResponse, 'm');

      return messages.map((message) => {
        const raw = this.asObject(message);
        const emailEntry = this.firstObject(this.readArray(raw, 'e'));
        return {
          id: this.readString(raw, 'id') ?? 'unknown',
          subject: this.readString(raw, 'su') ?? '(no subject)',
          from: this.extractEmail(emailEntry),
          receivedAt: this.readEpochMillisAsIso(this.readString(raw, 'd')),
          link: `${this.config.baseUrl}/modern/email/${this.readString(raw, 'id') ?? ''}`,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch unread emails: ${error instanceof Error ? error.message : SafeJsonCodec.stringify(error)}`,
      );
      return [];
    }
  }

  async getUpcomingCalls(withinMinutes = MAIL_DEFAULTS.zimbraSyncWindowMinutes): Promise<
    Array<{
      id: string;
      title: string;
      startAt: string;
      endAt: string;
      organizer?: string;
      link?: string;
    }>
  > {
    if (!this.isConfigured()) {
      return [];
    }

    if (this.config.mockNotifications) {
      const cutoff = Date.now() + withinMinutes * 60 * 1000;
      return this.mockCalls.filter(
        (call) => new Date(call.startAt).getTime() <= cutoff,
      );
    }

    try {
      await this.authenticate();

      const startTime = Date.now();
      const endTime = startTime + withinMinutes * 60 * 1000;

      const response = await this.httpClient.post<unknown>(
        `${this.config.baseUrl}/service/soap/SearchRequest`,
        {
          Body: {
            SearchRequest: {
              _jsns: 'urn:zimbraMail',
              calExpandInstStart: startTime,
              calExpandInstEnd: endTime,
              types: 'appointment',
              limit: 50,
            },
          },
        },
        {
          headers: this.getAuthHeaders(),
        },
      );

      const data = SafeJsonCodec.parseObject(response.data);
      const body = this.readObject(data, 'Body');
      const searchResponse = this.readObject(body, 'SearchResponse');
      const appointments = this.readArray(searchResponse, 'appt');

      return appointments.map((appointment) => {
        const raw = this.asObject(appointment);
        const instance = this.firstObject(this.readArray(raw, 'inst'));
        const baseStart = this.readString(instance, 's') ?? this.readString(raw, 'd');
        const startMs = this.readEpochMillis(baseStart);
        const durationMs = this.readEpochMillis(this.readString(raw, 'dur'));

        return {
          id: this.readString(raw, 'id') ?? 'unknown',
          title: this.readString(raw, 'name') ?? '(no title)',
          startAt: new Date(startMs).toISOString(),
          endAt: new Date(startMs + (durationMs || 3600000)).toISOString(),
          organizer: this.extractEmail(this.readObject(raw, 'or')),
          link: `${this.config.baseUrl}/modern/calendar/view/${this.readString(raw, 'id') ?? ''}`,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch upcoming calls: ${error instanceof Error ? error.message : SafeJsonCodec.stringify(error)}`,
      );
      return [];
    }
  }

  private extractHost(baseUrl?: string): string | undefined {
    const normalized = IntegrationValueSanitizer.normalizeUrl(baseUrl);
    if (!normalized) {
      return undefined;
    }

    try {
      return new URL(normalized).hostname;
    } catch {
      return undefined;
    }
  }

  private async authenticate(): Promise<void> {
    if (this.authToken) {
      return;
    }

    if (!this.config.baseUrl || !this.config.username || !this.config.password) {
      throw new Error('Zimbra credentials not configured');
    }

    try {
      const response = await this.httpClient.post<unknown>(
        `${this.config.baseUrl}/service/soap/AuthRequest`,
        {
          Body: {
            AuthRequest: {
              _jsns: 'urn:zimbraAccount',
              account: {
                _content: this.config.username,
                by: 'name',
              },
              password: {
                _content: this.config.password,
              },
            },
          },
        },
      );

      const data = SafeJsonCodec.parseObject(response.data);
      const body = this.readObject(data, 'Body');
      const authResponse = this.readObject(body, 'AuthResponse');
      const tokenEntry = this.firstObject(this.readArray(authResponse, 'authToken'));
      this.authToken = this.readString(tokenEntry, '_content');

      if (!this.authToken) {
        throw new Error('No auth token received from Zimbra');
      }

      this.logger.log('Zimbra authentication successful');
    } catch (error) {
      this.logger.error(
        `Zimbra authentication failed: ${error instanceof Error ? error.message : SafeJsonCodec.stringify(error)}`,
      );
      throw error;
    }
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.authToken) {
      throw new Error('Not authenticated with Zimbra');
    }

    return {
      Cookie: `ZM_AUTH_TOKEN=${this.authToken}`,
    };
  }

  private async getAccountInfo(): Promise<{ name: string; id: string }> {
    const response = await this.httpClient.post<unknown>(
      `${this.config.baseUrl}/service/soap/GetInfoRequest`,
      {
        Body: {
          GetInfoRequest: {
            _jsns: 'urn:zimbraAccount',
          },
        },
      },
      {
        headers: this.getAuthHeaders(),
      },
    );

    const data = SafeJsonCodec.parseObject(response.data);
    const body = this.readObject(data, 'Body');
    const info = this.readObject(body, 'GetInfoResponse');
    const nameEntry = this.firstObject(this.readArray(info, 'name'));

    return {
      name: this.readString(nameEntry, '_content') ?? 'Unknown',
      id: this.readString(info, 'id') ?? 'unknown',
    };
  }

  private formatZimbraDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  private extractEmail(emailObject: Record<string, unknown> | undefined): string {
    if (!emailObject) {
      return 'unknown@example.com';
    }
    return this.readString(emailObject, 'a')
      ?? this.readString(emailObject, 'd')
      ?? 'unknown@example.com';
  }

  private readEpochMillisAsIso(value: string | undefined): string {
    const millis = this.readEpochMillis(value);
    return new Date(millis).toISOString();
  }

  private readEpochMillis(value: string | undefined): number {
    if (!value) {
      return Date.now();
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Date.now();
  }

  private readObject(
    input: Record<string, unknown>,
    key: string,
  ): Record<string, unknown> {
    return this.asObject(input[key]);
  }

  private readArray(
    input: Record<string, unknown>,
    key: string,
  ): unknown[] {
    const value = input[key];
    return Array.isArray(value) ? value : [];
  }

  private readString(
    input: Record<string, unknown> | undefined,
    key: string,
  ): string | undefined {
    if (!input) {
      return undefined;
    }
    const value = input[key];
    return typeof value === 'string' ? value : undefined;
  }

  private asObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private firstObject(items: unknown[]): Record<string, unknown> | undefined {
    if (!items.length) {
      return undefined;
    }
    const first = items[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      return first as Record<string, unknown>;
    }
    return undefined;
  }
}
