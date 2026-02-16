import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import type {
  IntegrationConfig,
  IntegrationConfigOverview,
  IntegrationSyncJobView,
  IntegrationStatus,
} from './types';

/**
 * Controller for managing external system integrations.
 *
 * @remarks
 * Exposes configuration, connectivity, health, and sync orchestration endpoints.
 */
@Controller('integrations')
export class IntegrationsController {
  private readonly logger = new Logger(IntegrationsController.name);

  constructor(private readonly integrationsService: IntegrationsService) {}

  /**
   * Lists all available integrations and their current status.
   */
  @Get()
  async listIntegrations(): Promise<IntegrationStatus[]> {
    this.logger.log('Listing all integrations');
    return this.integrationsService.listAll();
  }

  /**
   * Gets persisted status/details for a sync job.
   */
  @Get('sync-jobs/:jobId')
  async getSyncJob(
    @Param('jobId') jobId: string,
  ): Promise<IntegrationSyncJobView> {
    this.logger.log(`Getting sync job: ${jobId}`);
    return this.integrationsService.getSyncJob(jobId);
  }

  /**
   * Gets details for a specific integration.
   */
  @Get(':id')
  async getIntegration(@Param('id') id: string): Promise<IntegrationStatus> {
    this.logger.log(`Getting integration: ${id}`);
    return this.integrationsService.getById(id);
  }

  /**
   * Gets masked configuration overview for UI forms.
   */
  @Get(':id/config')
  async getIntegrationConfig(
    @Param('id') id: string,
  ): Promise<IntegrationConfigOverview> {
    this.logger.log(`Getting integration config overview: ${id}`);
    return this.integrationsService.getConfigOverview(id);
  }

  /**
   * Tests connection to an external system.
   */
  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  async testConnection(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Testing connection for: ${id}`);
    return this.integrationsService.testConnection(id);
  }

  /**
   * Updates configuration for an integration.
   */
  @Post(':id/configure')
  async configure(
    @Param('id') id: string,
    @Body() config: Partial<IntegrationConfig>,
  ): Promise<IntegrationStatus> {
    this.logger.log(`Configuring integration: ${id}`);
    return this.integrationsService.configure(id, config);
  }

  /**
   * Triggers a sync for an integration.
   */
  @Post(':id/sync')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerSync(
    @Param('id') id: string,
  ): Promise<{ message: string; jobId: string }> {
    this.logger.log(`Triggering sync for: ${id}`);
    return this.integrationsService.triggerSync(id);
  }

  /**
   * Health check endpoint for an integration.
   * Verifies configuration validity and actual connectivity.
   */
  @Get(':id/health')
  async checkHealth(@Param('id') id: string): Promise<{
    integration: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    configured: boolean;
    connected: boolean;
    details: {
      configValid: boolean;
      apiReachable: boolean;
      authValid: boolean;
      lastCheck: Date;
      errors?: string[];
      warnings?: string[];
      info?: Record<string, any>;
    };
  }> {
    this.logger.log(`Health check for: ${id}`);
    return this.integrationsService.checkHealth(id);
  }

  /**
   * Resilience state endpoint for an integration.
   * Returns current circuit breaker snapshots and counters.
   */
  @Get(':id/resilience')
  async getResilience(@Param('id') id: string): Promise<{
    integration: string;
    circuits: Array<{
      key: string;
      integrationId: string;
      operation: string;
      state: 'open' | 'closed' | 'halfOpen';
      fires: number;
      failures: number;
      successes: number;
      rejects: number;
      timeouts: number;
    }>;
    generatedAt: Date;
  }> {
    this.logger.log(`Resilience snapshot for: ${id}`);
    return this.integrationsService.getResilienceSnapshot(id);
  }
}
