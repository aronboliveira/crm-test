import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectId } from 'mongodb';

/**
 * Idempotent mirror of normalized external records synced from integrations.
 */
@Entity('integration_sync_records')
@Index(['integrationId', 'recordType'])
@Index(['integrationId', 'recordType', 'externalId'], { unique: true })
export default class IntegrationSyncRecordEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  integrationId!: string;

  @Column()
  recordType!: string;

  @Column()
  externalId!: string;

  @Column()
  checksum!: string;

  @Column({ type: 'json' })
  payload!: Record<string, unknown>;

  @Column()
  isDeleted!: boolean;

  @Column()
  firstSeenAt!: Date;

  @Column()
  lastSeenAt!: Date;

  @Column()
  lastSyncedAt!: Date;

  @Column()
  lastJobId!: string;

  @Column()
  deletedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
