import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import AttachmentsService from './attachments.service';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import PermissionsGuard from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';

@Controller('/attachments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export default class AttachmentsController {
  private readonly logger = new Logger(AttachmentsController.name);

  constructor(private readonly svc: AttachmentsService) {}

  @Get()
  @Permissions('tasks.read')
  async list(
    @Query('targetType') targetType: 'task' | 'project',
    @Query('targetId') targetId: string,
  ) {
    const rows = await this.svc.listByTarget(targetType, targetId);
    return {
      items: rows.map((a) => ({
        id: String(a._id),
        targetType: a.targetType,
        targetId: a.targetId,
        uploaderEmail: a.uploaderEmail,
        fileName: a.fileName,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        createdAt: a.createdAt,
      })),
    };
  }

  @Post()
  @Permissions('tasks.write')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async upload(
    @UploadedFile() file: any,
    @Query('targetType') targetType: 'task' | 'project',
    @Query('targetId') targetId: string,
    @Req() req: any,
  ) {
    const a = await this.svc.upload({
      targetType,
      targetId,
      uploaderEmail: req.user?.email || 'unknown',
      fileName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
    });
    return { id: String(a._id), fileName: a.fileName };
  }

  @Get('/:id/download')
  @Permissions('tasks.read')
  async download(@Param('id') id: string, @Res() res: Response) {
    const { entity, buffer } = await this.svc.getFile(id);
    res.set({
      'Content-Type': entity.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${entity.fileName}"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  }

  @Delete('/:id')
  @Permissions('tasks.manage')
  async remove(@Param('id') id: string) {
    await this.svc.remove(id);
    return { ok: true };
  }
}
