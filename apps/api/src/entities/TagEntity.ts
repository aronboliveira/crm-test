import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

/**
 * A tag / label that can be attached to projects or tasks.
 * Stored once; referenced by key from project/task documents.
 */
@Entity('tags')
export default class TagEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Index({ unique: true })
  @Column()
  key!: string;

  @Column()
  label!: string;

  /** Hex colour, e.g. "#e74c3c" */
  @Column()
  color!: string;

  @Column()
  createdAt!: string;
}
