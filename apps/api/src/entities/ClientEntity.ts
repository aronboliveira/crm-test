import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('clients')
export default class ClientEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  id!: string;

  @Index()
  @Column()
  name!: string;

  @Column()
  email?: string;

  @Column()
  phone?: string;

  @Column()
  company?: string;

  @Column()
  notes?: string;

  @Column()
  createdAt!: string;

  @Column()
  updatedAt!: string;
}
