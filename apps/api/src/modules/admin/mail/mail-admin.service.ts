import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import MailOutboxEntity from '../../../entities/MailOutboxEntity';

type Q = Readonly<{
  q?: string;
  cursor?: string;
  limit?: string;
  kind?: string;
}>;

@Injectable()
export default class MailAdminService {
  private readonly logger = new Logger(MailAdminService.name);

  constructor(
    @InjectRepository(MailOutboxEntity)
    private readonly repo: MongoRepository<MailOutboxEntity>,
  ) {
    try {
      if (!repo) {
        this.logger.error('Repository not injected');
        throw new Error('Repository initialization failed');
      }
      this.logger.log('MailAdminService initialized');
    } catch (error) {
      this.logger.error('MailAdminService constructor error:', error);
      throw error;
    }
  }

  async list(q: Q) {
    try {
      const limit = MailAdminService.clampInt(q.limit, 50, 10, 300);
      const where: any = {};

      const kind = typeof q.kind === 'string' ? q.kind.trim() : '';
      kind ? (where.kind = kind) : void 0;

      const s = typeof q.q === 'string' ? q.q.trim() : '';
      s
        ? (where.$or = [
            { to: { $regex: s, $options: 'i' } },
            { subject: { $regex: s, $options: 'i' } },
          ])
        : void 0;

      const cursor = typeof q.cursor === 'string' ? q.cursor.trim() : '';
      cursor ? (where.createdAt = { $lt: cursor }) : void 0;

      const rows = await this.repo.find({
        where,
        order: { createdAt: 'DESC' } as any,
        take: limit,
      } as any);

      const nextCursor = rows.length
        ? String((rows[rows.length - 1] as any).createdAt || '')
        : null;
      return { items: rows, nextCursor };
    } catch (error) {
      this.logger.error('Error listing mail outbox:', error);
      throw error;
    }
  }

  async read(id: string) {
    try {
      const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
      if (!oid) throw new BadRequestException('Invalid id');

      const row = await this.repo.findOne({ where: { _id: oid } as any });
      if (!row) throw new NotFoundException('Not found');
      return row;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(`Error reading mail ${id}:`, error);
      throw error;
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
