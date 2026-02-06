import { Injectable } from '@nestjs/common';
import { MongoRepository } from 'typeorm';
import TypeOrmMongoDataSourceProvider from '../../infrastructure/database/TypeOrmMongoDataSourceProvider';
import TaskEntity from './task.entity';

type CreateTaskInput = Readonly<{
  title: string;
  description?: string;
  priority: number;
}>;

@Injectable()
export class TypeOrmTaskRepository {
  #repo?: MongoRepository<TaskEntity>;

  constructor(private readonly db: TypeOrmMongoDataSourceProvider) {}

  async #r(): Promise<MongoRepository<TaskEntity>> {
    const ds = await this.db.ensureReady();
    this.#repo ??= ds.getMongoRepository(TaskEntity);
    return this.#repo;
  }

  async list(): Promise<readonly TaskEntity[]> {
    const r = await this.#r();
    const result = await r.find({ order: { updatedAt: 'DESC' as any } });
    return result;
  }

  async create(input: CreateTaskInput): Promise<TaskEntity> {
    const now = new Date().toISOString();
    const r = await this.#r();
    const entity: Partial<TaskEntity> = {
      title: input.title,
      description: input.description,
      priority: input.priority as any,
      projectId: 'default',
      status: 'todo',
      createdAt: now,
      updatedAt: now,
    };
    const saved = await r.save(entity as any);
    return saved as TaskEntity;
  }
}
