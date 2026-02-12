import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectId } from 'mongodb';
import type {
  IntegrationSyncJobState,
  IntegrationSyncSummary,
} from '../modules/integrations/types';

/**
 * Persisted lifecycle and outcome for each integration sync trigger.
 */
@Entity('integration_sync_jobs')
@Index(['jobId'], { unique: true })
@Index(['integrationId'])
export default class IntegrationSyncJobEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  jobId!: string;

  @Column()
  integrationId!: string;

  @Column()
  status!: IntegrationSyncJobState;

  @Column()
  attempt!: number;

  @Column()
  maxAttempts!: number;

  @Column({ type: 'json' })
  summary!: IntegrationSyncSummary;

  @Column()
  lastError?: string;

  @Column()
  startedAt?: Date;

  @Column()
  finishedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
