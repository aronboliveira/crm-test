import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

/**
 * Internal note attached to a task or project.
 * Unlike comments, notes are not visible to all team members —
 * only the author and admins can see them.
 */
@Entity('notes')
export default class NoteEntity {
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
  authorEmail!: string;

  @Column()
  title!: string;

  @Column()
  body!: string;

  @Column()
  createdAt!: string;

  @Column()
  updatedAt!: string;
}
