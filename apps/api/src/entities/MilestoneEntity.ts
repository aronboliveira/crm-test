import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

/**
 * A milestone marks a key date / checkpoint within a project.
 * Tasks can optionally reference a milestone to group deliverables.
 */
@Entity('milestones')
export default class MilestoneEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Index()
  @Column()
  projectId!: string;

  @Column()
  title!: string;

  @Column()
  description?: string;

  /** ISO-8601 target date */
  @Column()
  dueAt!: string;

  /** Whether this milestone has been reached */
  @Column()
  completed!: boolean;

  @Column()
  completedAt?: string;

  @Column()
  createdAt!: string;

  @Column()
  updatedAt!: string;
}
