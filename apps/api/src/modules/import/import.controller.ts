import {
  Controller,
  Post,
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

@Controller('/import')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export default class ImportController {
  constructor(private readonly svc: ImportService) {}

  /**
   * POST /import
   * Accepts a single file (csv, yml, xml) up to 5 MB.
   * Creates projects/tasks from the file rows.
   */
  @Post()
  @Permissions('projects.manage')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async importFile(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const email: string = req.user?.email ?? 'unknown';
    const result = await this.svc.importFile(file.buffer, file.mimetype, email);
    return {
      ok: true,
      message: `Imported ${result.projects} projects and ${result.tasks} tasks`,
      ...result,
    };
  }
}
