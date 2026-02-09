import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { GlpiAdapter } from './adapters/glpi.adapter';
import { SatAdapter } from './adapters/sat.adapter';
import { ZimbraAdapter } from './adapters/zimbra.adapter';
import { OutlookAdapter } from './adapters/outlook.adapter';

/**
 * Integrations Module
 *
 * Central module for managing external system integrations.
 * Provides adapters for GLPI, SAT, Zimbra Mail, and Microsoft Outlook.
 *
 * @remarks
 * This is a portfolio demonstration module. In production, each adapter
 * would have full OAuth2/API key configuration and robust error handling.
 */
@Module({
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    GlpiAdapter,
    SatAdapter,
    ZimbraAdapter,
    OutlookAdapter,
  ],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
