import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

export type TemplateTaskBlueprint = Readonly<{
  title: string;
  description?: string;
  priority: 1 | 2 | 3 | 4 | 5;
  offsetDays: number; // Days after project start for dueAt
}>;

/**
 * A reusable project template with pre-defined task blueprints.
 * When a user picks a template during project creation, the tasks
 * are automatically generated from the `tasks` array.
 */
@Entity('project_templates')
export default class ProjectTemplateEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Index({ unique: true })
  @Column()
  key!: string;

  @Column()
  name!: string;

  @Column()
  description?: string;

  @Column()
  category?: string;

  /** Pre-defined task blueprints */
  @Column()
  tasks!: TemplateTaskBlueprint[];

  /** Default tags to attach */
  @Column()
  defaultTags?: string[];

  @Column()
  createdAt!: string;

  @Column()
  updatedAt!: string;
}
