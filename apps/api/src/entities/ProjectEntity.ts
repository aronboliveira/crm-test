import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

export type ProjectStatus = 'active' | 'archived';

@Entity('projects')
export default class ProjectEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Index()
  @Column()
  name!: string;

  @Column()
  description?: string;

  @Index()
  @Column()
  status!: ProjectStatus;

  @Column()
  createdAt!: string;

  @Column()
  updatedAt!: string;
}
