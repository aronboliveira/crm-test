import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

export type TaskStatus = 'todo' | 'doing' | 'done' | 'blocked';
export type TaskPriority = 1 | 2 | 3 | 4 | 5;

export interface Subtask {
  id: string;
  text: string;
  done: boolean;
  order: number;
}

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

  @Column()
  assigneeEmail?: string;

  /** User _id of the assigned person (optional) */
  @Index()
  @Column()
  assigneeId?: string;

  /** Milestone _id this task contributes to */
  @Index()
  @Column()
  milestoneId?: string;

  /** Tag keys (references TagEntity.key) */
  @Column()
  tags?: string[];

  @Index()
  @Column()
  dueAt?: string;

  /** Hard deadline — after this date the task is considered overdue */
  @Column()
  deadlineAt?: string;

  @Column()
  subtasks?: Subtask[];

  @Column()
  createdAt!: string;

  @Column()
  updatedAt!: string;
}
