import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import ProjectEntity, {
  type ProjectStatus,
} from '../../entities/ProjectEntity';

/**
 * Data transfer object for creating a new project.
 */
type CreateProjectDto = Readonly<{
  name: string;
  code?: string;
  description?: string;
  notes?: string;
  status?: ProjectStatus;
  ownerEmail?: string;
  dueAt?: string;
  deadlineAt?: string;
  tags?: string[];
  templateKey?: string;
}>;

/**
 * Data transfer object for updating an existing project.
 */
type UpdateProjectDto = Readonly<Partial<CreateProjectDto>>;

/**
 * Type guard to check if a value is a plain object (record).
 * @param v - The value to check
 * @returns True if the value is a non-null, non-array object
 */
const isRec = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v) ? true : false;

/**
 * Service responsible for managing project entities.
 * Provides CRUD operations for projects stored in MongoDB.
 *
 * @example
 * ```typescript
 * const project = await projectsService.create({ name: 'My Project' });
 * const all = await projectsService.list();
 * ```
 */
@Injectable()
export default class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(ProjectEntity)
    private readonly repo: MongoRepository<ProjectEntity>,
  ) {
    try {
      if (!repo) {
        this.logger.error('Repository not injected');
        throw new Error('Repository initialization failed');
      }
      this.logger.log('ProjectsService initialized');
    } catch (error) {
      this.logger.error('ProjectsService constructor error:', error);
      throw error;
    }
  }

  /**
   * Retrieves all projects from the database.
   * @returns A readonly array of project entities (max 500)
   * @throws Error if database query fails
   */
  async list(): Promise<readonly ProjectEntity[]> {
    try {
      const projects = await this.repo.find({ take: 500 } as any);
      this.logger.log(`Retrieved ${projects.length} projects`);
      return projects;
    } catch (error) {
      this.logger.error('Error listing projects:', error);
      throw error;
    }
  }

  async create(dto: CreateProjectDto): Promise<ProjectEntity> {
    try {
      const name = typeof dto?.name === 'string' ? dto.name.trim() : '';
      if (!name) {
        this.logger.warn('Create project - invalid name');
        throw new BadRequestException('Invalid name');
      }

      const validStatuses: ProjectStatus[] = [
        'active',
        'archived',
        'planned',
        'blocked',
        'done',
      ];
      const status: ProjectStatus =
        dto.status && validStatuses.includes(dto.status)
          ? dto.status
          : 'active';
      const now = new Date().toISOString();

      const code =
        typeof dto.code === 'string' && dto.code.trim()
          ? dto.code.trim().toUpperCase()
          : undefined;

      const ownerEmail =
        typeof dto.ownerEmail === 'string' && dto.ownerEmail.trim()
          ? dto.ownerEmail.trim()
          : undefined;

      const dueAt =
        typeof dto.dueAt === 'string' && /^\d{4}-\d{2}/.test(dto.dueAt)
          ? dto.dueAt
          : undefined;

      const project = await this.repo.save({
        name,
        code,
        description:
          typeof dto.description === 'string' && dto.description.trim()
            ? dto.description.trim()
            : undefined,
        notes:
          typeof dto.notes === 'string' && dto.notes.trim()
            ? dto.notes.trim()
            : undefined,
        status,
        ownerEmail,
        dueAt,
        deadlineAt:
          typeof dto.deadlineAt === 'string' &&
          /^\d{4}-\d{2}/.test(dto.deadlineAt)
            ? dto.deadlineAt
            : undefined,
        tags: Array.isArray(dto.tags) ? dto.tags.filter(Boolean) : undefined,
        templateKey:
          typeof dto.templateKey === 'string' && dto.templateKey.trim()
            ? dto.templateKey.trim()
            : undefined,
        createdAt: now,
        updatedAt: now,
      } as any);

      this.logger.log(`Project created: ${project._id}`);
      return project;
    } catch (error) {
      this.logger.error('Error creating project:', error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateProjectDto): Promise<ProjectEntity> {
    try {
      const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
      if (!oid) {
        this.logger.warn(`Update project - invalid id: ${id}`);
        throw new BadRequestException('Invalid id');
      }

      const cur = await this.repo.findOne({ where: { _id: oid } as any });
      if (!cur) {
        this.logger.warn(`Update project - not found: ${id}`);
        throw new NotFoundException('Not found');
      }

      const patch: any = {};
      const name = typeof dto.name === 'string' ? dto.name.trim() : '';
      if (name) {
        patch.name = name;
      }

      if (isRec(dto) && 'description' in dto) {
        patch.description =
          typeof dto.description === 'string' && dto.description.trim()
            ? dto.description.trim()
            : undefined;
      }

      if (isRec(dto) && 'notes' in dto) {
        patch.notes =
          typeof dto.notes === 'string' && dto.notes.trim()
            ? dto.notes.trim()
            : undefined;
      }

      const validStatuses: ProjectStatus[] = [
        'active',
        'archived',
        'planned',
        'blocked',
        'done',
      ];
      if (dto.status && validStatuses.includes(dto.status)) {
        patch.status = dto.status;
      }

      if (typeof dto.code === 'string') {
        patch.code = dto.code.trim().toUpperCase() || undefined;
      }

      if (typeof dto.ownerEmail === 'string') {
        patch.ownerEmail = dto.ownerEmail.trim() || undefined;
      }

      if (typeof dto.dueAt === 'string') {
        patch.dueAt = /^\d{4}-\d{2}/.test(dto.dueAt) ? dto.dueAt : undefined;
      }

      if (typeof dto.deadlineAt === 'string') {
        patch.deadlineAt = /^\d{4}-\d{2}/.test(dto.deadlineAt)
          ? dto.deadlineAt
          : undefined;
      }

      if (Array.isArray(dto.tags)) {
        patch.tags = dto.tags.filter(Boolean);
      }

      if (typeof dto.templateKey === 'string') {
        patch.templateKey = dto.templateKey.trim() || undefined;
      }

      patch.updatedAt = new Date().toISOString();

      await this.repo.update(oid as any, patch);
      const updated = await this.repo.findOne({ where: { _id: oid } as any });
      this.logger.log(`Project updated: ${id}`);
      return updated as any;
    } catch (error) {
      this.logger.error('Error updating project:', error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
      if (!oid) {
        this.logger.warn(`Remove project - invalid id: ${id}`);
        throw new BadRequestException('Invalid id');
      }

      await this.repo.delete(oid as any);
      this.logger.log(`Project removed: ${id}`);
    } catch (error) {
      this.logger.error('Error removing project:', error);
      throw error;
    }
  }

  async options(
    activeOnly: boolean,
  ): Promise<readonly { id: string; name: string; status: string }[]> {
    try {
      const where = activeOnly ? ({ status: 'active' } as any) : ({} as any);
      const rows = await this.repo.find({ where, take: 500 } as any);

      return rows.map((p) => ({
        id: String(p._id),
        name: p.name,
        status: p.status,
      }));
    } catch (error) {
      this.logger.error('Error fetching project options:', error);
      throw error;
    }
  }
}
