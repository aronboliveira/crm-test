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
 * Persisted integration configuration.
 *
 * Stores user-provided credentials/settings so integrations do not depend on
 * environment variables and survive application restarts.
 */
@Entity('integration_configs')
@Index(['integrationId'], { unique: true })
export default class IntegrationConfigEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  integrationId!: string;

  @Column({ type: 'json' })
  config!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
