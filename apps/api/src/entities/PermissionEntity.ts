import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';
import type { PermissionKey } from '../types/permissions';

@Entity('permissions')
export default class PermissionEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Index({ unique: true })
  @Column()
  key!: PermissionKey;

  @Column()
  description!: string;
}
