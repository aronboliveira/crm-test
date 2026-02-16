import { Injectable, Logger } from '@nestjs/common';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';
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
 * Microsoft Outlook Integration Adapter
 *
 * Adapter for integrating with Microsoft 365 via Microsoft Graph API.
 */
@Injectable()
export class OutlookAdapter implements IntegrationAdapter {
  private readonly logger = new Logger(OutlookAdapter.name);
  private config: IntegrationConfig = {};
  private msalClient?: ConfidentialClientApplication;
  private graphClient?: Client;
  private accessToken?: string;
  private tokenExpiry?: Date;
  private isConnected = false;
  private lastSyncAt?: string;
  private lastError?: string;

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
      id: 'outlook',
      name: 'Microsoft Outlook',
      type: 'Email/Microsoft 365',
      status,
      configured,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
      features: [
        'Email sync (send/receive)',
        'Calendar events',
        'Contact sync',
        'Microsoft To Do',
        'Teams integration potential',
      ],
    };
  }

  async testConnection(): Promise<boolean> {
    this.logger.log('Testing Microsoft Outlook connection...');

    if (!this.isConfigured()) {
      this.lastError = 'Integration not configured';
      this.isConnected = false;
      return false;
    }

    try {
      await this.authenticate();
      this.isConnected = true;
      this.lastError = undefined;

      // Best-effort probe to validate token usability without failing on tenant-specific RBAC.
      await this.probeGraph().catch((error: unknown) => {
        this.logger.warn(
          `Graph probe failed after token acquisition: ${error instanceof Error ? error.message : SafeJsonCodec.stringify(error)}`,
        );
      });

      this.logger.log('Outlook connection successful');
      return true;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.isConnected = false;
      this.logger.error(`Outlook connection failed: ${this.lastError}`);
      return false;
    }
  }

  async configure(config: Partial<IntegrationConfig>): Promise<void> {
    this.logger.log('Updating Microsoft Outlook configuration');
    const merged = { ...this.config, ...config };

    this.config = {
      ...merged,
      tenantId: IntegrationValueSanitizer.normalizeString(merged.tenantId),
      clientId: IntegrationValueSanitizer.normalizeString(merged.clientId),
      clientSecret: IntegrationValueSanitizer.normalizeString(
        merged.clientSecret,
      ),
      smtpHost: IntegrationValueSanitizer.normalizeString(merged.smtpHost),
      smtpPort: IntegrationValueSanitizer.normalizePort(merged.smtpPort),
      smtpSecure:
        IntegrationValueSanitizer.normalizeBoolean(merged.smtpSecure) ??
        undefined,
      smtpUser: IntegrationValueSanitizer.normalizeString(merged.smtpUser),
      smtpPass: IntegrationValueSanitizer.normalizeString(merged.smtpPass),
      smtpFrom: IntegrationValueSanitizer.normalizeString(merged.smtpFrom),
      smtpProfile: merged.smtpProfile,
      mockNotifications:
        IntegrationValueSanitizer.normalizeBoolean(merged.mockNotifications) ??
        false,
    };

    this.msalClient = undefined;
    this.graphClient = undefined;
    this.accessToken = undefined;
    this.tokenExpiry = undefined;
    this.isConnected = false;
    this.lastError = undefined;
  }

  isConfigured(): boolean {
    return Boolean(
      IntegrationValueSanitizer.hasString(this.config.clientId) &&
      IntegrationValueSanitizer.hasString(this.config.tenantId) &&
      IntegrationValueSanitizer.hasString(this.config.clientSecret),
    );
  }

  getSmtpProfile(): MailSmtpProfile | null {
    return MailSmtpProfileFactory.fromConfig(this.config, {
      fallbackHost: 'smtp.office365.com',
      fallbackPort: MAIL_DEFAULTS.smtpPort,
      fallbackSecure: MAIL_DEFAULTS.smtpSecure,
      profile: 'outlook',
    });
  }

  async sync(): Promise<void> {
    await this.pullSyncSnapshot();
  }

  async pullSyncSnapshot(): Promise<IntegrationSyncDataset[]> {
    if (!this.isConfigured()) {
      throw new Error('Microsoft Outlook integration not configured');
    }

    try {
      const [emails, events, tasks] = await Promise.all([
        this.getUnreadEmails(),
        this.getUpcomingEvents(MAIL_DEFAULTS.outlookSyncWindowMinutes),
        this.getTasks(),
      ]);

      this.lastSyncAt = new Date().toISOString();
      this.lastError = undefined;

      // * FINISH INTEGRATION HERE [OUTLOOK]:
      // * Add mailbox/user scoping strategy and delta/webhook sync for large tenants.
      // * Current flow reads first discoverable mailbox via Graph polling.
      return [
        {
          recordType: MAIL_DATASET_TYPES.unreadEmails,
          records: emails.map(
            (item) => item as unknown as Record<string, unknown>,
          ),
          externalIdField: 'id',
        },
        {
          recordType: MAIL_DATASET_TYPES.upcomingEvents,
          records: events.map(
            (item) => item as unknown as Record<string, unknown>,
          ),
          externalIdField: 'id',
        },
        {
          recordType: MAIL_DATASET_TYPES.tasks,
          records: tasks.map(
            (item) => item as unknown as Record<string, unknown>,
          ),
          externalIdField: 'id',
        },
      ];
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Sync failed';
      throw error;
    }
  }

  getAuthorizationUrl(): string {
    if (!this.config.clientId || !this.config.tenantId) {
      throw new Error('Client ID and Tenant ID required');
    }

    const scopes = [
      'User.Read',
      'Mail.Read',
      'Mail.Send',
      'Calendars.ReadWrite',
      'Contacts.ReadWrite',
      'Tasks.ReadWrite',
    ].join(' ');

    return `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize?client_id=${this.config.clientId}&scope=${encodeURIComponent(scopes)}&response_type=code`;
  }

  async getUnreadEmails(since?: Date): Promise<
    Array<{
      id: string;
      subject: string;
      from: string;
      receivedAt: string;
      link?: string;
      hasAttachments?: boolean;
    }>
  > {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const client = await this.getGraphClient();

      const query = client
        .api('/users')
        .top(1)
        .select('id,mail,userPrincipalName');
      const usersResponse = await query.get();
      const userId = this.extractUserId(usersResponse);
      if (!userId) {
        return [];
      }

      let messagesQuery = client
        .api(`/users/${encodeURIComponent(userId)}/mailFolders/inbox/messages`)
        .select('id,subject,from,receivedDateTime,hasAttachments,webLink')
        .filter('isRead eq false')
        .orderby('receivedDateTime DESC')
        .top(100);

      if (since) {
        messagesQuery = messagesQuery.filter(
          `isRead eq false and receivedDateTime ge ${since.toISOString()}`,
        );
      }

      const response = await messagesQuery.get();
      const messages = this.readArray(response, 'value');

      return messages.map((message) => {
        const raw = this.asObject(message);
        const from = this.readNestedString(raw, [
          'from',
          'emailAddress',
          'address',
        ]);
        return {
          id: this.readString(raw, 'id') ?? 'unknown',
          subject: this.readString(raw, 'subject') ?? '(no subject)',
          from: from ?? 'unknown@example.com',
          receivedAt:
            this.readString(raw, 'receivedDateTime') ??
            new Date().toISOString(),
          link: this.readString(raw, 'webLink'),
          hasAttachments: Boolean(raw.hasAttachments),
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch unread emails: ${error instanceof Error ? error.message : SafeJsonCodec.stringify(error)}`,
      );
      return [];
    }
  }

  async getUpcomingEvents(
    withinMinutes = MAIL_DEFAULTS.outlookSyncWindowMinutes,
  ): Promise<
    Array<{
      id: string;
      subject: string;
      startAt: string;
      endAt: string;
      organizer?: string;
      link?: string;
      location?: string;
    }>
  > {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const client = await this.getGraphClient();
      const userId = await this.resolveGraphUserId(client);
      if (!userId) {
        return [];
      }

      const startTime = new Date();
      const endTime = new Date(Date.now() + withinMinutes * 60 * 1000);

      const response = await client
        .api(`/users/${encodeURIComponent(userId)}/calendarView`)
        .query({
          startDateTime: startTime.toISOString(),
          endDateTime: endTime.toISOString(),
        })
        .select('id,subject,start,end,organizer,webLink,location')
        .orderby('start/dateTime')
        .top(50)
        .get();

      const events = this.readArray(response, 'value');

      return events.map((event) => {
        const raw = this.asObject(event);
        return {
          id: this.readString(raw, 'id') ?? 'unknown',
          subject: this.readString(raw, 'subject') ?? '(no subject)',
          startAt:
            this.readNestedString(raw, ['start', 'dateTime']) ??
            new Date().toISOString(),
          endAt:
            this.readNestedString(raw, ['end', 'dateTime']) ??
            new Date().toISOString(),
          organizer: this.readNestedString(raw, [
            'organizer',
            'emailAddress',
            'address',
          ]),
          link: this.readString(raw, 'webLink'),
          location: this.readNestedString(raw, ['location', 'displayName']),
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch upcoming events: ${error instanceof Error ? error.message : SafeJsonCodec.stringify(error)}`,
      );
      return [];
    }
  }

  async getTasks(): Promise<
    Array<{
      id: string;
      title: string;
      dueDate?: string;
      status: string;
      importance: string;
    }>
  > {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const client = await this.getGraphClient();
      const userId = await this.resolveGraphUserId(client);
      if (!userId) {
        return [];
      }

      const listsResponse = await client
        .api(`/users/${encodeURIComponent(userId)}/todo/lists`)
        .filter("wellknownListName eq 'defaultList'")
        .get();

      const lists = this.readArray(listsResponse, 'value');
      if (!lists.length) {
        return [];
      }

      const defaultListId = this.readString(this.asObject(lists[0]), 'id');
      if (!defaultListId) {
        return [];
      }

      const tasksResponse = await client
        .api(
          `/users/${encodeURIComponent(userId)}/todo/lists/${encodeURIComponent(defaultListId)}/tasks`,
        )
        .filter("status ne 'completed'")
        .select('id,title,dueDateTime,status,importance')
        .orderby('dueDateTime/dateTime')
        .top(50)
        .get();

      const tasks = this.readArray(tasksResponse, 'value');

      return tasks.map((task) => {
        const raw = this.asObject(task);
        return {
          id: this.readString(raw, 'id') ?? 'unknown',
          title: this.readString(raw, 'title') ?? '(no title)',
          dueDate: this.readNestedString(raw, ['dueDateTime', 'dateTime']),
          status: this.readString(raw, 'status') ?? 'unknown',
          importance: this.readString(raw, 'importance') ?? 'normal',
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch tasks: ${error instanceof Error ? error.message : SafeJsonCodec.stringify(error)}`,
      );
      return [];
    }
  }

  private async authenticate(): Promise<void> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return;
    }

    if (
      !this.config.clientId ||
      !this.config.tenantId ||
      !this.config.clientSecret
    ) {
      throw new Error('Microsoft Outlook credentials not configured');
    }

    try {
      if (!this.msalClient) {
        this.msalClient = new ConfidentialClientApplication({
          auth: {
            clientId: this.config.clientId,
            authority: `https://login.microsoftonline.com/${this.config.tenantId}`,
            clientSecret: this.config.clientSecret,
          },
        });
      }

      const response = await this.msalClient.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default'],
      });

      if (!response?.accessToken) {
        throw new Error('No access token received from Microsoft');
      }

      this.accessToken = response.accessToken;
      this.tokenExpiry = response.expiresOn || new Date(Date.now() + 3600000);
    } catch (error) {
      this.logger.error(
        `Microsoft Graph authentication failed: ${error instanceof Error ? error.message : SafeJsonCodec.stringify(error)}`,
      );
      throw error;
    }
  }

  private async getGraphClient(): Promise<Client> {
    if (!this.graphClient || !this.accessToken) {
      await this.authenticate();
    }

    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    if (!this.graphClient) {
      this.graphClient = Client.init({
        authProvider: (done) => {
          done(null, this.accessToken ?? '');
        },
      });
    }

    return this.graphClient;
  }

  private async probeGraph(): Promise<void> {
    const client = await this.getGraphClient();
    await client.api('/organization').top(1).get();
  }

  private async resolveGraphUserId(
    client: Client,
  ): Promise<string | undefined> {
    const response = await client
      .api('/users')
      .top(1)
      .select('id,mail,userPrincipalName')
      .get();
    return this.extractUserId(response);
  }

  private extractUserId(response: unknown): string | undefined {
    const values = this.readArray(response, 'value');
    if (!values.length) {
      return undefined;
    }
    const user = this.asObject(values[0]);
    return this.readString(user, 'id');
  }

  private readObject(input: unknown, key?: string): Record<string, unknown> {
    const object =
      input && typeof input === 'object' && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : {};
    if (!key) {
      return object;
    }
    const value = object[key];
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private asObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private readArray(input: unknown, key: string): unknown[] {
    const object = this.readObject(input);
    const value = object[key];
    return Array.isArray(value) ? value : [];
  }

  private readString(
    input: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = input[key];
    return typeof value === 'string' ? value : undefined;
  }

  private readNestedString(
    input: Record<string, unknown>,
    path: string[],
  ): string | undefined {
    let cursor: unknown = input;
    for (const segment of path) {
      if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) {
        return undefined;
      }
      cursor = (cursor as Record<string, unknown>)[segment];
    }
    return typeof cursor === 'string' ? cursor : undefined;
  }
}
