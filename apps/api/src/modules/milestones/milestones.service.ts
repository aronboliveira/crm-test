import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import MilestoneEntity from '../../entities/MilestoneEntity';

@Injectable()
export default class MilestonesService {
  private readonly logger = new Logger(MilestonesService.name);

  constructor(
    @InjectRepository(MilestoneEntity)
    private readonly repo: MongoRepository<MilestoneEntity>,
  ) {
    this.logger.log('MilestonesService initialized');
  }

  /* ── queries ──────────────────────────────────────────────── */

  async listByProject(projectId: string): Promise<readonly MilestoneEntity[]> {
    return this.repo.find({ where: { projectId } as any });
  }

  async findOne(id: string): Promise<MilestoneEntity> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id');
    const row = await this.repo.findOne({ where: { _id: oid } as any });
    if (!row) throw new NotFoundException('Milestone not found');
    return row;
  }

  /* ── mutations ────────────────────────────────────────────── */

  async create(dto: {
    projectId: string;
    title: string;
    description?: string;
    dueAt?: string;
  }): Promise<MilestoneEntity> {
    if (!dto.projectId) throw new BadRequestException('projectId is required');
    if (!dto.title?.trim()) throw new BadRequestException('title is required');
    const now = new Date().toISOString();
    return this.repo.save({
      projectId: dto.projectId,
      title: dto.title.trim(),
      description: dto.description || '',
      dueAt: dto.dueAt || '',
      completed: false,
      completedAt: '',
      createdAt: now,
      updatedAt: now,
    } as any);
  }

  async update(
    id: string,
    dto: Partial<{
      title: string;
      description: string;
      dueAt: string;
      completed: boolean;
    }>,
  ): Promise<MilestoneEntity> {
    const row = await this.findOne(id);
    if (dto.title !== undefined) row.title = dto.title.trim();
    if (dto.description !== undefined) row.description = dto.description;
    if (dto.dueAt !== undefined) row.dueAt = dto.dueAt;
    if (dto.completed !== undefined) {
      row.completed = dto.completed;
      row.completedAt = dto.completed ? new Date().toISOString() : '';
    }
    row.updatedAt = new Date().toISOString();
    return this.repo.save(row);
  }

  async remove(id: string): Promise<void> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id');
    await this.repo.delete(oid as any);
  }
}
