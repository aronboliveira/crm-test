import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('password_reset_requests')
export default class PasswordResetRequestEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Index()
  @Column()
  email!: string;

  @Index({ unique: true })
  @Column()
  tokenHash!: string;

  @Index()
  @Column()
  createdAt!: string;

  @Index()
  @Column()
  expiresAt!: string;

  @Index()
  @Column()
  usedAt?: string;

  @Index()
  @Column()
  ipHash?: string;

  @Column()
  userAgent?: string;

  @Index()
  @Column()
  series!: number;

  @Index()
  @Column()
  consumedAt?: string;
}
