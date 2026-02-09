import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

/**
 * File attachment metadata for tasks and projects.
 *
 * Stores file metadata with configurable storage backend.
 * Currently uses local disk storage; supports Azure Blob Storage.
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
   * Storage path for the attachment file.
   * Contains relative path for local storage or URL for cloud storage.
   */
  @Column()
  storagePath!: string;

  @Column()
  createdAt!: string;
}
