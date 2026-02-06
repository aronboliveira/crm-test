import { Entity, ObjectIdColumn, Column, Index } from 'typeorm';

@Entity('projects')
export class ProjectEntity {
  @ObjectIdColumn()
  id!: any;

  @Index()
  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  status!: 'active' | 'archived';

  @Column()
  createdAt!: string;

  @Column()
  updatedAt!: string;
}
