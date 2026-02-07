import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import TagEntity from '../../entities/TagEntity';

@Injectable()
export default class TagsService {
  private readonly logger = new Logger(TagsService.name);

  constructor(
    @InjectRepository(TagEntity)
    private readonly repo: MongoRepository<TagEntity>,
  ) {
    this.logger.log('TagsService initialized');
  }

  async list(): Promise<readonly TagEntity[]> {
    return this.repo.find({ take: 500 } as any);
  }

  async create(dto: {
    key: string;
    label: string;
    color: string;
  }): Promise<TagEntity> {
    const key = dto.key?.trim().toLowerCase().replace(/\s+/g, '-');
    if (!key) throw new BadRequestException('Key is required');
    const exists = await this.repo.findOne({ where: { key } as any });
    if (exists) throw new BadRequestException('Tag key already exists');
    return this.repo.save({
      key,
      label: (dto.label || key).trim(),
      color: dto.color || '#6b7280',
      createdAt: new Date().toISOString(),
    } as any);
  }

  async remove(id: string): Promise<void> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id');
    await this.repo.delete(oid as any);
  }
}
