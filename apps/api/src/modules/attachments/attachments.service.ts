import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import AttachmentEntity from '../../entities/AttachmentEntity';

/**
 * Handles file attachment storage and retrieval.
 *
 * Supports local disk storage with pluggable cloud storage backends
 * (Azure Blob Storage, AWS S3, etc.).
 */
@Injectable()
export default class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  /** Root directory for file uploads */
  private readonly uploadsDir: string;

  constructor(
    @InjectRepository(AttachmentEntity)
    private readonly repo: MongoRepository<AttachmentEntity>,
  ) {
    this.uploadsDir = process.env.UPLOADS_DIR || '/tmp/crm-uploads';
    try {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    } catch (err) {
      this.logger.warn('Could not create uploads dir:', err);
    }
    this.logger.log(`AttachmentsService initialized (dir=${this.uploadsDir})`);
  }

  /**
   * Lists all attachments for a given target entity.
   * @param targetType - The type of entity ('task' or 'project')
   * @param targetId - The ID of the target entity
   * @returns Array of attachment metadata sorted by creation date
   */
  async listByTarget(
    targetType: 'task' | 'project',
    targetId: string,
  ): Promise<readonly AttachmentEntity[]> {
    return this.repo.find({
      where: { targetType, targetId } as any,
      order: { createdAt: 'DESC' } as any,
    });
  }

  /**
   * Stores a file and persists its metadata.
   * @param dto - Upload data including file buffer and metadata
   * @returns The created attachment entity
   * @throws BadRequestException if file buffer is empty
   */
  async upload(dto: {
    targetType: 'task' | 'project';
    targetId: string;
    uploaderEmail: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<AttachmentEntity> {
    if (!dto.buffer?.length) throw new BadRequestException('Empty file');

    const safeFileName = dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${new ObjectId().toHexString()}-${safeFileName}`;
    const relPath = path.join('attachments', uniqueName);
    const absPath = path.join(this.uploadsDir, relPath);

    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, dto.buffer);

    const attachment = await this.repo.save({
      targetType: dto.targetType,
      targetId: dto.targetId,
      uploaderEmail: dto.uploaderEmail,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      sizeBytes: dto.buffer.length,
      storagePath: relPath,
      createdAt: new Date().toISOString(),
    } as any);

    this.logger.log(
      `Attachment stored: ${relPath} (${dto.buffer.length} bytes)`,
    );
    return attachment;
  }

  /**
   * Retrieves a file and its metadata by ID.
   * @param id - The attachment ID
   * @returns The attachment entity and file buffer
   * @throws BadRequestException if ID is invalid
   * @throws NotFoundException if attachment or file not found
   */
  async getFile(id: string): Promise<{
    entity: AttachmentEntity;
    buffer: Buffer;
  }> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id');
    const entity = await this.repo.findOne({ where: { _id: oid } as any });
    if (!entity) throw new NotFoundException('Attachment not found');

    const absPath = path.join(this.uploadsDir, entity.storagePath);
    if (!fs.existsSync(absPath))
      throw new NotFoundException('File not found on disk');
    const buffer = fs.readFileSync(absPath);
    return { entity, buffer };
  }

  /**
   * Removes an attachment and its associated file.
   * @param id - The attachment ID to remove
   * @throws BadRequestException if ID is invalid
   */
  async remove(id: string): Promise<void> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id');
    const entity = await this.repo.findOne({ where: { _id: oid } as any });
    if (entity) {
      try {
        fs.unlinkSync(path.join(this.uploadsDir, entity.storagePath));
      } catch {
        /* file may already be gone */
      }
    }
    await this.repo.delete(oid as any);
  }
}
