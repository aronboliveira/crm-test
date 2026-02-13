import { Column, Entity, Index, ObjectIdColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

export type ImportIngestionDuplicateStrategy =
  | 'skip-duplicates'
  | 'update-on-match'
  | 'strict-fail';

export type ImportIngestionRunStatus = 'processing' | 'completed' | 'failed';

@Entity('import_ingestion_runs')
export default class ImportIngestionRunEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Index({ unique: true })
  @Column()
  key!: string;

  @Index()
  @Column()
  ownerEmail!: string;

  @Column()
  format!: string;

  @Column()
  duplicateStrategy!: ImportIngestionDuplicateStrategy;

  @Column()
  fileHash!: string;

  @Column()
  fileName?: string;

  @Column()
  mimeType?: string;

  @Column()
  status!: ImportIngestionRunStatus;

  @Column()
  totalRows!: number;

  @Column()
  projects!: number;

  @Column()
  tasks!: number;

  @Column()
  skipped!: number;

  @Column()
  duplicateRowsInPayload!: number;

  @Column()
  error?: string;

  @Column()
  completedAt?: string;

  @Column()
  createdAt!: string;

  @Column()
  updatedAt!: string;
}
