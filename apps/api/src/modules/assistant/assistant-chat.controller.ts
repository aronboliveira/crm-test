import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import { AssistantChatLogService } from './assistant-chat-log.service';

type HistoryQuery = Readonly<{
  limit?: string;
  cursor?: string;
}>;

@Controller('assistant/chat')
@UseGuards(JwtAuthGuard)
export class AssistantChatController {
  constructor(private readonly logService: AssistantChatLogService) {}

  @Get('history')
  async history(@Req() req: any, @Query() query: HistoryQuery) {
    const userId = typeof req?.user?.id === 'string' ? req.user.id.trim() : '';

    const page = await this.logService.listPageByUser(userId, {
      limit: query.limit,
      cursor: query.cursor,
    });

    return {
      items: page.items.map((item) => ({
        id: String(item.id),
        direction: item.direction,
        text: item.text,
        status: item.status,
        createdAt: item.createdAt,
      })),
      nextCursor: page.nextCursor,
    };
  }
}
