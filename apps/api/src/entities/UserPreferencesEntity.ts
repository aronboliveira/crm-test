import { Column, Entity, Index, ObjectIdColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

export type ThemeMode = 'light' | 'dark' | 'system';

@Entity('user_preferences')
export default class UserPreferencesEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Index({ unique: true })
  @Column()
  userId!: string;

  @Column()
  theme!: ThemeMode;

  @Column()
  notifyEmail!: boolean;

  @Column()
  notifyBrowser!: boolean;

  @Column()
  notifyTaskDue!: boolean;

  @Column()
  notifyMentions!: boolean;

  @Column()
  notifySecurity!: boolean;

  @Column()
  notifyProduct!: boolean;

  @Column()
  updatedAt!: string;
}
