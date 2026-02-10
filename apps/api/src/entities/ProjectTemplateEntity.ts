import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

export type TemplateTaskBlueprint = Readonly<{
  title: string;
  description?: string;
  priority: 1 | 2 | 3 | 4 | 5;
  offsetDays: number; // Days after project start for dueAt
}>;

/**
 * Template category types for categorization
 */
export type TemplateCategory =
  | 'email'
  | 'project'
  | 'task'
  | 'notification'
  | 'report';

/**
 * A reusable project template with pre-defined task blueprints.
 * When a user picks a template during project creation, the tasks
 * are automatically generated from the `tasks` array.
 *
 * @version 1.4.0 - Added email template fields (content, subject, isActive, metadata)
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
  category?: TemplateCategory | string;

  /**
   * HTML content for email templates (sanitized via DOMPurify)
   * @since 1.4.0
   */
  @Column()
  content?: string;

  /**
   * Email subject line for email templates
   * @since 1.4.0
   */
  @Column()
  subject?: string;

  /**
   * Whether the template is active and can be used
   * @since 1.4.0
   */
  @Column()
  isActive?: boolean;

  /**
   * Additional metadata for the template (JSON object)
   * @since 1.4.0
   */
  @Column()
  metadata?: Record<string, unknown>;

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
