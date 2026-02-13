import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import ImportService from './import.service';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import PermissionsGuard from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';
import ImportFieldSuggestionsService, {
  type ImportSuggestionKind,
} from './import-field-suggestions.service';

/** File upload interface for Multer-compatible files */
interface UploadedFileData {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

type ImportRequestBody = Readonly<{
  duplicateStrategy?: string;
}>;

@Controller('/import')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export default class ImportController {
  constructor(
    private readonly svc: ImportService,
    private readonly suggestionsService: ImportFieldSuggestionsService,
  ) {}

  /**
   * POST /import
   * Accepts a single file (csv, yml/yaml, xml, json, md) up to 5 MB.
   * Creates projects/tasks from the file rows.
   */
  @Post()
  @Permissions('projects.manage')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async importFile(
    @UploadedFile() file: UploadedFileData,
    @Req() req: any,
    @Body() body: ImportRequestBody,
    @Query('duplicateStrategy') duplicateStrategyQuery?: string,
  ) {
    const email: string = req.user?.email ?? 'unknown';
    const result = await this.svc.importFile(
      file.buffer,
      file.mimetype,
      email,
      file.originalname,
      {
        duplicateStrategy: body?.duplicateStrategy ?? duplicateStrategyQuery,
      },
    );
    return {
      ok: true,
      message: result.idempotent
        ? `Import replayed from idempotency cache (${result.projects} projects, ${result.tasks} tasks).`
        : `Imported ${result.projects} projects and ${result.tasks} tasks`,
      ...result,
    };
  }

  @Get('/suggestions')
  @Permissions('projects.read')
  async listFieldSuggestions(
    @Query('kind') kind: ImportSuggestionKind,
    @Query('field') field?: string,
    @Query('query') query?: string,
    @Query('limit') limit?: string,
  ) {
    const items = await this.suggestionsService.list({
      kind,
      field,
      query,
      limit: limit ? Number(limit) : undefined,
    });
    return {
      kind,
      items,
    };
  }
}
