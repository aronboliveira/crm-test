import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { GlpiAdapter } from './adapters/glpi';
import { SatAdapter } from './adapters/sat';
import { NextcloudAdapter } from './adapters/nextcloud';
import { WhatsAppAdapter } from './adapters/whatsapp';
import { OpenAiAdapter } from './adapters/openai';
import { ZimbraAdapter } from './adapters/zimbra.adapter';
import { OutlookAdapter } from './adapters/outlook.adapter';
import IntegrationConfigEntity from '../../entities/IntegrationConfigEntity';
import IntegrationSyncJobEntity from '../../entities/IntegrationSyncJobEntity';
import IntegrationSyncRecordEntity from '../../entities/IntegrationSyncRecordEntity';
import { IntegrationConfigsService } from './integration-configs.service';
import { IntegrationConfigCryptoService } from './integration-config-crypto.service';
import { IntegrationSyncRunsService } from './integration-sync-runs.service';
import { IntegrationResilienceService } from './integration-resilience.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      IntegrationConfigEntity,
      IntegrationSyncJobEntity,
      IntegrationSyncRecordEntity,
    ]),
  ],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    IntegrationConfigCryptoService,
    IntegrationConfigsService,
    IntegrationSyncRunsService,
    IntegrationResilienceService,
    GlpiAdapter,
    SatAdapter,
    NextcloudAdapter,
    WhatsAppAdapter,
    OpenAiAdapter,
    ZimbraAdapter,
    OutlookAdapter,
  ],
  exports: [
    IntegrationsService,
    IntegrationConfigsService,
    IntegrationSyncRunsService,
    NextcloudAdapter,
    ZimbraAdapter,
    OutlookAdapter,
  ],
})
export class IntegrationsModule {}
