import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { GlpiAdapter } from './adapters/glpi';
import { SatAdapter } from './adapters/sat.adapter';
import { ZimbraAdapter } from './adapters/zimbra.adapter';
import { OutlookAdapter } from './adapters/outlook.adapter';

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
