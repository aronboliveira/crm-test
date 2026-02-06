import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';
import type { PermissionKey, RoleKey } from '../types/permissions';

@Entity('roles')
export default class RoleEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Index({ unique: true })
  @Column()
  key!: RoleKey;

  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column()
  permissionKeys!: PermissionKey[];
}
