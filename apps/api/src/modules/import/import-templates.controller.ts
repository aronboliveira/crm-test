import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import PermissionsGuard from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';
import type { ImportTemplateKind } from '../../entities/ImportTemplateEntity';
import ImportTemplatesService, {
  type CreateImportTemplateDto,
  type PreviewApplyDto,
  type UpdateImportTemplateDto,
} from './import-templates.service';

type RequestWithActor = Readonly<{
  user?: Readonly<{ email?: string }>;
}>;

@Controller('/import/templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export default class ImportTemplatesController {
  constructor(private readonly svc: ImportTemplatesService) {}

  @Get('/profiles')
  @Permissions('projects.read')
  listProfiles(@Query('kind') kind?: ImportTemplateKind) {
    return {
      items: this.svc.listProfiles(kind),
    };
  }

  @Get()
  @Permissions('projects.read')
  async list(@Query('kind') kind?: ImportTemplateKind) {
    const rows = await this.svc.list(kind);
    return {
      items: rows.map((row) => ({
        id: String(row._id),
        kind: row.kind,
        name: row.name,
        description: row.description,
        profileKey: row.profileKey,
        latestVersion: row.latestVersion,
        usageCount: row.usageCount ?? 0,
        columnMapping: row.columnMapping ?? {},
        defaultValues: row.defaultValues ?? {},
        versions: row.versions ?? [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        createdByEmail: row.createdByEmail,
        updatedByEmail: row.updatedByEmail,
      })),
    };
  }

  @Get('/:id')
  @Permissions('projects.read')
  async findById(@Param('id') id: string) {
    const row = await this.svc.findById(id);
    return {
      id: String(row._id),
      kind: row.kind,
      name: row.name,
      description: row.description,
      profileKey: row.profileKey,
      latestVersion: row.latestVersion,
      usageCount: row.usageCount ?? 0,
      columnMapping: row.columnMapping ?? {},
      defaultValues: row.defaultValues ?? {},
      versions: row.versions ?? [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdByEmail: row.createdByEmail,
      updatedByEmail: row.updatedByEmail,
    };
  }

  @Post()
  @Permissions('projects.manage')
  async create(
    @Body() dto: CreateImportTemplateDto,
    @Req() req: RequestWithActor,
  ) {
    const actorEmail = req.user?.email ?? 'unknown';
    const row = await this.svc.create(dto, actorEmail);
    return {
      id: String(row._id),
      latestVersion: row.latestVersion,
      name: row.name,
    };
  }

  @Patch('/:id')
  @Permissions('projects.manage')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateImportTemplateDto,
    @Req() req: RequestWithActor,
  ) {
    const actorEmail = req.user?.email ?? 'unknown';
    const row = await this.svc.update(id, dto, actorEmail);
    return {
      id: String(row._id),
      latestVersion: row.latestVersion,
      name: row.name,
      updatedAt: row.updatedAt,
    };
  }

  @Delete('/:id')
  @Permissions('projects.manage')
  async remove(@Param('id') id: string) {
    await this.svc.remove(id);
    return { ok: true };
  }

  @Post('/:id/mark-used')
  @Permissions('projects.read')
  async markAsUsed(@Param('id') id: string) {
    const row = await this.svc.markAsUsed(id);
    return {
      id: String(row._id),
      usageCount: row.usageCount ?? 0,
    };
  }

  @Post('/:id/preview-apply')
  @Permissions('projects.read')
  previewApply(@Param('id') id: string, @Body() dto: PreviewApplyDto) {
    return this.svc.previewApply(id, dto);
  }
}
