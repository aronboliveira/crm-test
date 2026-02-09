import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import PermissionsGuard from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';

@Controller('leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  /* ── Core CRUD ──────────────────────────────────────── */

  @Get()
  @Permissions('leads.read')
  async list(@Query('q') q?: string, @Query('status') status?: string) {
    const items = await this.service.findAll(q, status);
    return { items, total: items.length, nextCursor: null };
  }

  @Get(':id')
  @Permissions('leads.read')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('leads.write')
  async create(@Body() dto: any) {
    const item = await this.service.create(dto);
    return { id: String(item._id) };
  }

  @Patch(':id')
  @Permissions('leads.write')
  async update(@Param('id') id: string, @Body() dto: any) {
    const item = await this.service.update(id, dto);
    return { id: String(item._id) };
  }

  @Delete(':id')
  @Permissions('leads.manage')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { ok: true };
  }

  /* ── Campaign attachment ────────────────────────────── */

  @Post(':id/campaigns')
  @Permissions('leads.write')
  async attachCampaign(@Param('id') id: string, @Body() body: any) {
    const campaign = {
      id: body?.id || new Date().getTime().toString(36),
      name: body?.name || 'Untitled Campaign',
      channel: body?.channel || 'email',
    };
    const lead = await this.service.attachCampaign(id, campaign);
    return { campaigns: lead.campaigns };
  }

  @Delete(':id/campaigns/:campaignId')
  @Permissions('leads.write')
  async detachCampaign(
    @Param('id') id: string,
    @Param('campaignId') campaignId: string,
  ) {
    const lead = await this.service.detachCampaign(id, campaignId);
    return { campaigns: lead.campaigns };
  }

  /* ── Contract attachment ────────────────────────────── */

  @Post(':id/contracts')
  @Permissions('leads.write')
  async attachContract(@Param('id') id: string, @Body() body: any) {
    const contract = {
      id: body?.id || new Date().getTime().toString(36),
      title: body?.title || 'Untitled Contract',
      value: typeof body?.value === 'number' ? body.value : undefined,
    };
    const lead = await this.service.attachContract(id, contract);
    return { contracts: lead.contracts };
  }

  @Delete(':id/contracts/:contractId')
  @Permissions('leads.write')
  async detachContract(
    @Param('id') id: string,
    @Param('contractId') contractId: string,
  ) {
    const lead = await this.service.detachContract(id, contractId);
    return { contracts: lead.contracts };
  }

  /* ── CTA suggestions ───────────────────────────────── */

  @Post(':id/cta/refresh')
  @Permissions('leads.write')
  async refreshCta(@Param('id') id: string, @Body() body: any) {
    const channels = Array.isArray(body?.channels) ? body.channels : undefined;
    const lead = await this.service.refreshCtaSuggestions(id, channels);
    return { ctaSuggestions: lead.ctaSuggestions };
  }

  @Patch(':id/cta/:ctaId/used')
  @Permissions('leads.write')
  async markCtaUsed(@Param('id') id: string, @Param('ctaId') ctaId: string) {
    const lead = await this.service.markCtaUsed(id, ctaId);
    return { ctaSuggestions: lead.ctaSuggestions };
  }
}
