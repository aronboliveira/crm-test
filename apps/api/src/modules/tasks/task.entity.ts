import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

export type TaskStatus = 'todo' | 'doing' | 'done' | 'blocked';
export type TaskPriority = 1 | 2 | 3 | 4 | 5;

@Entity('tasks')
export default class TaskEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Index()
  @Column()
  projectId!: string;

  @Index()
  @Column()
  title!: string;

  @Column()
  description?: string;

  @Index()
  @Column()
  status!: TaskStatus;

  @Index()
  @Column()
  priority!: TaskPriority;

  @Index()
  @Column()
  dueAt?: string;

  @Column()
  createdAt!: string;

  @Column()
  updatedAt!: string;
}
