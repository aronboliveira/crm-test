import { Logger } from '@nestjs/common';
import type {
  GlpiSessionResponse,
  GlpiTicket,
  GlpiUser,
  GlpiEntity,
  GlpiComputer,
  GlpiApiError,
  GlpiCreateTicketPayload,
  GlpiUpdateTicketPayload,
} from './glpi.types';

export interface GlpiClientConfig {
  baseUrl: string;
  appToken: string;
  userToken?: string;
  username?: string;
  password?: string;
}

/**
 * GLPI REST API Client
 *
 * Low-level HTTP client for GLPI REST API operations.
 * Handles authentication, session management, and API requests.
 */
export class GlpiApiClient {
  private readonly logger = new Logger(GlpiApiClient.name);
  private sessionToken: string | null = null;
  private readonly config: GlpiClientConfig;

  constructor(config: GlpiClientConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl.replace(/\/$/, ''),
    };
  }

  private get apiBase(): string {
    return `${this.config.baseUrl}/apirest.php`;
  }

  private getHeaders(includeSession = true): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'App-Token': this.config.appToken,
    };

    if (includeSession && this.sessionToken) {
      headers['Session-Token'] = this.sessionToken;
    }

    return headers;
  }

  private getAuthHeader(): string {
    if (this.config.userToken) {
      return `user_token ${this.config.userToken}`;
    }
    if (this.config.username && this.config.password) {
      const credentials = Buffer.from(
        `${this.config.username}:${this.config.password}`,
      ).toString('base64');
      return `Basic ${credentials}`;
    }
    throw new Error('No authentication method configured');
  }

  async initSession(): Promise<string> {
    this.logger.debug('Initializing GLPI session');

    const response = await fetch(`${this.apiBase}/initSession`, {
      method: 'GET',
      headers: {
        ...this.getHeaders(false),
        Authorization: this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const error: GlpiApiError = await response.json().catch(() => ({
        error: `HTTP ${response.status}`,
      }));
      throw new Error(`GLPI auth failed: ${error.error}`);
    }

    const data: GlpiSessionResponse = await response.json();
    this.sessionToken = data.session_token;
    this.logger.debug('GLPI session initialized');
    return this.sessionToken;
  }

  async killSession(): Promise<void> {
    if (!this.sessionToken) return;

    try {
      await fetch(`${this.apiBase}/killSession`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
    } catch (error) {
      this.logger.warn('Failed to kill GLPI session', error);
    } finally {
      this.sessionToken = null;
    }
  }

  async ensureSession(): Promise<void> {
    if (!this.sessionToken) {
      await this.initSession();
    }
  }

  async getTickets(params?: {
    range?: string;
    searchText?: string;
  }): Promise<GlpiTicket[]> {
    await this.ensureSession();

    const url = new URL(`${this.apiBase}/Ticket`);
    if (params?.range) {
      url.searchParams.set('range', params.range);
    }
    url.searchParams.set('expand_dropdowns', 'true');

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tickets: HTTP ${response.status}`);
    }

    return response.json();
  }

  async getTicket(id: number): Promise<GlpiTicket> {
    await this.ensureSession();

    const response = await fetch(`${this.apiBase}/Ticket/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ticket ${id}: HTTP ${response.status}`);
    }

    return response.json();
  }

  async createTicket(payload: GlpiCreateTicketPayload): Promise<GlpiTicket> {
    await this.ensureSession();

    const response = await fetch(`${this.apiBase}/Ticket`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to create ticket: HTTP ${response.status}`);
    }

    const result = await response.json();
    return this.getTicket(result.id);
  }

  async updateTicket(
    id: number,
    payload: GlpiUpdateTicketPayload,
  ): Promise<GlpiTicket> {
    await this.ensureSession();

    const response = await fetch(`${this.apiBase}/Ticket/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to update ticket ${id}: HTTP ${response.status}`);
    }

    return this.getTicket(id);
  }

  async getUsers(params?: { range?: string }): Promise<GlpiUser[]> {
    await this.ensureSession();

    const url = new URL(`${this.apiBase}/User`);
    if (params?.range) {
      url.searchParams.set('range', params.range);
    }

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch users: HTTP ${response.status}`);
    }

    return response.json();
  }

  async getUser(id: number): Promise<GlpiUser> {
    await this.ensureSession();

    const response = await fetch(`${this.apiBase}/User/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user ${id}: HTTP ${response.status}`);
    }

    return response.json();
  }

  async getEntities(params?: { range?: string }): Promise<GlpiEntity[]> {
    await this.ensureSession();

    const url = new URL(`${this.apiBase}/Entity`);
    if (params?.range) {
      url.searchParams.set('range', params.range);
    }

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch entities: HTTP ${response.status}`);
    }

    return response.json();
  }

  async getComputers(params?: { range?: string }): Promise<GlpiComputer[]> {
    await this.ensureSession();

    const url = new URL(`${this.apiBase}/Computer`);
    if (params?.range) {
      url.searchParams.set('range', params.range);
    }

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch computers: HTTP ${response.status}`);
    }

    return response.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.initSession();
      await this.killSession();
      return true;
    } catch (error) {
      this.logger.error('GLPI connection test failed', error);
      return false;
    }
  }
}
