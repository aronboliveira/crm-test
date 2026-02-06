import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';
import type { RoleKey } from '../types/permissions';

@Entity('users')
export default class UserEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Index({ unique: true })
  @Column()
  email!: string;

  @Index({ unique: true })
  @Column()
  username!: string;

  @Column()
  passwordHash!: string;

  @Column()
  tokenVersion!: number;

  @Column()
  passwordUpdatedAt?: string;

  @Column()
  roles!: RoleKey[];

  @Column()
  disabled!: boolean;

  @Column()
  createdAt!: string;

  @Column()
  updatedAt!: string;

  @Column()
  lockedAt?: string;

  @Column()
  lockedReason?: string;

  @Column()
  resetSeries?: number;
}
