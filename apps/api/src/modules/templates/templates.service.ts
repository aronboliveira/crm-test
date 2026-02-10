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
import type {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateQueryDto,
} from '../../common/validation';

/**
 * @service TemplatesService
 * @description Business logic for project templates CRUD operations
 * @version 1.4.0
 * @since 2025-02-09
 */
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

  /**
   * List templates with optional filtering and pagination
   * @param query - Query parameters (validated by Zod)
   * @returns Array of templates
   */
  async list(
    query?: TemplateQueryDto,
  ): Promise<readonly ProjectTemplateEntity[]> {
    const where: Record<string, unknown> = {};

    if (query?.key) {
      where.key = query.key;
    }
    if (query?.category) {
      where.category = query.category;
    }
    if (query?.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query?.search) {
      // MongoDB text search on name/description
      where.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;

    return this.repo.find({
      where: Object.keys(where).length > 0 ? where : undefined,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    } as any);
  }

  /**
   * Find a template by its unique key
   * @param key - Template key
   * @returns Template entity
   * @throws NotFoundException if template doesn't exist
   */
  async findByKey(key: string): Promise<ProjectTemplateEntity> {
    const row = await this.repo.findOne({ where: { key } as any });
    if (!row) throw new NotFoundException('Template not found');
    return row;
  }

  /**
   * Find a template by ID
   * @param id - Template ObjectId string
   * @returns Template entity
   * @throws NotFoundException if template doesn't exist
   */
  async findById(id: string): Promise<ProjectTemplateEntity> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id format');

    const row = await this.repo.findOne({ where: { _id: oid } as any });
    if (!row) throw new NotFoundException('Template not found');
    return row;
  }

  /* ── mutations ────────────────────────────────────────────── */

  /**
   * Create a new template
   * @param dto - Validated and sanitized template data
   * @returns Created template entity
   * @throws BadRequestException if key already exists
   */
  async create(dto: CreateTemplateDto): Promise<ProjectTemplateEntity> {
    const key = dto.key.trim().toLowerCase().replace(/\s+/g, '-');

    const exists = await this.repo.findOne({ where: { key } as any });
    if (exists) {
      this.logger.warn(`Attempted to create duplicate template key: ${key}`);
      throw new BadRequestException('Template key already exists');
    }

    const now = new Date().toISOString();

    const entity = this.repo.create({
      key,
      name: dto.name.trim(),
      description: dto.description || '',
      content: dto.content || '',
      subject: dto.subject || '',
      category: dto.category || 'email',
      isActive: dto.isActive ?? true,
      metadata: dto.metadata || {},
      tasks: [],
      defaultTags: [],
      createdAt: now,
      updatedAt: now,
    } as any);

    this.logger.log(`Creating template: ${key}`);
    const saved = await this.repo.save(entity);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  /**
   * Update an existing template
   * @param id - Template ObjectId string
   * @param dto - Validated and sanitized update data
   * @returns Updated template entity
   * @throws NotFoundException if template doesn't exist
   * @throws BadRequestException if new key conflicts with existing
   */
  async update(
    id: string,
    dto: UpdateTemplateDto,
  ): Promise<ProjectTemplateEntity> {
    const template = await this.findById(id);

    // Check if key is being changed and new key doesn't conflict
    if (dto.key && dto.key !== template.key) {
      const newKey = dto.key.trim().toLowerCase().replace(/\s+/g, '-');
      const exists = await this.repo.findOne({ where: { key: newKey } as any });
      if (exists) {
        throw new BadRequestException('Template key already exists');
      }
      template.key = newKey;
    }

    // Update fields that are provided
    if (dto.name !== undefined) {
      template.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      template.description = dto.description;
    }
    if (dto.content !== undefined) {
      template.content = dto.content;
    }
    if (dto.subject !== undefined) {
      template.subject = dto.subject;
    }
    if (dto.category !== undefined) {
      template.category = dto.category;
    }
    if (dto.isActive !== undefined) {
      template.isActive = dto.isActive;
    }
    if (dto.metadata !== undefined) {
      template.metadata = dto.metadata;
    }

    template.updatedAt = new Date().toISOString();

    this.logger.log(`Updating template: ${id}`);
    return this.repo.save(template);
  }

  /**
   * Delete a template by ID
   * @param id - Template ObjectId string
   * @throws BadRequestException if id format is invalid
   */
  async remove(id: string): Promise<void> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id format');

    this.logger.log(`Removing template: ${id}`);
    await this.repo.delete(oid as any);
  }
}
