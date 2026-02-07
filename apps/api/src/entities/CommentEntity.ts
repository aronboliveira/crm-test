import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

/**
 * Comment attached to a task or project.
 * `targetType` discriminates between the two collections.
 */
@Entity('comments')
export default class CommentEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  /** 'task' | 'project' */
  @Index()
  @Column()
  targetType!: 'task' | 'project';

  /** The _id of the task or project */
  @Index()
  @Column()
  targetId!: string;

  @Index()
  @Column()
  authorEmail!: string;

  @Column()
  body!: string;

  @Column()
  createdAt!: string;

  @Column()
  updatedAt!: string;
}
