import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { GlpiAdapter } from './adapters/glpi';
import { SatAdapter } from './adapters/sat';
import { NextcloudAdapter } from './adapters/nextcloud';
import { WhatsAppAdapter } from './adapters/whatsapp';
import { ZimbraAdapter } from './adapters/zimbra.adapter';
import { OutlookAdapter } from './adapters/outlook.adapter';
import { IntegrationConfigsService } from './integration-configs.service';
import { IntegrationSyncRunsService } from './integration-sync-runs.service';
import type {
  IntegrationConfig,
  IntegrationConfigOverview,
  IntegrationStatus,
  IntegrationAdapter,
  IntegrationSyncDataset,
  IntegrationSyncJobView,
} from './types';

const DEFAULT_SYNC_MAX_ATTEMPTS = 3;

@Injectable()
export class IntegrationsService implements OnModuleInit {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly adapters: Map<string, IntegrationAdapter>;

  constructor(
    private readonly glpi: GlpiAdapter,
    private readonly sat: SatAdapter,
    private readonly nextcloud: NextcloudAdapter,
    private readonly whatsapp: WhatsAppAdapter,
    private readonly zimbra: ZimbraAdapter,
    private readonly outlook: OutlookAdapter,
    private readonly configs: IntegrationConfigsService,
    private readonly syncRuns: IntegrationSyncRunsService,
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

  async onModuleInit(): Promise<void> {
    let stored: Map<string, Partial<IntegrationConfig>>;
    try {
      stored = await this.configs.getAll();
    } catch (error) {
      this.logger.error('Failed to load persisted integration configs', error);
      return;
    }

    for (const [id, config] of stored) {
      const adapter = this.adapters.get(id);
      if (!adapter) {
        this.logger.warn(`Ignoring persisted config for unknown adapter: ${id}`);
        continue;
      }

      try {
        await adapter.configure(config);
      } catch (error) {
        this.logger.error(
          `Failed to hydrate config for adapter "${id}"`,
          error,
        );
      }
    }
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
    const adapter = this.getAdapterOrThrow(id);
    return adapter.getStatus();
  }

  /**
   * Returns masked configuration data for frontend configuration forms.
   * Sensitive values are never exposed, only presence flags.
   */
  async getConfigOverview(id: string): Promise<IntegrationConfigOverview> {
    const adapter = this.getAdapterOrThrow(id);
    const [status, stored] = await Promise.all([
      adapter.getStatus(),
      this.configs.getConfig(id),
    ]);

    const { values, secrets } = this.sanitizeConfigForOverview(
      id,
      stored ?? {},
    );

    return {
      integrationId: id,
      configured: status.configured,
      values,
      secrets,
    };
  }

  /**
   * Tests connection to an external system.
   */
  async testConnection(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const adapter = this.getAdapterOrThrow(id);

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
    const adapter = this.getAdapterOrThrow(id);
    const merged = await this.configs.upsert(id, config);

    await adapter.configure(merged);
    return adapter.getStatus();
  }

  async getSyncJob(jobId: string): Promise<IntegrationSyncJobView> {
    return this.syncRuns.getJobView(jobId);
  }

  /**
   * Triggers a data sync for an integration.
   */
  async triggerSync(id: string): Promise<{ message: string; jobId: string }> {
    this.getAdapterOrThrow(id);
    const job = await this.syncRuns.createJob(id, DEFAULT_SYNC_MAX_ATTEMPTS);
    const jobId = job.jobId;
    this.logger.log(`Sync triggered for ${id}, job: ${jobId}`);

    void this.runSyncJob(jobId, id, job.maxAttempts);

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
    const adapter = this.getAdapterOrThrow(id);

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
            secure: smtpProfile.secure,
          };
        }
      } catch (error) {
        warnings.push('SMTP configuration unavailable');
      }
    }

    if (typeof adapter.getHealthInfo === 'function') {
      try {
        const healthInfo = await adapter.getHealthInfo();
        if (healthInfo && typeof healthInfo === 'object') {
          info[id] = healthInfo;
        }
      } catch (error) {
        warnings.push('Integration health details unavailable');
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

  private getAdapterOrThrow(id: string): IntegrationAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new NotFoundException(`Integration not found: ${id}`);
    }
    return adapter;
  }

  private async runSyncJob(
    jobId: string,
    integrationId: string,
    maxAttempts: number,
  ): Promise<void> {
    try {
      const adapter = this.getAdapterOrThrow(integrationId);

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          await this.syncRuns.markRunning(jobId, attempt);
          await this.executeSyncAttempt(jobId, integrationId, adapter);
          await this.syncRuns.markSucceeded(jobId, attempt);
          this.logger.log(`Sync job ${jobId} succeeded on attempt ${attempt}`);
          return;
        } catch (error) {
          const message = this.errorMessage(error);

          if (attempt >= maxAttempts) {
            await this.syncRuns.markFailed(jobId, attempt, message);
            this.logger.error(`Sync job ${jobId} failed`, error as Error);
            return;
          }

          await this.syncRuns.markRetrying(jobId, attempt, message);
          const delayMs = this.retryDelay(attempt);
          this.logger.warn(
            `Sync job ${jobId} failed on attempt ${attempt}, retrying in ${delayMs}ms`,
          );
          await this.sleep(delayMs);
        }
      }
    } catch (error) {
      this.logger.error(`Sync orchestration failed for job ${jobId}`, error as Error);
    }
  }

  private async executeSyncAttempt(
    jobId: string,
    integrationId: string,
    adapter: IntegrationAdapter,
  ): Promise<void> {
    const datasets = await this.collectSyncDatasets(adapter);

    for (const dataset of datasets) {
      const stats = await this.syncRuns.reconcileDataset(
        jobId,
        integrationId,
        dataset,
      );
      await this.syncRuns.appendDatasetSummary(jobId, dataset.recordType, stats);
    }

    // * FINISH INTEGRATION HERE [GLPI/SAT/NEXTCLOUD/ZIMBRA/OUTLOOK]:
    // * Project reconciled snapshots into first-class CRM domains
    // * (Leads/Clients/Attachments) with business-specific conflict policies.
  }

  private async collectSyncDatasets(
    adapter: IntegrationAdapter,
  ): Promise<IntegrationSyncDataset[]> {
    if (typeof adapter.pullSyncSnapshot === 'function') {
      return adapter.pullSyncSnapshot();
    }

    if (typeof adapter.sync === 'function') {
      await adapter.sync();
    }

    return [];
  }

  private retryDelay(attempt: number): number {
    return Math.min(10_000, 500 * 2 ** (attempt - 1));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return 'Unknown sync error';
  }

  private sanitizeConfigForOverview(
    id: string,
    config: Partial<IntegrationConfig>,
  ): { values: Record<string, unknown>; secrets: Record<string, boolean> } {
    if (id === 'glpi') {
      const hasUserToken = this.hasNonEmptyString(config.userToken);
      const hasPassword = this.hasNonEmptyString(config.password);

      return {
        values: {
          baseUrl: this.pickFirstString(config.baseUrl, config.apiUrl),
          username: this.safeString(config.username),
          authMode: hasUserToken ? 'user_token' : 'basic',
        },
        secrets: {
          appToken:
            this.hasNonEmptyString(config.appToken) ||
            this.hasNonEmptyString(config.apiKey),
          userToken: hasUserToken,
          password: hasPassword,
        },
      };
    }

    if (id === 'sat') {
      return {
        values: {
          baseUrl: this.pickFirstString(config.baseUrl, config.apiUrl),
          clientId: this.safeString(config.clientId),
          companyId: this.safeString(config.companyId),
          syncInvoices:
            typeof config.syncInvoices === 'boolean' ? config.syncInvoices : true,
          syncProducts:
            typeof config.syncProducts === 'boolean' ? config.syncProducts : true,
        },
        secrets: {
          clientSecret: this.hasNonEmptyString(config.clientSecret),
        },
      };
    }

    if (id === 'nextcloud') {
      const hasAppPassword = this.hasNonEmptyString(config.appPassword);
      const hasPassword = this.hasNonEmptyString(config.password);

      return {
        values: {
          baseUrl: this.pickFirstString(
            config.baseUrl,
            config.apiUrl,
            config.serverUrl,
          ),
          username: this.safeString(config.username),
          defaultFolder: this.pickFirstString(
            config.defaultFolder,
            config.basePath,
          ),
          authMode: hasAppPassword ? 'app_password' : 'password',
        },
        secrets: {
          appPassword: hasAppPassword,
          password: hasPassword,
        },
      };
    }

    if (id === 'zimbra') {
      return {
        values: {
          baseUrl: this.pickFirstString(config.baseUrl, config.apiUrl),
          username: this.safeString(config.username),
          smtpHost: this.safeString(config.smtpHost),
          smtpPort:
            typeof config.smtpPort === 'number' ? config.smtpPort : undefined,
          smtpSecure:
            typeof config.smtpSecure === 'boolean' ? config.smtpSecure : false,
          smtpFrom: this.safeString(config.smtpFrom),
          smtpProfile:
            config.smtpProfile === 'default' ? 'default' : 'zimbra',
          mockNotifications:
            typeof config.mockNotifications === 'boolean'
              ? config.mockNotifications
              : false,
        },
        secrets: {
          password:
            this.hasNonEmptyString(config.password)
            || this.hasNonEmptyString(config.apiKey),
          smtpPass: this.hasNonEmptyString(config.smtpPass),
        },
      };
    }

    if (id === 'outlook') {
      return {
        values: {
          tenantId: this.safeString(config.tenantId),
          clientId: this.safeString(config.clientId),
          smtpHost: this.safeString(config.smtpHost),
          smtpPort:
            typeof config.smtpPort === 'number' ? config.smtpPort : undefined,
          smtpSecure:
            typeof config.smtpSecure === 'boolean' ? config.smtpSecure : false,
          smtpFrom: this.safeString(config.smtpFrom),
          smtpProfile:
            config.smtpProfile === 'default' ? 'default' : 'outlook',
          mockNotifications:
            typeof config.mockNotifications === 'boolean'
              ? config.mockNotifications
              : false,
        },
        secrets: {
          clientSecret: this.hasNonEmptyString(config.clientSecret),
          smtpPass: this.hasNonEmptyString(config.smtpPass),
        },
      };
    }

    if (id === 'whatsapp') {
      return {
        values: {
          businessAccountId: this.safeString(config.businessAccountId),
          phoneNumberId: this.safeString(config.phoneNumberId),
          apiVersion: this.safeString(config.apiVersion) || 'v18.0',
        },
        secrets: {
          accessToken: this.hasNonEmptyString(config.accessToken),
        },
      };
    }

    const secrets: Record<string, boolean> = {};
    const values: Record<string, unknown> = {};
    const secretKeys = new Set([
      'apiKey',
      'appToken',
      'userToken',
      'password',
      'appPassword',
      'clientSecret',
      'accessToken',
      'smtpPass',
    ]);

    for (const [key, value] of Object.entries(config)) {
      if (secretKeys.has(key)) {
        secrets[key] = this.hasNonEmptyString(value);
        continue;
      }
      values[key] = value;
    }

    return { values, secrets };
  }

  private pickFirstString(...values: Array<string | undefined>): string {
    for (const value of values) {
      if (this.hasNonEmptyString(value)) {
        return value!.trim();
      }
    }
    return '';
  }

  private safeString(value?: string): string {
    return this.hasNonEmptyString(value) ? value!.trim() : '';
  }

  private hasNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }
}
