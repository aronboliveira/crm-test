import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import AssistantChatMessageEntity, {
  type AssistantChatDirection,
} from '../../entities/AssistantChatMessageEntity';

type HistoryPageOptions = Readonly<{
  limit?: string | number;
  cursor?: string;
}>;

type HistoryPageResult = Readonly<{
  items: AssistantChatMessageEntity[];
  nextCursor: string | null;
}>;

@Injectable()
export class AssistantChatLogService {
  private readonly logger = new Logger(AssistantChatLogService.name);

  constructor(
    @InjectRepository(AssistantChatMessageEntity)
    private readonly repo: MongoRepository<AssistantChatMessageEntity>,
  ) {}

  async append(input: {
    userId: string;
    direction: AssistantChatDirection;
    text: string;
    status: 'queued' | 'sent' | 'received';
    meta?: Record<string, unknown>;
  }): Promise<void> {
    const userId = String(input.userId ?? '').trim();
    const text = String(input.text ?? '').trim();
    if (!userId || !text) {
      return;
    }

    const now = new Date().toISOString();

    try {
      await this.repo.save({
        id: new ObjectId().toHexString(),
        userId,
        direction: input.direction,
        text,
        transport: 'websocket',
        status: input.status,
        meta: input.meta,
        createdAt: now,
      } as any);
    } catch (error) {
      this.logger.warn(
        `Failed to persist assistant chat message: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async listRecentByUser(
    userId: string,
    limit = 30,
  ): Promise<AssistantChatMessageEntity[]> {
    const nextLimit = Number.isFinite(limit)
      ? Math.max(1, Math.floor(limit))
      : 30;
    const safeLimit = Math.min(nextLimit, 100);
    const safeUserId = String(userId ?? '').trim();
    if (!safeUserId) {
      return [];
    }

    try {
      const rows = await this.repo.find({
        where: { userId: safeUserId } as any,
        order: { createdAt: 'DESC' as any },
        take: safeLimit,
      });

      return rows.reverse();
    } catch (error) {
      this.logger.warn(
        `Failed to load assistant history: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  async listPageByUser(
    userId: string,
    options: HistoryPageOptions = {},
  ): Promise<HistoryPageResult> {
    const safeUserId = String(userId ?? '').trim();
    if (!safeUserId) {
      return { items: [], nextCursor: null };
    }

    const limit = AssistantChatLogService.clampInt(options.limit, 30, 1, 100);
    const cursor =
      typeof options.cursor === 'string' ? options.cursor.trim() : '';

    const where: any = { userId: safeUserId };
    if (cursor) {
      where.createdAt = { $lt: cursor };
    }

    try {
      const rows = await this.repo.find({
        where,
        order: { createdAt: 'DESC' } as any,
        take: limit,
      } as any);

      const nextCursor =
        rows.length > 0 ? String(rows[rows.length - 1].createdAt || '') : null;

      return { items: rows, nextCursor };
    } catch (error) {
      this.logger.warn(
        `Failed to paginate assistant history: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { items: [], nextCursor: null };
    }
  }

  private static clampInt(
    v: unknown,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const n = typeof v === 'string' || typeof v === 'number' ? Number(v) : NaN;
    const x = Number.isFinite(n) ? Math.trunc(n) : fallback;
    return x < min ? min : x > max ? max : x;
  }
}
