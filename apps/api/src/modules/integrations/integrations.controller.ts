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
import type { IntegrationConfig, IntegrationStatus } from './types';

/**
 * Controller for managing external system integrations.
 *
 * @remarks
 * Portfolio demonstration - endpoints return mock/shell responses.
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
   * Gets details for a specific integration.
   */
  @Get(':id')
  async getIntegration(@Param('id') id: string): Promise<IntegrationStatus> {
    this.logger.log(`Getting integration: ${id}`);
    return this.integrationsService.getById(id);
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
}
