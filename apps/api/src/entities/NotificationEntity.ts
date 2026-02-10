import {
  Entity,
  Column,
  ObjectIdColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ObjectId } from 'mongodb';

/**
 * Notification types
 */
export enum NotificationType {
  // Email notifications
  NEW_EMAIL = 'new_email',
  EMAIL_SENT = 'email_sent',

  // Calendar/Call notifications
  UPCOMING_CALL = 'upcoming_call',
  MISSED_CALL = 'missed_call',
  CALENDAR_EVENT = 'calendar_event',

  // File/Document notifications
  FILE_SHARED = 'file_shared',
  FILE_UPDATED = 'file_updated',
  FILE_COMMENTED = 'file_commented',

  // Integration notifications
  INTEGRATION_ACTIVITY = 'integration_activity',
  INTEGRATION_ERROR = 'integration_error',
  SYNC_COMPLETED = 'sync_completed',

  // Task/Project notifications
  TASK_ASSIGNED = 'task_assigned',
  TASK_DUE_SOON = 'task_due_soon',
  PROJECT_UPDATE = 'project_update',
  MILESTONE_REACHED = 'milestone_reached',

  // Client/Lead notifications
  NEW_LEAD = 'new_lead',
  CLIENT_MESSAGE = 'client_message',
  WHATSAPP_MESSAGE = 'whatsapp_message',

  // System notifications
  SYSTEM_ALERT = 'system_alert',
  MAINTENANCE = 'maintenance',
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Notification Entity
 *
 * Stores system notifications for users from various sources:
 * - Integration activities (NextCloud files, Zimbra emails)
 * - Task/Project updates
 * - System alerts
 */
@Entity('notifications')
@Index(['userId', 'read', 'createdAt'])
@Index(['userId', 'type'])
@Index(['expiresAt'])
export default class NotificationEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  /**
   * Notification type
   */
  @Column()
  type!: NotificationType;

  /**
   * User ID who should receive this notification
   */
  @Column()
  @Index()
  userId!: string;

  /**
   * Notification title
   */
  @Column()
  title!: string;

  /**
   * Notification message/body
   */
  @Column()
  message!: string;

  /**
   * Priority level
   */
  @Column({ default: NotificationPriority.NORMAL })
  priority!: NotificationPriority;

  /**
   * Read status
   */
  @Column({ default: false })
  @Index()
  read!: boolean;

  /**
   * Read timestamp
   */
  @Column({ nullable: true })
  readAt?: Date;

  /**
   * Integration source (nextcloud, zimbra, whatsapp, etc.)
   */
  @Column({ nullable: true })
  @Index()
  source?: string;

  /**
   * External ID from integration (e.g., NextCloud activity ID)
   */
  @Column({ nullable: true })
  externalId?: string;

  /**
   * Link/URL to the related resource
   */
  @Column({ nullable: true })
  link?: string;

  /**
   * Action button label (optional)
   */
  @Column({ nullable: true })
  actionLabel?: string;

  /**
   * Action URL/route (optional)
   */
  @Column({ nullable: true })
  actionUrl?: string;

  /**
   * Related entity type (project, task, client, etc.)
   */
  @Column({ nullable: true })
  entityType?: string;

  /**
   * Related entity ID
   */
  @Column({ nullable: true })
  entityId?: string;

  /**
   * Icon name or URL
   */
  @Column({ nullable: true })
  icon?: string;

  /**
   * Additional metadata (JSON)
   */
  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>;

  /**
   * Expiration date (for auto-cleanup of old notifications)
   */
  @Column({ nullable: true })
  @Index()
  expiresAt?: Date;

  /**
   * Creation timestamp
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * Get notification ID as string
   */
  get id(): string {
    return this._id.toString();
  }

  /**
   * Check if notification is expired
   */
  isExpired(): boolean {
    return this.expiresAt ? this.expiresAt < new Date() : false;
  }

  /**
   * Mark as read
   */
  markAsRead(): void {
    this.read = true;
    this.readAt = new Date();
  }
}
