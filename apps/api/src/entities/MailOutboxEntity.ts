import { Column, Entity, Index, ObjectIdColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('mail_outbox')
export default class MailOutboxEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Index()
  @Column()
  to!: string;

  @Index()
  @Column()
  kind!: 'password_invite' | 'generic';

  @Index()
  @Column()
  createdAt!: string;

  @Index()
  @Column()
  subject!: string;

  @Column()
  text?: string;

  @Column()
  html?: string;

  @Column()
  meta?: Record<string, any>;
}
