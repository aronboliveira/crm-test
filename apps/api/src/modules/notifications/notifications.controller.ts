import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  BadRequestException,
} from '@nestjs/common';
import NotificationEntity, {
  NotificationType,
} from '../../entities/NotificationEntity';
import {
  NotificationsService,
  type NotificationFilters,
} from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(
    @Query('userId') userId?: string,
    @Query('read') read?: string,
    @Query('type') type?: NotificationType,
    @Query('source') source?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{
    notifications: NotificationEntity[];
    total: number;
    unreadCount: number;
  }> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const filters: NotificationFilters = {
      userId,
      read: read === undefined ? undefined : read === 'true',
      type,
      source,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    return this.notifications.findForUser(filters);
  }

  @Get('unread-count')
  async unreadCount(
    @Query('userId') userId?: string,
  ): Promise<{ count: number }> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const count = await this.notifications.getUnreadCount(userId);
    return { count };
  }

  @Post(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ): Promise<{ success: boolean }> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const success = await this.notifications.markAsRead(id, userId);
    return { success };
  }

  @Post('read-all')
  async markAllAsRead(
    @Query('userId') userId?: string,
  ): Promise<{ count: number }> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const count = await this.notifications.markAllAsRead(userId);
    return { count };
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ): Promise<{ success: boolean }> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const success = await this.notifications.delete(id, userId);
    return { success };
  }
}
