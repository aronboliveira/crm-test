import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import NoteEntity from '../../entities/NoteEntity';

type TargetType = 'task' | 'project';

@Injectable()
export default class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(
    @InjectRepository(NoteEntity)
    private readonly repo: MongoRepository<NoteEntity>,
  ) {
    this.logger.log('NotesService initialized');
  }

  async listByTarget(
    targetType: TargetType,
    targetId: string,
  ): Promise<readonly NoteEntity[]> {
    return this.repo.find({
      where: { targetType, targetId } as any,
      order: { createdAt: 'DESC' } as any,
    });
  }

  async create(dto: {
    targetType: TargetType;
    targetId: string;
    authorEmail: string;
    title: string;
    body: string;
  }): Promise<NoteEntity> {
    if (!dto.title?.trim()) throw new BadRequestException('Title is required');
    const now = new Date().toISOString();
    return this.repo.save({
      targetType: dto.targetType,
      targetId: dto.targetId,
      authorEmail: dto.authorEmail,
      title: dto.title.trim(),
      body: (dto.body || '').trim(),
      createdAt: now,
      updatedAt: now,
    } as any);
  }

  async update(
    id: string,
    patch: { title?: string; body?: string },
  ): Promise<NoteEntity> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id');
    const cur = await this.repo.findOne({ where: { _id: oid } as any });
    if (!cur) throw new NotFoundException('Note not found');
    const up: any = { updatedAt: new Date().toISOString() };
    if (typeof patch.title === 'string') up.title = patch.title.trim();
    if (typeof patch.body === 'string') up.body = patch.body.trim();
    await this.repo.update(oid as any, up);
    return (await this.repo.findOne({ where: { _id: oid } as any }))!;
  }

  async remove(id: string): Promise<void> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id');
    await this.repo.delete(oid as any);
  }
}
