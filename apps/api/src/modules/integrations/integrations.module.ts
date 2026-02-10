import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { GlpiAdapter } from './adapters/glpi';
import { SatAdapter } from './adapters/sat';
import { NextcloudAdapter } from './adapters/nextcloud';
import { ZimbraAdapter } from './adapters/zimbra.adapter';
import { OutlookAdapter } from './adapters/outlook.adapter';

@Module({
  imports: [HttpModule],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    GlpiAdapter,
    SatAdapter,
    NextcloudAdapter,
    ZimbraAdapter,
    OutlookAdapter,
  ],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
