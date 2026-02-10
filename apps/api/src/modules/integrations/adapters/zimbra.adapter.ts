import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import type {
  IntegrationAdapter,
  IntegrationConfig,
  IntegrationStatus,
} from '../types';

/**
 * Zimbra Mail Integration Adapter
 *
 * Adapter for integrating with Zimbra Collaboration Suite.
 * Supports email sync, calendar, contacts, and tasks.
 *
 * @remarks
 * Uses Zimbra SOAP API over HTTP.
 *
 * @see https://wiki.zimbra.com/wiki/Zimbra_REST_API_Reference
 */
@Injectable()
export class ZimbraAdapter implements IntegrationAdapter {
  private readonly logger = new Logger(ZimbraAdapter.name);
  private config: IntegrationConfig = {};
  private httpClient: ReturnType<typeof axios.create>;
  private authToken?: string;

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

  getStatus(): Promise<IntegrationStatus> {
    return Promise.resolve({
      id: 'zimbra',
      name: 'Zimbra Mail',
      type: 'Email/Collaboration',
      status: this.config.baseUrl ? 'disconnected' : 'disconnected',
      configured:
        !!this.config.baseUrl &&
        (!!this.config.apiKey || !!this.config.username),
      features: [
        'Email sync (send/receive)',
        'Calendar integration',
        'Contact sync',
        'Task sync',
        'Attachment handling',
      ],
    });
  }

  async testConnection(): Promise<boolean> {
    this.logger.log('Testing Zimbra connection...');

    if (!this.config.baseUrl) {
      this.logger.warn('Zimbra not configured');
      return false;
    }

    try {
      await this.authenticate();
      const info = await this.getAccountInfo();
      this.logger.log(
        `Zimbra connection successful: ${info.name || 'Unknown'}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Zimbra connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  configure(config: Partial<IntegrationConfig>): Promise<void> {
    this.logger.log('Updating Zimbra configuration');
    this.config = { ...this.config, ...config };
    this.authToken = undefined;
    return Promise.resolve();
  }

  getSmtpProfile(): {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    pass?: string;
    from?: string;
    profile: 'zimbra' | 'default';
  } | null {
    if (!this.config.baseUrl && !this.config.smtpHost) {
      return null;
    }

    const baseHost =
      this.config.smtpHost || this.extractHost(this.config.baseUrl);
    if (!baseHost) {
      return null;
    }

    return {
      host: baseHost,
      port: this.config.smtpPort || 587,
      secure: this.config.smtpSecure ?? false,
      user: this.config.smtpUser,
      pass: this.config.smtpPass,
      from: this.config.smtpFrom,
      profile: this.config.smtpProfile === 'default' ? 'default' : 'zimbra',
    };
  }

  isConfigured(): boolean {
    return !!(
      this.config.baseUrl &&
      (this.config.apiKey || this.config.username)
    );
  }

  sync(): Promise<void> {
    this.logger.log('Zimbra sync triggered (manual)');
    return Promise.resolve();
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

    if ((this.config as { mockNotifications?: boolean }).mockNotifications) {
      return this.mockEmails;
    }

    try {
      await this.authenticate();

      const query = since
        ? `is:unread after:${this.formatZimbraDate(since)}`
        : 'is:unread';

      const response = await this.httpClient.post<Record<string, any>>(
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

      const messages = response.data.Body?.SearchResponse?.m || [];
      return messages.map((msg: any) => ({
        id: msg.id,
        subject: msg.su || '(no subject)',
        from: this.extractEmail(msg.e?.[0]),
        receivedAt: new Date(parseInt(msg.d)).toISOString(),
        link: `${this.config.baseUrl}/modern/email/${msg.id}`,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch unread emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  async getUpcomingCalls(withinMinutes = 60): Promise<
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

    if ((this.config as { mockNotifications?: boolean }).mockNotifications) {
      const cutoff = Date.now() + withinMinutes * 60 * 1000;
      return this.mockCalls.filter(
        (call) => new Date(call.startAt).getTime() <= cutoff,
      );
    }

    try {
      await this.authenticate();

      const startTime = Date.now();
      const endTime = startTime + withinMinutes * 60 * 1000;

      const response = await this.httpClient.post<Record<string, any>>(
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

      const appointments = response.data.Body?.SearchResponse?.appt || [];
      return appointments.map((appt: any) => {
        const inst = appt.inst?.[0];
        return {
          id: appt.id,
          title: appt.name || '(no title)',
          startAt: new Date(parseInt(inst?.s || appt.d)).toISOString(),
          endAt: new Date(
            parseInt(inst?.s || appt.d) + (appt.dur || 3600000),
          ).toISOString(),
          organizer: this.extractEmail(appt.or),
          link: `${this.config.baseUrl}/modern/calendar/view/${appt.id}`,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch upcoming calls: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  private extractHost(baseUrl?: string): string | null {
    if (!baseUrl) {
      return null;
    }

    try {
      const url = new URL(baseUrl);
      return url.hostname;
    } catch {
      return null;
    }
  }

  // ===========================================================================
  // ZIMBRA API HELPERS
  // ===========================================================================

  private async authenticate(): Promise<void> {
    if (this.authToken) {
      return;
    }

    if (!this.config.username || !this.config.password) {
      throw new Error('Zimbra credentials not configured');
    }

    try {
      const response = await this.httpClient.post<Record<string, any>>(
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

      this.authToken =
        response.data.Body?.AuthResponse?.authToken?.[0]?._content;
      if (!this.authToken) {
        throw new Error('No auth token received from Zimbra');
      }

      this.logger.log('Zimbra authentication successful');
    } catch (error) {
      this.logger.error(
        `Zimbra authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    const response = await this.httpClient.post<Record<string, any>>(
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

    const info = response.data.Body?.GetInfoResponse;
    return {
      name: info?.name?.[0]?._content || 'Unknown',
      id: info?.id || 'unknown',
    };
  }

  private formatZimbraDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  private extractEmail(emailObj: any): string {
    if (!emailObj) return 'unknown@example.com';
    return emailObj.a || emailObj.d || 'unknown@example.com';
  }
}
