import { Column, Entity, Index, ObjectIdColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

export type MessageChannel = 'whatsapp' | 'email';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageEventType =
  | 'sent'
  | 'delivered'
  | 'read'
  | 'replied'
  | 'opened'
  | 'clicked';

@Entity('message_events')
export default class MessageEventEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  id!: string;

  @Index()
  @Column()
  clientId!: string;

  @Index()
  @Column()
  channel!: MessageChannel;

  @Column()
  eventType!: MessageEventType;

  @Column()
  direction?: MessageDirection;

  @Column()
  meta?: Record<string, any>;

  @Index()
  @Column()
  createdAt!: string;
}
