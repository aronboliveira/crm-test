import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import NotificationEntity, {
  NotificationType,
  NotificationPriority,
} from '../../entities/NotificationEntity';

/**
 * Create notification DTO
 */
export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  source?: string;
  externalId?: string;
  link?: string;
  actionLabel?: string;
  actionUrl?: string;
  entityType?: string;
  entityId?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

/**
 * Notification query filters
 */
export interface NotificationFilters {
  userId: string;
  read?: boolean;
  type?: NotificationType;
  source?: string;
  limit?: number;
  offset?: number;
}

/**
 * Notifications Service
 *
 * Manages user notifications from various sources including:
 * - Integration activities (NextCloud, Zimbra, WhatsApp)
 * - Task/project updates
 * - System alerts
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepo: MongoRepository<NotificationEntity>,
  ) {}

  /**
   * Create a new notification
   */
  async create(dto: CreateNotificationDto): Promise<NotificationEntity> {
    const notification = this.notificationRepo.create({
      ...dto,
      priority: dto.priority || NotificationPriority.NORMAL,
      read: false,
      createdAt: new Date(),
    });

    await this.notificationRepo.save(notification);
    this.logger.log(
      `Created notification for user ${dto.userId}: ${dto.title}`,
    );

    return notification;
  }

  /**
   * Create multiple notifications (bulk)
   */
  async createBulk(
    dtos: CreateNotificationDto[],
  ): Promise<NotificationEntity[]> {
    const notifications = dtos.map((dto) =>
      this.notificationRepo.create({
        ...dto,
        priority: dto.priority || NotificationPriority.NORMAL,
        read: false,
        createdAt: new Date(),
      }),
    );

    await this.notificationRepo.save(notifications);
    this.logger.log(`Created ${notifications.length} notifications`);

    return notifications;
  }

  /**
   * Get notifications for a user
   */
  async findForUser(filters: NotificationFilters): Promise<{
    notifications: NotificationEntity[];
    total: number;
    unreadCount: number;
  }> {
    const { userId, read, type, source, limit = 50, offset = 0 } = filters;

    const query: Record<string, unknown> = { userId };

    if (read !== undefined) {
      query.read = read;
    }
    if (type) {
      query.type = type;
    }
    if (source) {
      query.source = source;
    }

    const [notifications, total] = await this.notificationRepo.findAndCount({
      where: query,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    // Count unread notifications
    const unreadCount = await this.notificationRepo.count({
      where: { userId, read: false },
    });

    return {
      notifications,
      total,
      unreadCount,
    };
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, read: false },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const notification = await this.notificationRepo.findOne({
      where: {
        _id: new ObjectId(notificationId),
        userId,
      } as any,
    });

    if (!notification) {
      return false;
    }

    notification.markAsRead();
    await this.notificationRepo.save(notification);

    return true;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationRepo.updateMany(
      { userId, read: false },
      { $set: { read: true, readAt: new Date() } },
    );

    return result.modifiedCount || 0;
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.notificationRepo.deleteOne({
      _id: new ObjectId(notificationId),
      userId,
    } as any);

    return (result.deletedCount || 0) > 0;
  }

  /**
   * Delete all read notifications for a user
   */
  async deleteAllRead(userId: string): Promise<number> {
    const result = await this.notificationRepo.deleteMany({
      userId,
      read: true,
    });

    return result.deletedCount || 0;
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.notificationRepo.deleteMany({
      expiresAt: { $lte: new Date() },
    });

    const count = result.deletedCount || 0;
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} expired notifications`);
    }

    return count;
  }

  /**
   * Check if a notification with the same external ID already exists
   * (to avoid duplicates from integration polling)
   */
  async existsByExternalId(
    source: string,
    externalId: string,
  ): Promise<boolean> {
    const count = await this.notificationRepo.count({
      where: { source, externalId },
    });

    return count > 0;
  }

  /**
   * Get latest notification timestamp for a source
   * (useful for incremental polling)
   */
  async getLatestTimestamp(
    userId: string,
    source: string,
  ): Promise<Date | null> {
    const latest = await this.notificationRepo.findOne({
      where: { userId, source },
      order: { createdAt: 'DESC' },
    });

    return latest?.createdAt || null;
  }
}
