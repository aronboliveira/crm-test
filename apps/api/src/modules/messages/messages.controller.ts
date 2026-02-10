import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import PermissionsGuard from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @Post('events')
  @Permissions('clients.write')
  async createEvent(@Body() dto: any) {
    return this.service.createEvent(dto);
  }

  @Get('clients/:id/analytics')
  @Permissions('clients.read')
  async getClientAnalytics(@Param('id') id: string) {
    return this.service.getClientAnalytics(id);
  }
}
