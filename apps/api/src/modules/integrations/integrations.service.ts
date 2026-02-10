import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GlpiAdapter } from './adapters/glpi';
import { SatAdapter } from './adapters/sat.adapter';
import { ZimbraAdapter } from './adapters/zimbra.adapter';
import { OutlookAdapter } from './adapters/outlook.adapter';
import type {
  IntegrationConfig,
  IntegrationStatus,
  IntegrationAdapter,
} from './types';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly adapters: Map<string, IntegrationAdapter>;

  constructor(
    private readonly glpi: GlpiAdapter,
    private readonly sat: SatAdapter,
    private readonly zimbra: ZimbraAdapter,
    private readonly outlook: OutlookAdapter,
  ) {
    this.adapters = new Map<string, IntegrationAdapter>([
      ['glpi', glpi as IntegrationAdapter],
      ['sat', sat as IntegrationAdapter],
      ['zimbra', zimbra as IntegrationAdapter],
      ['outlook', outlook as IntegrationAdapter],
    ]);
  }

  /**
   * Lists all available integrations with their current status.
   */
  async listAll(): Promise<IntegrationStatus[]> {
    const statuses: IntegrationStatus[] = [];

    for (const [id, adapter] of this.adapters) {
      statuses.push(await adapter.getStatus());
    }

    return statuses;
  }

  /**
   * Gets status for a specific integration.
   */
  async getById(id: string): Promise<IntegrationStatus> {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new NotFoundException(`Integration not found: ${id}`);
    }
    return adapter.getStatus();
  }

  /**
   * Tests connection to an external system.
   */
  async testConnection(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new NotFoundException(`Integration not found: ${id}`);
    }

    try {
      const result = await adapter.testConnection();
      return {
        success: result,
        message: result
          ? 'Connection successful'
          : 'Connection failed - check configuration',
      };
    } catch (error) {
      this.logger.error(`Connection test failed for ${id}:`, error);
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Updates configuration for an integration.
   */
  async configure(
    id: string,
    config: Partial<IntegrationConfig>,
  ): Promise<IntegrationStatus> {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new NotFoundException(`Integration not found: ${id}`);
    }

    await adapter.configure(config);
    return adapter.getStatus();
  }

  /**
   * Triggers a data sync for an integration.
   */
  async triggerSync(id: string): Promise<{ message: string; jobId: string }> {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new NotFoundException(`Integration not found: ${id}`);
    }

    const jobId = `sync-${id}-${Date.now()}`;
    this.logger.log(`Sync triggered for ${id}, job: ${jobId}`);

    // In production, this would queue a background job
    // For portfolio demo, just return acknowledgment
    return {
      message: `Sync initiated for ${id}`,
      jobId,
    };
  }
}
