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

type CreateProjectDto = Readonly<{
  name: string;
  description?: string;
  status?: ProjectStatus;
}>;

type UpdateProjectDto = Readonly<Partial<CreateProjectDto>>;

const isRec = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v) ? true : false;

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

      const status: ProjectStatus =
        dto.status === 'archived' ? 'archived' : 'active';
      const now = new Date().toISOString();

      const project = await this.repo.save({
        name,
        description:
          typeof dto.description === 'string' && dto.description.trim()
            ? dto.description.trim()
            : undefined,
        status,
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

      if (dto.status === 'active' || dto.status === 'archived') {
        patch.status = dto.status;
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
