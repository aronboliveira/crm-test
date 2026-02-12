import { Column, Entity, Index, ObjectIdColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

export type AssistantChatDirection = 'user' | 'assistant' | 'system';

@Entity('assistant_chat_messages')
export default class AssistantChatMessageEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Index()
  @Column()
  id!: string;

  @Index()
  @Column()
  userId!: string;

  @Column()
  direction!: AssistantChatDirection;

  @Column()
  text!: string;

  @Column()
  transport!: 'websocket';

  @Column()
  status!: 'queued' | 'sent' | 'received';

  @Column()
  meta?: Record<string, unknown>;

  @Index()
  @Column()
  createdAt!: string;
}
