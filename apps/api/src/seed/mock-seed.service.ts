import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import bcrypt from 'bcryptjs';

import PermissionsCatalog from '../constants/PermissionsCatalog';
import RolesCatalog from '../constants/RolesCatalog';

import PermissionEntity from '../entities/PermissionEntity';
import RoleEntity from '../entities/RoleEntity';
import UserEntity from '../entities/UserEntity';
import type { RoleKey } from '../types/permissions';

import ProjectEntity from '../entities/ProjectEntity';
import TaskEntity from '../entities/TaskEntity';

type MockUser = Readonly<{
  email: string;
  username: string;
  password: string;
  roles: readonly RoleKey[];
}>;

@Injectable()
export default class MockSeedService {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permsRepo: MongoRepository<PermissionEntity>,
    @InjectRepository(RoleEntity)
    private readonly rolesRepo: MongoRepository<RoleEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepo: MongoRepository<UserEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectsRepo: MongoRepository<ProjectEntity>,
    @InjectRepository(TaskEntity)
    private readonly tasksRepo: MongoRepository<TaskEntity>,
  ) {}

  async run(): Promise<void> {
    await this.#seedPermissions();
    await this.#seedRoles();
    await this.#seedUsers();
    await this.#seedProjectsAndTasks();
  }

  async #seedPermissions(): Promise<void> {
    for (const p of PermissionsCatalog) {
      const exists = await this.permsRepo.findOne({
        where: { key: p.key } as any,
      });
      exists
        ? void 0
        : await this.permsRepo.save({
            key: p.key,
            description: p.description,
          } as any);
    }
  }

  async #seedRoles(): Promise<void> {
    for (const r of RolesCatalog) {
      const exists = await this.rolesRepo.findOne({
        where: { key: r.key } as any,
      });
      exists
        ? await this.rolesRepo.update(
            exists._id as any,
            {
              name: r.name,
              description: r.description,
              permissionKeys: [...r.permissions],
            } as any,
          )
        : await this.rolesRepo.save({
            key: r.key,
            name: r.name,
            description: r.description,
            permissionKeys: [...r.permissions],
          } as any);
    }
  }

  async #seedUsers(): Promise<void> {
    const now = new Date().toISOString();

    const mocks: readonly MockUser[] = [
      {
        email: 'admin@corp.local',
        username: 'admin',
        password: 'Admin#123',
        roles: ['admin'],
      },
      {
        email: 'manager@corp.local',
        username: 'manager',
        password: 'Manager#123',
        roles: ['manager'],
      },
      {
        email: 'member@corp.local',
        username: 'member',
        password: 'Member#123',
        roles: ['member'],
      },
      {
        email: 'viewer@corp.local',
        username: 'viewer',
        password: 'Viewer#123',
        roles: ['viewer'],
      },
    ];

    for (const u of mocks) {
      const email = u.email.toLowerCase();
      const exists = await this.usersRepo.findOne({ where: { email } as any });

      const passwordHash = await bcrypt.hash(u.password, 12);

      exists
        ? await this.usersRepo.update(
            exists._id as any,
            {
              username: u.username,
              passwordHash,
              roles: [...u.roles],
              tokenVersion: 1,
              disabled: false,
              updatedAt: now,
            } as any,
          )
        : await this.usersRepo.save({
            email,
            username: u.username,
            passwordHash,
            roles: [...u.roles],
            tokenVersion: 1,
            disabled: false,
            createdAt: now,
            updatedAt: now,
          } as any);
    }
  }

  async #seedProjectsAndTasks(): Promise<void> {
    const now = new Date().toISOString();

    const names = [
      'Internal ERP Migration',
      'Website Redesign',
      'Legacy Decommission',
    ] as const;

    const projects: ProjectEntity[] = [];
    for (const name of names) {
      const exists = await this.projectsRepo.findOne({
        where: { name } as any,
      });
      const row = exists
        ? (await this.projectsRepo.findOne({
            where: { _id: exists._id } as any,
          }))!
        : await this.projectsRepo.save({
            name,
            status: name === 'Legacy Decommission' ? 'archived' : 'active',
            createdAt: now,
            updatedAt: now,
            description:
              name === 'Internal ERP Migration'
                ? 'Multi-module migration plan and execution.'
                : undefined,
          } as any);

      projects.push(row);
    }

    const p0 = projects[0] ? String(projects[0]._id) : '';
    const p1 = projects[1] ? String(projects[1]._id) : '';

    const tasks = [
      {
        projectId: p0,
        title: 'Define milestones',
        status: 'todo',
        priority: 3,
      },
      { projectId: p0, title: 'Map legacy data', status: 'doing', priority: 4 },
      {
        projectId: p1,
        title: 'Collect UI requirements',
        status: 'todo',
        priority: 2,
      },
    ] as const;

    for (const t of tasks) {
      if (!t.projectId) continue;

      const exists = await this.tasksRepo.findOne({
        where: { title: t.title, projectId: t.projectId } as any,
      });
      exists
        ? await this.tasksRepo.update(
            exists._id as any,
            { updatedAt: now } as any,
          )
        : await this.tasksRepo.save({
            ...t,
            createdAt: now,
            updatedAt: now,
          } as any);
    }
  }
}
