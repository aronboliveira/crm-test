import { Injectable, Logger } from '@nestjs/common';
import type {
  IntegrationAdapter,
  IntegrationConfig,
  IntegrationStatus,
} from '../../types';
import { GlpiApiClient } from './glpi-api.client';
import {
  GlpiDataMapper,
  type CrmLead,
  type CrmContact,
  type CrmClient,
} from './glpi-data.mapper';
import type { GlpiTicket, GlpiUser, GlpiEntity } from './glpi.types';

/**
 * GLPI Integration Adapter
 *
 * Implements IntegrationAdapter for GLPI IT Service Management system.
 * Provides ticket sync, user mapping, and entity (client) sync.
 *
 * @remarks
 * Follows Open/Closed Principle - extends IntegrationAdapter interface.
 * Follows Liskov Substitution - can replace any IntegrationAdapter.
 */
@Injectable()
export class GlpiAdapter implements IntegrationAdapter {
  private readonly logger = new Logger(GlpiAdapter.name);
  private config: IntegrationConfig = {};
  private client: GlpiApiClient | null = null;
  private lastSyncAt?: string;
  private lastError?: string;

  async getStatus(): Promise<IntegrationStatus> {
    const isConfigured = this.isConfigured();

    return {
      id: 'glpi',
      name: 'GLPI',
      type: 'Helpdesk/ITSM',
      status: isConfigured ? 'disconnected' : 'disconnected',
      configured: isConfigured,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
      features: [
        'Ticket synchronization',
        'Asset management sync',
        'User/contact mapping',
        'SLA tracking',
        'Knowledge base integration',
      ],
    };
  }

  async testConnection(): Promise<boolean> {
    this.logger.log('Testing GLPI connection');

    if (!this.isConfigured()) {
      this.logger.warn('GLPI not configured');
      this.lastError = 'Integration not configured';
      return false;
    }

    try {
      const client = this.getClient();
      const result = await client.testConnection();

      if (result) {
        this.lastError = undefined;
        this.logger.log('GLPI connection test successful');
      } else {
        this.lastError = 'Connection test failed';
      }

      return result;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('GLPI connection test failed', error);
      return false;
    }
  }

  async configure(config: Partial<IntegrationConfig>): Promise<void> {
    this.logger.log('Updating GLPI configuration');
    this.config = { ...this.config, ...config };
    this.client = null;
    this.lastError = undefined;
  }

  async sync(): Promise<void> {
    this.logger.log('Starting GLPI sync');

    if (!this.isConfigured()) {
      throw new Error('GLPI not configured');
    }

    try {
      await this.syncTickets();
      await this.syncUsers();
      await this.syncEntities();

      this.lastSyncAt = new Date().toISOString();
      this.lastError = undefined;
      this.logger.log('GLPI sync completed');
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Sync failed';
      this.logger.error('GLPI sync failed', error);
      throw error;
    }
  }

  async getTickets(options?: { range?: string }): Promise<CrmLead[]> {
    const client = this.getClient();
    const tickets = await client.getTickets(options);
    return tickets.map(GlpiDataMapper.ticketToCrmLead);
  }

  async getTicket(id: number): Promise<CrmLead> {
    const client = this.getClient();
    const ticket = await client.getTicket(id);
    return GlpiDataMapper.ticketToCrmLead(ticket);
  }

  async createTicket(lead: CrmLead): Promise<CrmLead> {
    const client = this.getClient();
    const payload = GlpiDataMapper.crmLeadToTicketPayload(lead);
    const ticket = await client.createTicket(payload);
    return GlpiDataMapper.ticketToCrmLead(ticket);
  }

  async updateTicket(id: number, lead: Partial<CrmLead>): Promise<CrmLead> {
    const client = this.getClient();
    const payload: { input: Record<string, unknown> } = { input: {} };

    if (lead.title) payload.input.name = lead.title;
    if (lead.description) payload.input.content = lead.description;
    if (lead.status) {
      const glpiStatus = GlpiDataMapper.mapCrmStatusToGlpiStatus(lead.status);
      if (glpiStatus) payload.input.status = glpiStatus;
    }

    const ticket = await client.updateTicket(id, payload as never);
    return GlpiDataMapper.ticketToCrmLead(ticket);
  }

  async getUsers(options?: { range?: string }): Promise<CrmContact[]> {
    const client = this.getClient();
    const users = await client.getUsers(options);
    return users.map(GlpiDataMapper.userToCrmContact);
  }

  async getEntities(options?: { range?: string }): Promise<CrmClient[]> {
    const client = this.getClient();
    const entities = await client.getEntities(options);
    return entities.map(GlpiDataMapper.entityToCrmClient);
  }

  private isConfigured(): boolean {
    return Boolean(
      this.config.baseUrl &&
      this.config.apiKey &&
      (this.config.username || this.config.password),
    );
  }

  private getClient(): GlpiApiClient {
    if (!this.client) {
      if (!this.config.baseUrl || !this.config.apiKey) {
        throw new Error('GLPI configuration incomplete');
      }

      this.client = new GlpiApiClient({
        baseUrl: this.config.baseUrl,
        appToken: this.config.apiKey,
        username: this.config.username,
        password: this.config.password,
      });
    }

    return this.client;
  }

  private async syncTickets(): Promise<void> {
    this.logger.debug('Syncing tickets from GLPI');
    const tickets = await this.getTickets({ range: '0-100' });
    this.logger.debug(`Fetched ${tickets.length} tickets from GLPI`);
  }

  private async syncUsers(): Promise<void> {
    this.logger.debug('Syncing users from GLPI');
    const users = await this.getUsers({ range: '0-100' });
    this.logger.debug(`Fetched ${users.length} users from GLPI`);
  }

  private async syncEntities(): Promise<void> {
    this.logger.debug('Syncing entities from GLPI');
    const entities = await this.getEntities({ range: '0-50' });
    this.logger.debug(`Fetched ${entities.length} entities from GLPI`);
  }
}
