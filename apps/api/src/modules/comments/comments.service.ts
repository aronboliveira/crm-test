import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import CommentEntity from '../../entities/CommentEntity';

type TargetType = 'task' | 'project';

@Injectable()
export default class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    @InjectRepository(CommentEntity)
    private readonly repo: MongoRepository<CommentEntity>,
  ) {
    this.logger.log('CommentsService initialized');
  }

  async listByTarget(
    targetType: TargetType,
    targetId: string,
  ): Promise<readonly CommentEntity[]> {
    return this.repo.find({
      where: { targetType, targetId } as any,
      order: { createdAt: 'ASC' } as any,
    });
  }

  async create(dto: {
    targetType: TargetType;
    targetId: string;
    authorEmail: string;
    body: string;
  }): Promise<CommentEntity> {
    if (!dto.body?.trim()) throw new BadRequestException('Body is required');
    const now = new Date().toISOString();
    return this.repo.save({
      targetType: dto.targetType,
      targetId: dto.targetId,
      authorEmail: dto.authorEmail,
      body: dto.body.trim(),
      createdAt: now,
      updatedAt: now,
    } as any);
  }

  async update(id: string, body: string): Promise<CommentEntity> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id');
    const cur = await this.repo.findOne({ where: { _id: oid } as any });
    if (!cur) throw new NotFoundException('Comment not found');
    await this.repo.update(
      oid as any,
      {
        body: body.trim(),
        updatedAt: new Date().toISOString(),
      } as any,
    );
    return (await this.repo.findOne({ where: { _id: oid } as any }))!;
  }

  async remove(id: string): Promise<void> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id');
    await this.repo.delete(oid as any);
  }
}
