import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

export type ProjectStatus =
  | 'active'
  | 'archived'
  | 'planned'
  | 'blocked'
  | 'done';

@Entity('projects')
export default class ProjectEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Index()
  @Column()
  name!: string;

  @Index({ unique: true, sparse: true })
  @Column()
  code?: string;

  @Column()
  description?: string;

  @Index()
  @Column()
  status!: ProjectStatus;

  @Index()
  @Column()
  clientId?: string;

  @Column()
  ownerEmail?: string;

  /** Soft target date */
  @Column()
  dueAt?: string;

  /** Hard deadline */
  @Column()
  deadlineAt?: string;

  /** Tag keys (references TagEntity.key) */
  @Column()
  tags?: string[];

  /** Key of the template this project was created from (if any) */
  @Column()
  templateKey?: string;

  @Column()
  createdAt!: string;

  @Column()
  updatedAt!: string;
}
