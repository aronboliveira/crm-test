import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import ProjectTemplateEntity from '../../entities/ProjectTemplateEntity';

@Injectable()
export default class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectRepository(ProjectTemplateEntity)
    private readonly repo: MongoRepository<ProjectTemplateEntity>,
  ) {
    this.logger.log('TemplatesService initialized');
  }

  /* ── queries ──────────────────────────────────────────────── */

  async list(): Promise<readonly ProjectTemplateEntity[]> {
    return this.repo.find({ take: 200 } as any);
  }

  async findByKey(key: string): Promise<ProjectTemplateEntity> {
    const row = await this.repo.findOne({ where: { key } as any });
    if (!row) throw new NotFoundException('Template not found');
    return row;
  }

  /* ── mutations ────────────────────────────────────────────── */

  async create(dto: {
    key: string;
    name: string;
    description?: string;
    category?: string;
    tasks?: Array<{
      title: string;
      description?: string;
      priority?: number;
      offsetDays?: number;
    }>;
    defaultTags?: string[];
  }): Promise<ProjectTemplateEntity> {
    const key = dto.key?.trim().toLowerCase().replace(/\s+/g, '-');
    if (!key) throw new BadRequestException('key is required');
    if (!dto.name?.trim()) throw new BadRequestException('name is required');

    const exists = await this.repo.findOne({ where: { key } as any });
    if (exists) throw new BadRequestException('Template key already exists');

    const now = new Date().toISOString();
    return this.repo.save({
      key,
      name: dto.name.trim(),
      description: dto.description || '',
      category: dto.category || 'general',
      tasks: (dto.tasks || []).map((t) => ({
        title: t.title,
        description: t.description || '',
        priority: t.priority || 3,
        offsetDays: t.offsetDays || 0,
      })),
      defaultTags: dto.defaultTags || [],
      createdAt: now,
      updatedAt: now,
    } as any);
  }

  async remove(id: string): Promise<void> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id');
    await this.repo.delete(oid as any);
  }
}
