import { Injectable, Logger } from '@nestjs/common';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';
import type {
  IntegrationAdapter,
  IntegrationConfig,
  IntegrationStatus,
} from '../types';

/**
 * Microsoft Outlook Integration Adapter
 *
 * Adapter for integrating with Microsoft 365 via Microsoft Graph API.
 * Supports email, calendar, contacts, and tasks (To Do).
 *
 * @remarks
 * Uses Microsoft Graph API with OAuth2 client credentials flow.
 *
 * @see https://learn.microsoft.com/en-us/graph/api/overview
 */
@Injectable()
export class OutlookAdapter implements IntegrationAdapter {
  private readonly logger = new Logger(OutlookAdapter.name);
  private config: IntegrationConfig = {};
  private msalClient?: ConfidentialClientApplication;
  private graphClient?: Client;
  private accessToken?: string;
  private tokenExpiry?: Date;

  /** Microsoft Graph API base URL */
  private readonly graphBaseUrl = 'https://graph.microsoft.com/v1.0';

  getStatus(): Promise<IntegrationStatus> {
    return Promise.resolve({
      id: 'outlook',
      name: 'Microsoft Outlook',
      type: 'Email/Microsoft 365',
      status: this.config.clientId ? 'disconnected' : 'disconnected',
      configured: !!this.config.clientId && !!this.config.tenantId,
      features: [
        'Email sync (send/receive)',
        'Calendar events',
        'Contact sync',
        'Microsoft To Do',
        'Teams integration potential',
      ],
    });
  }

  async testConnection(): Promise<boolean> {
    this.logger.log('Testing Microsoft Outlook connection...');

    if (!this.config.clientId || !this.config.tenantId) {
      this.logger.warn('Microsoft Outlook not configured');
      return false;
    }

    try {
      await this.authenticate();
      const client = await this.getGraphClient();
      const user = await client.api('/me').get();
      this.logger.log(
        `Outlook connection successful: ${user.displayName || user.userPrincipalName}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Outlook connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  configure(config: Partial<IntegrationConfig>): Promise<void> {
    this.logger.log('Updating Microsoft Outlook configuration');
    this.config = { ...this.config, ...config };
    this.msalClient = undefined;
    this.graphClient = undefined;
    this.accessToken = undefined;
    this.tokenExpiry = undefined;
    return Promise.resolve();
  }

  isConfigured(): boolean {
    return !!(
      this.config.clientId &&
      this.config.tenantId &&
      this.config.clientSecret
    );
  }

  getSmtpProfile(): {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    pass?: string;
    from?: string;
    profile: 'outlook' | 'default';
  } | null {
    const host = this.config.smtpHost || 'smtp.office365.com';
    const port = this.config.smtpPort || 587;
    const secure = this.config.smtpSecure ?? false;

    if (!host || !port) {
      return null;
    }

    return {
      host,
      port,
      secure,
      user: this.config.smtpUser,
      pass: this.config.smtpPass,
      from: this.config.smtpFrom,
      profile: this.config.smtpProfile === 'default' ? 'default' : 'outlook',
    };
  }

  sync(): Promise<void> {
    this.logger.log('Microsoft Outlook sync triggered (manual)');
    return Promise.resolve();
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

      let query = client
        .api('/me/mailFolders/inbox/messages')
        .select('id,subject,from,receivedDateTime,hasAttachments,webLink')
        .filter('isRead eq false')
        .orderby('receivedDateTime DESC')
        .top(100);

      if (since) {
        const sinceStr = since.toISOString();
        query = query.filter(
          `isRead eq false and receivedDateTime ge ${sinceStr}`,
        );
      }

      const response = await query.get();
      const messages = response.value || [];

      return messages.map((msg: any) => ({
        id: msg.id,
        subject: msg.subject || '(no subject)',
        from: msg.from?.emailAddress?.address || 'unknown@example.com',
        receivedAt: msg.receivedDateTime,
        link: msg.webLink,
        hasAttachments: msg.hasAttachments,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch unread emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  async getUpcomingEvents(withinMinutes = 60): Promise<
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
      const startTime = new Date();
      const endTime = new Date(Date.now() + withinMinutes * 60 * 1000);

      const response = await client
        .api('/me/calendarView')
        .query({
          startDateTime: startTime.toISOString(),
          endDateTime: endTime.toISOString(),
        })
        .select('id,subject,start,end,organizer,webLink,location')
        .orderby('start/dateTime')
        .top(50)
        .get();

      const events = response.value || [];

      return events.map((event: any) => ({
        id: event.id,
        subject: event.subject || '(no subject)',
        startAt: event.start.dateTime,
        endAt: event.end.dateTime,
        organizer: event.organizer?.emailAddress?.address,
        link: event.webLink,
        location: event.location?.displayName,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch upcoming events: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      const listsResponse = await client
        .api('/me/todo/lists')
        .filter("wellknownListName eq 'defaultList'")
        .get();

      const lists = listsResponse.value || [];
      if (lists.length === 0) {
        return [];
      }

      const defaultListId = lists[0].id;

      const tasksResponse = await client
        .api(`/me/todo/lists/${defaultListId}/tasks`)
        .filter("status ne 'completed'")
        .select('id,title,dueDateTime,status,importance')
        .orderby('dueDateTime')
        .top(50)
        .get();

      const tasks = tasksResponse.value || [];

      return tasks.map((task: any) => ({
        id: task.id,
        title: task.title || '(no title)',
        dueDate: task.dueDateTime?.dateTime,
        status: task.status,
        importance: task.importance,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch tasks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  // ===========================================================================
  // MICROSOFT GRAPH API HELPERS
  // ===========================================================================

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

      if (!response || !response.accessToken) {
        throw new Error('No access token received from Microsoft');
      }

      this.accessToken = response.accessToken;
      this.tokenExpiry = response.expiresOn || new Date(Date.now() + 3600000);

      this.logger.log('Microsoft Graph authentication successful');
    } catch (error) {
      this.logger.error(
        `Microsoft Graph authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
          done(null, this.accessToken!);
        },
      });
    }

    return this.graphClient;
  }
}
