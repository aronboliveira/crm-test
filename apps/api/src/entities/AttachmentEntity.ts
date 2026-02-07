import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

/**
 * File attachment metadata for tasks / projects.
 *
 * **Storage strategy (current):** local disk at `UPLOADS_DIR`.
 * The `storagePath` column holds the relative path under that directory.
 *
 * // TODO: When ready to activate Azure Blob Storage, replace the local
 * //       file-system calls in AttachmentsService with
 * //       @azure/storage-blob BlobServiceClient operations and store
 * //       the blob URL in `storagePath` instead.
 */
@Entity('attachments')
export default class AttachmentEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  /** 'task' | 'project' */
  @Index()
  @Column()
  targetType!: 'task' | 'project';

  @Index()
  @Column()
  targetId!: string;

  @Index()
  @Column()
  uploaderEmail!: string;

  /** Original file name */
  @Column()
  fileName!: string;

  /** MIME type */
  @Column()
  mimeType!: string;

  /** Size in bytes */
  @Column()
  sizeBytes!: number;

  /**
   * Relative path on local disk (e.g. "attachments/abc123-file.pdf").
   * // TODO: Switch to Azure Blob URL when cloud storage is activated.
   */
  @Column()
  storagePath!: string;

  @Column()
  createdAt!: string;
}
