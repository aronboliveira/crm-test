import { Injectable } from '@nestjs/common';
import { MongoRepository } from 'typeorm';
import TypeOrmMongoDataSourceProvider from '../../infrastructure/database/TypeOrmMongoDataSourceProvider';
import { ProjectEntity } from './project.entity';

@Injectable()
export class TypeOrmProjectRepository {
  #repo?: MongoRepository<ProjectEntity>;

  constructor(private readonly db: TypeOrmMongoDataSourceProvider) {}

  async #r(): Promise<MongoRepository<ProjectEntity>> {
    const ds = await this.db.ensureReady();
    this.#repo ??= ds.getMongoRepository(ProjectEntity);
    return this.#repo;
  }

  async list(): Promise<readonly ProjectEntity[]> {
    return (await this.#r()).find({ order: { updatedAt: 'DESC' as any } });
  }

  async ensureDefault(): Promise<ProjectEntity> {
    const r = await this.#r();
    const existing = await r.findOne({ where: { name: 'Default' } as any });
    if (existing) return existing;

    const now = new Date().toISOString();
    return r.save(
      r.create({
        name: 'Default',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      }),
    );
  }
}
