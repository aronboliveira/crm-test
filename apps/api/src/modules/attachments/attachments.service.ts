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
 * Handles file attachment storage on local disk.
 *
 * // TODO: Replace local fs operations with @azure/storage-blob
 * //       BlobServiceClient when Azure Blob Storage is activated.
 * //       See also: AttachmentEntity.storagePath comment.
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
    // Ensure uploads directory exists
    try {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    } catch (err) {
      this.logger.warn('Could not create uploads dir:', err);
    }
    this.logger.log(`AttachmentsService initialized (dir=${this.uploadsDir})`);
  }

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
   * Store a file on local disk and persist metadata to MongoDB.
   *
   * // TODO: When activating Azure Blob Storage, replace the
   * //       fs.writeFileSync call with a BlobClient.upload() call
   * //       and store the blob URL in `storagePath`.
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

    // Ensure sub-dir exists
    fs.mkdirSync(path.dirname(absPath), { recursive: true });

    // Write to local disk
    // TODO: Replace with Azure Blob Storage upload:
    // const blobClient = containerClient.getBlockBlobClient(uniqueName);
    // await blobClient.upload(dto.buffer, dto.buffer.length);
    // const storagePath = blobClient.url;
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

  async getFile(id: string): Promise<{
    entity: AttachmentEntity;
    buffer: Buffer;
  }> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id');
    const entity = await this.repo.findOne({ where: { _id: oid } as any });
    if (!entity) throw new NotFoundException('Attachment not found');

    const absPath = path.join(this.uploadsDir, entity.storagePath);
    // TODO: Replace with Azure Blob download:
    // const blobClient = containerClient.getBlockBlobClient(entity.storagePath);
    // const downloadResponse = await blobClient.download();
    if (!fs.existsSync(absPath))
      throw new NotFoundException('File not found on disk');
    const buffer = fs.readFileSync(absPath);
    return { entity, buffer };
  }

  async remove(id: string): Promise<void> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id');
    const entity = await this.repo.findOne({ where: { _id: oid } as any });
    if (entity) {
      // TODO: Replace with Azure Blob delete:
      // const blobClient = containerClient.getBlockBlobClient(entity.storagePath);
      // await blobClient.deleteIfExists();
      try {
        fs.unlinkSync(path.join(this.uploadsDir, entity.storagePath));
      } catch {
        /* file may already be gone */
      }
    }
    await this.repo.delete(oid as any);
  }
}
