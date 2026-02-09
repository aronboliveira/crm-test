import { Injectable, Logger } from '@nestjs/common';
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
 * Portfolio demonstration - returns mock data.
 * In production, would use Microsoft Graph API with OAuth2.
 *
 * @see https://learn.microsoft.com/en-us/graph/api/overview
 */
@Injectable()
export class OutlookAdapter implements IntegrationAdapter {
  private readonly logger = new Logger(OutlookAdapter.name);
  private config: IntegrationConfig = {};

  /** Microsoft Graph API base URL */
  private readonly graphBaseUrl = 'https://graph.microsoft.com/v1.0';

  /**
   * Returns current status of the Outlook integration.
   */
  async getStatus(): Promise<IntegrationStatus> {
    return {
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
    };
  }

  /**
   * Tests connection to Microsoft Graph API.
   */
  async testConnection(): Promise<boolean> {
    this.logger.log('Testing Microsoft Outlook connection...');

    if (!this.config.clientId || !this.config.tenantId) {
      this.logger.warn('Microsoft Outlook not configured');
      return false;
    }

    // Portfolio demo - simulate connection test
    // In production: OAuth2 flow + GET /me endpoint
    this.logger.log(
      'Outlook connection test (mock): would call /me endpoint',
    );
    return false;
  }

  /**
   * Updates Outlook/Microsoft configuration.
   */
  async configure(config: Partial<IntegrationConfig>): Promise<void> {
    this.logger.log('Updating Microsoft Outlook configuration');
    this.config = { ...this.config, ...config };
  }

  /**
   * Syncs data with Microsoft 365.
   *
   * @remarks
   * Would sync via Graph API:
   * - /me/messages - Email messages
   * - /me/calendar/events - Calendar events
   * - /me/contacts - Contacts
   * - /me/todo/lists - To Do tasks
   */
  async sync(): Promise<void> {
    this.logger.log('Microsoft Outlook sync triggered (mock)');
    // Implementation would:
    // 1. Authenticate via MSAL
    // 2. Fetch emails: GET /me/messages?$top=50
    // 3. Fetch calendar: GET /me/calendar/events
    // 4. Fetch contacts: GET /me/contacts
    // 5. Fetch tasks: GET /me/todo/lists/{id}/tasks
  }

  /**
   * Gets the OAuth2 authorization URL for user consent.
   *
   * @returns Authorization URL to redirect user
   */
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

    // In production, this would construct proper OAuth2 URL
    return `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize?client_id=${this.config.clientId}&scope=${encodeURIComponent(scopes)}&response_type=code`;
  }
}
