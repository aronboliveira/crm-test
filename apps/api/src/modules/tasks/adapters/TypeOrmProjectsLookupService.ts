import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import ProjectEntity from '../../../entities/ProjectEntity';
import type { ProjectsLookupPort } from '../ports/projects-lookup.port';

@Injectable()
export default class TypeOrmProjectsLookupService implements ProjectsLookupPort {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectsRepo: MongoRepository<ProjectEntity>,
  ) {}

  async existsById(id: string): Promise<boolean> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) return false;

    const row = await this.projectsRepo.findOne({ where: { _id: oid } as any });
    return !!row;
  }
}
