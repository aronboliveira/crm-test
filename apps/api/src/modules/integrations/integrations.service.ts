import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GlpiAdapter } from './adapters/glpi';
import { SatAdapter } from './adapters/sat';
import { NextcloudAdapter } from './adapters/nextcloud';
import { WhatsAppAdapter } from './adapters/whatsapp';
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
    private readonly nextcloud: NextcloudAdapter,
    private readonly whatsapp: WhatsAppAdapter,
    private readonly zimbra: ZimbraAdapter,
    private readonly outlook: OutlookAdapter,
  ) {
    this.adapters = new Map<string, IntegrationAdapter>([
      ['glpi', glpi as IntegrationAdapter],
      ['sat', sat as IntegrationAdapter],
      ['nextcloud', nextcloud as IntegrationAdapter],
      ['whatsapp', whatsapp as IntegrationAdapter],
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

  /**
   * Performs health check for an integration.
   * Verifies configuration, connectivity, and authentication.
   */
  async checkHealth(id: string) {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new NotFoundException(`Integration not found: ${id}`);
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const info: Record<string, any> = {};

    // Check if adapter has isConfigured method
    const configured =
      'isConfigured' in adapter ? await (adapter as any).isConfigured() : true;

    if (!configured) {
      errors.push('Integration not configured');
    }

    // Test connection
    let connected = false;
    let authValid = false;
    try {
      connected = await adapter.testConnection();
      authValid = connected; // If connection works, auth is valid
      info.connectionTest = 'passed';
    } catch (error) {
      errors.push(
        `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      info.connectionTest = 'failed';
      info.connectionError =
        error instanceof Error ? error.message : 'Unknown error';
    }

    // Get additional info if available
    if ('getSmtpProfile' in adapter && configured) {
      try {
        const smtpProfile = await (adapter as any).getSmtpProfile();
        if (smtpProfile) {
          info.smtp = {
            host: smtpProfile.host,
            port: smtpProfile.port,
            secure: smtpProfile.options?.secure,
          };
        }
      } catch (error) {
        warnings.push('SMTP configuration unavailable');
      }
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (!configured || errors.length > 0) {
      status = 'unhealthy';
    } else if (warnings.length > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      integration: id,
      status,
      configured,
      connected,
      details: {
        configValid: configured,
        apiReachable: connected,
        authValid,
        lastCheck: new Date(),
        ...(errors.length > 0 && { errors }),
        ...(warnings.length > 0 && { warnings }),
        info,
      },
    };
  }
}
