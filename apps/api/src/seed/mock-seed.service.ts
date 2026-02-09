import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

import PermissionsCatalog from '../constants/PermissionsCatalog';
import RolesCatalog from '../constants/RolesCatalog';

import PermissionEntity from '../entities/PermissionEntity';
import RoleEntity from '../entities/RoleEntity';
import UserEntity from '../entities/UserEntity';
import type { RoleKey } from '../types/permissions';

import ProjectEntity from '../entities/ProjectEntity';
import TaskEntity from '../entities/TaskEntity';
import MailOutboxEntity from '../entities/MailOutboxEntity';
import TagEntity from '../entities/TagEntity';
import MilestoneEntity from '../entities/MilestoneEntity';
import CommentEntity from '../entities/CommentEntity';
import ProjectTemplateEntity from '../entities/ProjectTemplateEntity';
import ClientEntity from '../entities/ClientEntity';

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
    @InjectRepository(MailOutboxEntity)
    private readonly mailOutboxRepo: MongoRepository<MailOutboxEntity>,
    @InjectRepository(TagEntity)
    private readonly tagsRepo: MongoRepository<TagEntity>,
    @InjectRepository(MilestoneEntity)
    private readonly milestonesRepo: MongoRepository<MilestoneEntity>,
    @InjectRepository(CommentEntity)
    private readonly commentsRepo: MongoRepository<CommentEntity>,
    @InjectRepository(ProjectTemplateEntity)
    private readonly templatesRepo: MongoRepository<ProjectTemplateEntity>,
    @InjectRepository(ClientEntity)
    private readonly clientsRepo: MongoRepository<ClientEntity>,
  ) {}

  async run(): Promise<void> {
    await this.#seedPermissions();
    await this.#seedRoles();
    const allEmails = await this.#seedUsers();
    const clients = await this.#seedClients();
    const projects = await this.#seedProjectsAndTasks(allEmails, clients);
    await this.#seedTags();
    await this.#seedMilestones(projects);
    await this.#seedComments(projects, allEmails);
    await this.#seedTemplates();
    await this.#seedMailOutbox(allEmails);
  }

  async #seedClients(): Promise<ClientEntity[]> {
    const clients: ClientEntity[] = [];
    const count = await this.clientsRepo.count();
    if (count > 0) {
      return this.clientsRepo.find();
    }

    const now = new Date().toISOString();
    for (let i = 0; i < 15; i++) {
      const name = faker.company.name();
      const email = faker.internet.email();
      const client = this.clientsRepo.create({
        id: crypto.randomUUID(),
        name,
        email,
        phone: faker.phone.number(),
        company: name,
        notes: faker.lorem.sentence(),
        createdAt: now,
        updatedAt: now,
      } as any);
      clients.push(
        (await this.clientsRepo.save(client)) as unknown as ClientEntity,
      );
    }
    return clients;
  }

  async #seedPermissions(): Promise<void> {
    for (const p of PermissionsCatalog) {
      const exists = await this.permsRepo.findOne({
        where: { key: p.key } as any,
      });
      if (!exists) {
        await this.permsRepo.save({
          key: p.key,
          description: p.description,
        } as any);
      }
    }
  }

  async #seedRoles(): Promise<void> {
    for (const r of RolesCatalog) {
      const exists = await this.rolesRepo.findOne({
        where: { key: r.key } as any,
      });
      if (exists) {
        await this.rolesRepo.update(
          exists._id as any,
          {
            name: r.name,
            description: r.description,
            permissionKeys: [...r.permissions],
          } as any,
        );
      } else {
        await this.rolesRepo.save({
          key: r.key,
          name: r.name,
          description: r.description,
          permissionKeys: [...r.permissions],
        } as any);
      }
    }
  }

  async #seedUsers(): Promise<string[]> {
    const now = new Date().toISOString();

    // Fixed core accounts
    const coreUsers: readonly MockUser[] = [
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

    // Generate faker users
    faker.seed(42); // Deterministic for consistent seeding
    const fakerUsers: MockUser[] = [];
    const rolePool: RoleKey[] = [
      'member',
      'member',
      'member',
      'manager',
      'viewer',
    ];

    for (let i = 0; i < 18; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const username = faker.internet
        .username({ firstName, lastName })
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/g, '');
      const email = faker.internet
        .email({ firstName, lastName, provider: 'corp.local' })
        .toLowerCase();

      fakerUsers.push({
        email,
        username,
        password: 'User#1234',
        roles: [rolePool[i % rolePool.length]],
      });
    }

    const allUsers = [...coreUsers, ...fakerUsers];
    const allEmails: string[] = [];

    for (const u of allUsers) {
      const email = u.email.toLowerCase();
      allEmails.push(email);
      const exists = await this.usersRepo.findOne({
        where: { email } as any,
      });

      const passwordHash = await bcrypt.hash(u.password, 12);

      if (exists) {
        await this.usersRepo.update(
          exists._id as any,
          {
            username: u.username,
            passwordHash,
            roles: [...u.roles],
            tokenVersion: 1,
            disabled: false,
            updatedAt: now,
          } as any,
        );
      } else {
        const createdDaysAgo = faker.number.int({ min: 1, max: 180 });
        const createdAt = new Date(
          Date.now() - createdDaysAgo * 86_400_000,
        ).toISOString();

        await this.usersRepo.save({
          email,
          username: u.username,
          passwordHash,
          roles: [...u.roles],
          tokenVersion: 1,
          disabled: false,
          createdAt,
          updatedAt: now,
        } as any);
      }
    }

    return allEmails;
  }

  async #seedProjectsAndTasks(
    allEmails: string[],
    clients: ClientEntity[],
  ): Promise<ProjectEntity[]> {
    const now = new Date().toISOString();

    // Helper to pick a random email for ownership/assignment
    const pick = () =>
      allEmails[faker.number.int({ min: 0, max: allEmails.length - 1 })];

    const pickClient = () =>
      clients.length
        ? clients[faker.number.int({ min: 0, max: clients.length - 1 })]
        : null;

    const names = [
      'Internal ERP Migration',
      'Website Redesign',
      'Legacy Decommission',
      'Mobile App Development',
      'Cloud Infrastructure Upgrade',
      'Security Audit & Compliance',
      'Customer Portal Enhancement',
      'Data Analytics Platform',
      'API Gateway Implementation',
      'DevOps Pipeline Automation',
    ] as const;

    const projects: ProjectEntity[] = [];
    const projectConfigs: Record<
      string,
      { status: string; description?: string }
    > = {
      'Internal ERP Migration': {
        status: 'active',
        description: 'Multi-module migration plan and execution.',
      },
      'Website Redesign': {
        status: 'active',
        description: 'Complete UI/UX overhaul with modern tech stack.',
      },
      'Legacy Decommission': {
        status: 'archived',
        description: 'Sunset old systems and migrate data.',
      },
      'Mobile App Development': {
        status: 'active',
        description: 'Native iOS and Android app with offline support.',
      },
      'Cloud Infrastructure Upgrade': {
        status: 'planned',
        description: 'Migrate to Azure with terraform IaC.',
      },
      'Security Audit & Compliance': {
        status: 'active',
        description: 'SOC2 and GDPR compliance assessment.',
      },
      'Customer Portal Enhancement': {
        status: 'active',
        description: 'Self-service portal with real-time chat.',
      },
      'Data Analytics Platform': {
        status: 'planned',
        description: 'Build data warehouse and BI dashboards.',
      },
      'API Gateway Implementation': {
        status: 'blocked',
        description: 'Centralized API management and rate limiting.',
      },
      'DevOps Pipeline Automation': {
        status: 'done',
        description: 'CI/CD with GitHub Actions and ArgoCD.',
      },
    };

    for (const name of names) {
      const exists = await this.projectsRepo.findOne({
        where: { name } as any,
      });
      let row: ProjectEntity;
      const config = projectConfigs[name] || { status: 'active' };
      if (exists) {
        // Update ownerEmail if missing
        if (!(exists as any).ownerEmail) {
          await this.projectsRepo.update(
            exists._id as any,
            {
              ownerEmail: pick(),
              updatedAt: now,
            } as any,
          );
        }
        row = (await this.projectsRepo.findOne({
          where: { _id: exists._id } as any,
        }))!;
      } else {
        row = await this.projectsRepo.save({
          id: crypto.randomUUID(),
          name,
          code:
            name.substring(0, 3).toUpperCase() +
            '-' +
            faker.number.int({ min: 100, max: 999 }),
          status: config.status,
          description: config.description,
          ownerEmail: pick(),
          createdAt: now,
          updatedAt: now,
          clientId: pickClient()?.id,
        } as any);
      }

      projects.push(row);
    }

    const p0 = projects[0] ? String(projects[0]._id) : '';
    const p1 = projects[1] ? String(projects[1]._id) : '';
    const p2 = projects[2] ? String(projects[2]._id) : '';
    const p3 = projects[3] ? String(projects[3]._id) : '';
    const p4 = projects[4] ? String(projects[4]._id) : '';
    const p5 = projects[5] ? String(projects[5]._id) : '';
    const p6 = projects[6] ? String(projects[6]._id) : '';
    const p7 = projects[7] ? String(projects[7]._id) : '';
    const p8 = projects[8] ? String(projects[8]._id) : '';
    const p9 = projects[9] ? String(projects[9]._id) : '';

    const tasks = [
      // Internal ERP Migration tasks
      {
        projectId: p0,
        title: 'Define milestones',
        status: 'done',
        priority: 3,
      },
      {
        projectId: p0,
        title: 'Map legacy data',
        status: 'doing',
        priority: 2,
      },
      {
        projectId: p0,
        title: 'Setup test environment',
        status: 'doing',
        priority: 3,
      },
      {
        projectId: p0,
        title: 'Data migration scripts',
        status: 'todo',
        priority: 2,
      },
      {
        projectId: p0,
        title: 'User acceptance testing',
        status: 'todo',
        priority: 4,
      },
      // Website Redesign tasks
      {
        projectId: p1,
        title: 'Collect UI requirements',
        status: 'done',
        priority: 2,
      },
      { projectId: p1, title: 'Design mockups', status: 'doing', priority: 2 },
      {
        projectId: p1,
        title: 'Implement responsive layout',
        status: 'todo',
        priority: 3,
      },
      {
        projectId: p1,
        title: 'Performance optimization',
        status: 'todo',
        priority: 4,
      },
      { projectId: p1, title: 'SEO audit', status: 'todo', priority: 3 },
      // Legacy Decommission tasks
      {
        projectId: p2,
        title: 'Archive historical data',
        status: 'done',
        priority: 3,
      },
      {
        projectId: p2,
        title: 'Notify stakeholders',
        status: 'done',
        priority: 2,
      },
      // Mobile App Development tasks
      {
        projectId: p3,
        title: 'Setup React Native project',
        status: 'done',
        priority: 2,
      },
      {
        projectId: p3,
        title: 'Implement authentication',
        status: 'doing',
        priority: 1,
      },
      {
        projectId: p3,
        title: 'Build offline sync',
        status: 'doing',
        priority: 2,
      },
      {
        projectId: p3,
        title: 'Push notifications',
        status: 'todo',
        priority: 3,
      },
      {
        projectId: p3,
        title: 'App store submission',
        status: 'todo',
        priority: 4,
      },
      // Cloud Infrastructure Upgrade tasks
      {
        projectId: p4,
        title: 'Azure subscription setup',
        status: 'todo',
        priority: 2,
      },
      {
        projectId: p4,
        title: 'Write terraform modules',
        status: 'todo',
        priority: 2,
      },
      {
        projectId: p4,
        title: 'Setup monitoring',
        status: 'todo',
        priority: 3,
      },
      // Security Audit tasks
      {
        projectId: p5,
        title: 'Vulnerability scan',
        status: 'doing',
        priority: 1,
      },
      {
        projectId: p5,
        title: 'Penetration testing',
        status: 'todo',
        priority: 1,
      },
      {
        projectId: p5,
        title: 'Document findings',
        status: 'todo',
        priority: 3,
      },
      {
        projectId: p5,
        title: 'Implement fixes',
        status: 'todo',
        priority: 1,
      },
      // Customer Portal tasks
      {
        projectId: p6,
        title: 'Real-time chat integration',
        status: 'doing',
        priority: 2,
      },
      {
        projectId: p6,
        title: 'Payment gateway',
        status: 'doing',
        priority: 1,
      },
      {
        projectId: p6,
        title: 'Account management',
        status: 'todo',
        priority: 3,
      },
      // Data Analytics Platform tasks
      {
        projectId: p7,
        title: 'Design data warehouse schema',
        status: 'todo',
        priority: 2,
      },
      {
        projectId: p7,
        title: 'Setup ETL pipelines',
        status: 'todo',
        priority: 2,
      },
      {
        projectId: p7,
        title: 'Build dashboards',
        status: 'todo',
        priority: 3,
      },
      // API Gateway Implementation tasks
      {
        projectId: p8,
        title: 'Evaluate gateway solutions',
        status: 'done',
        priority: 2,
      },
      {
        projectId: p8,
        title: 'Configure rate limiting',
        status: 'blocked',
        priority: 1,
      },
      {
        projectId: p8,
        title: 'Setup API documentation',
        status: 'todo',
        priority: 3,
      },
      {
        projectId: p8,
        title: 'Integration testing',
        status: 'todo',
        priority: 2,
      },
      // DevOps Pipeline Automation tasks
      {
        projectId: p9,
        title: 'GitHub Actions CI pipeline',
        status: 'done',
        priority: 1,
      },
      {
        projectId: p9,
        title: 'ArgoCD deployment setup',
        status: 'done',
        priority: 1,
      },
      {
        projectId: p9,
        title: 'Staging environment config',
        status: 'done',
        priority: 2,
      },
      {
        projectId: p9,
        title: 'Canary deployment strategy',
        status: 'doing',
        priority: 3,
      },
    ] as const;

    for (const t of tasks) {
      if (!t.projectId) continue;

      const exists = await this.tasksRepo.findOne({
        where: { title: t.title, projectId: t.projectId } as any,
      });
      if (exists) {
        // Backfill assigneeEmail if missing
        if (!(exists as any).assigneeEmail) {
          await this.tasksRepo.update(
            exists._id as any,
            {
              assigneeEmail: pick(),
              updatedAt: now,
            } as any,
          );
        }
      } else {
        const dueAt =
          t.status === 'done'
            ? undefined
            : faker.date
                .soon({ days: faker.number.int({ min: 7, max: 90 }) })
                .toISOString();

        await this.tasksRepo.save({
          ...t,
          assigneeEmail: pick(),
          dueAt,
          createdAt: now,
          updatedAt: now,
        } as any);
      }
    }

    return projects;
  }

  /* ── Tags seed ──────────────────────────────────────────── */

  async #seedTags(): Promise<void> {
    const existing = await this.tagsRepo.count();
    if (existing > 0) return;

    const tags = [
      { key: 'frontend', label: 'Frontend', color: '#3b82f6' },
      { key: 'backend', label: 'Backend', color: '#10b981' },
      { key: 'devops', label: 'DevOps', color: '#f59e0b' },
      { key: 'security', label: 'Security', color: '#ef4444' },
      { key: 'ux', label: 'UX / Design', color: '#8b5cf6' },
      { key: 'mobile', label: 'Mobile', color: '#06b6d4' },
      { key: 'database', label: 'Database', color: '#ec4899' },
      { key: 'api', label: 'API', color: '#14b8a6' },
      { key: 'testing', label: 'Testing', color: '#84cc16' },
      { key: 'documentation', label: 'Documentation', color: '#6b7280' },
      { key: 'performance', label: 'Performance', color: '#f97316' },
      { key: 'infrastructure', label: 'Infrastructure', color: '#a855f7' },
    ];

    for (const t of tags) {
      await this.tagsRepo.save({
        ...t,
        createdAt: new Date().toISOString(),
      } as any);
    }
    console.log(`[MockSeed] Created ${tags.length} tags`);
  }

  /* ── Milestones seed ────────────────────────────────────── */

  async #seedMilestones(projects: ProjectEntity[]): Promise<void> {
    const existing = await this.milestonesRepo.count();
    if (existing > 0) return;

    const now = new Date().toISOString();
    const activeProjects = projects.filter(
      (p) => p.status === 'active' || p.status === 'planned',
    );

    let count = 0;
    for (const proj of activeProjects.slice(0, 6)) {
      const pid = String(proj._id);
      const milestones = [
        {
          projectId: pid,
          title: 'Phase 1 — Planning Complete',
          description: 'All requirements gathered and approved.',
          dueAt: faker.date.soon({ days: 30 }).toISOString(),
          completed: faker.datatype.boolean(),
        },
        {
          projectId: pid,
          title: 'Phase 2 — Development MVP',
          description: 'Core features implemented and tested.',
          dueAt: faker.date.soon({ days: 60 }).toISOString(),
          completed: false,
        },
        {
          projectId: pid,
          title: 'Phase 3 — Launch',
          description: 'Production deployment and go-live.',
          dueAt: faker.date.soon({ days: 90 }).toISOString(),
          completed: false,
        },
      ];

      for (const m of milestones) {
        await this.milestonesRepo.save({
          ...m,
          completedAt: m.completed ? now : '',
          createdAt: now,
          updatedAt: now,
        } as any);
        count++;
      }
    }
    console.log(`[MockSeed] Created ${count} milestones`);
  }

  /* ── Comments seed ──────────────────────────────────────── */

  async #seedComments(
    projects: ProjectEntity[],
    allEmails: string[],
  ): Promise<void> {
    const existing = await this.commentsRepo.count();
    if (existing > 0) return;

    const pick = () =>
      allEmails[faker.number.int({ min: 0, max: allEmails.length - 1 })]!;
    const now = new Date().toISOString();
    let count = 0;

    // Add 2-3 comments per project
    for (const proj of projects.slice(0, 6)) {
      const n = faker.number.int({ min: 2, max: 3 });
      for (let i = 0; i < n; i++) {
        await this.commentsRepo.save({
          targetType: 'project',
          targetId: String(proj._id),
          authorEmail: pick(),
          body: faker.lorem.sentences({ min: 1, max: 3 }),
          createdAt: faker.date.recent({ days: 14 }).toISOString(),
          updatedAt: now,
        } as any);
        count++;
      }
    }

    // Add some task-level comments by fetching a few tasks
    const tasks = await this.tasksRepo.find({ take: 10 } as any);
    for (const task of tasks.slice(0, 8)) {
      const n = faker.number.int({ min: 1, max: 3 });
      for (let i = 0; i < n; i++) {
        await this.commentsRepo.save({
          targetType: 'task',
          targetId: String(task._id),
          authorEmail: pick(),
          body: faker.lorem.sentences({ min: 1, max: 2 }),
          createdAt: faker.date.recent({ days: 7 }).toISOString(),
          updatedAt: now,
        } as any);
        count++;
      }
    }

    console.log(`[MockSeed] Created ${count} comments`);
  }

  /* ── Project Templates seed ─────────────────────────────── */

  async #seedTemplates(): Promise<void> {
    const existing = await this.templatesRepo.count();
    if (existing > 0) return;

    const now = new Date().toISOString();
    const templates = [
      {
        key: 'web-app',
        name: 'Web Application',
        description: 'Standard web app with frontend, backend, and deployment.',
        category: 'engineering',
        tasks: [
          { title: 'Setup repository & CI', priority: 1, offsetDays: 0 },
          { title: 'Design database schema', priority: 2, offsetDays: 3 },
          { title: 'Implement API endpoints', priority: 2, offsetDays: 7 },
          { title: 'Build frontend UI', priority: 2, offsetDays: 10 },
          { title: 'Integration testing', priority: 3, offsetDays: 18 },
          { title: 'Deploy to staging', priority: 3, offsetDays: 22 },
          { title: 'User acceptance testing', priority: 4, offsetDays: 25 },
          { title: 'Production release', priority: 5, offsetDays: 30 },
        ],
        defaultTags: ['frontend', 'backend', 'devops'],
      },
      {
        key: 'mobile-app',
        name: 'Mobile Application',
        description: 'iOS and Android app with shared codebase.',
        category: 'engineering',
        tasks: [
          {
            title: 'Setup React Native / Flutter project',
            priority: 1,
            offsetDays: 0,
          },
          { title: 'Design app navigation', priority: 2, offsetDays: 3 },
          { title: 'Implement core screens', priority: 2, offsetDays: 7 },
          { title: 'Integrate with backend API', priority: 2, offsetDays: 14 },
          { title: 'Push notifications setup', priority: 3, offsetDays: 20 },
          { title: 'Beta testing', priority: 4, offsetDays: 25 },
          { title: 'App store submission', priority: 5, offsetDays: 30 },
        ],
        defaultTags: ['mobile', 'api'],
      },
      {
        key: 'security-audit',
        name: 'Security Audit',
        description: 'Comprehensive security review and remediation.',
        category: 'compliance',
        tasks: [
          { title: 'Scope assessment', priority: 1, offsetDays: 0 },
          { title: 'Vulnerability scanning', priority: 1, offsetDays: 3 },
          { title: 'Penetration testing', priority: 1, offsetDays: 7 },
          { title: 'Document findings', priority: 2, offsetDays: 14 },
          { title: 'Prioritize remediation', priority: 2, offsetDays: 17 },
          { title: 'Implement fixes', priority: 2, offsetDays: 21 },
          { title: 'Retest & verify', priority: 3, offsetDays: 28 },
        ],
        defaultTags: ['security', 'testing'],
      },
      {
        key: 'data-pipeline',
        name: 'Data Pipeline',
        description: 'ETL/ELT pipeline with monitoring and alerting.',
        category: 'data',
        tasks: [
          {
            title: 'Define data sources & destinations',
            priority: 1,
            offsetDays: 0,
          },
          {
            title: 'Design schema & transformations',
            priority: 2,
            offsetDays: 5,
          },
          { title: 'Build ingestion layer', priority: 2, offsetDays: 10 },
          { title: 'Build transformation layer', priority: 2, offsetDays: 15 },
          { title: 'Setup monitoring & alerts', priority: 3, offsetDays: 20 },
          { title: 'Load testing', priority: 3, offsetDays: 25 },
        ],
        defaultTags: ['database', 'infrastructure'],
      },
      {
        key: 'infrastructure-migration',
        name: 'Infrastructure Migration',
        description: 'Migrate on-prem or legacy cloud to Azure.',
        category: 'devops',
        tasks: [
          { title: 'Inventory current resources', priority: 1, offsetDays: 0 },
          { title: 'Design Azure architecture', priority: 1, offsetDays: 5 },
          {
            title: 'Write IaC (Terraform / Bicep)',
            priority: 2,
            offsetDays: 10,
          },
          { title: 'Migrate staging environment', priority: 2, offsetDays: 18 },
          { title: 'Validate & benchmark', priority: 3, offsetDays: 25 },
          { title: 'Migrate production', priority: 4, offsetDays: 30 },
          { title: 'Decommission legacy', priority: 5, offsetDays: 35 },
        ],
        defaultTags: ['devops', 'infrastructure'],
      },
      {
        key: 'api-integration',
        name: 'API Integration',
        description: 'Third-party API integration project.',
        category: 'engineering',
        tasks: [
          { title: 'Review vendor API docs', priority: 1, offsetDays: 0 },
          {
            title: 'Design integration architecture',
            priority: 2,
            offsetDays: 3,
          },
          {
            title: 'Implement auth flow (OAuth/key)',
            priority: 2,
            offsetDays: 5,
          },
          { title: 'Build data mapping layer', priority: 2, offsetDays: 10 },
          { title: 'Error handling & retries', priority: 3, offsetDays: 14 },
          { title: 'End-to-end testing', priority: 3, offsetDays: 18 },
        ],
        defaultTags: ['api', 'backend'],
      },
    ];

    for (const tmpl of templates) {
      await this.templatesRepo.save({
        ...tmpl,
        tasks: tmpl.tasks.map((t) => ({
          ...t,
          description: '',
        })),
        createdAt: now,
        updatedAt: now,
      } as any);
    }
    console.log(`[MockSeed] Created ${templates.length} project templates`);
  }

  async #seedMailOutbox(allEmails: string[]): Promise<void> {
    const existing = await this.mailOutboxRepo.count();
    if (existing > 0) {
      return; // Don't duplicate mail seeds
    }

    faker.seed(42); // Consistent seed data
    const mailItems: Array<{
      to: string;
      kind: 'password_invite' | 'generic';
      subject: string;
      createdAt: string;
      text?: string;
      html?: string;
      meta?: Record<string, any>;
    }> = [];

    // Generate 5-8 password_invite emails
    const inviteCount = faker.number.int({ min: 5, max: 8 });
    for (let i = 0; i < inviteCount; i++) {
      const email = allEmails[i % allEmails.length];
      const resetToken = faker.string.alphanumeric(32);
      const createdAt = faker.date.recent({ days: 30 }).toISOString();

      mailItems.push({
        to: email,
        kind: 'password_invite' as const,
        subject: 'Set your password - CRM Portal',
        createdAt,
        text: `Hello,\n\nYou have been invited to join the CRM Portal. Please set your password using the link below:\n\nhttp://localhost:5173/reset-password?token=${resetToken}\n\nThis link will expire in 24 hours.\n\nBest regards,\nCRM Team`,
        html: `<p>Hello,</p><p>You have been invited to join the CRM Portal. Please set your password using the link below:</p><p><a href="http://localhost:5173/reset-password?token=${resetToken}">Set Password</a></p><p>This link will expire in 24 hours.</p><p>Best regards,<br/>CRM Team</p>`,
        meta: { resetToken, userId: faker.string.uuid() },
      });
    }

    // Generate 3-5 generic emails
    const genericCount = faker.number.int({ min: 3, max: 5 });
    const genericSubjects = [
      'Welcome to CRM Portal',
      'Your weekly report is ready',
      'New task assigned to you',
      'Project deadline reminder',
      'Team meeting scheduled',
    ];

    for (let i = 0; i < genericCount; i++) {
      const email = allEmails[(inviteCount + i) % allEmails.length];
      const subject = genericSubjects[i % genericSubjects.length];
      const createdAt = faker.date.recent({ days: 20 }).toISOString();

      mailItems.push({
        to: email,
        kind: 'generic' as const,
        subject,
        createdAt,
        text: faker.lorem.paragraphs(2),
        html: `<p>${faker.lorem.paragraph()}</p><p>${faker.lorem.paragraph()}</p>`,
        meta: { eventType: 'notification' },
      });
    }

    // Sort by date (oldest first)
    mailItems.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    // Save to database
    for (const item of mailItems) {
      await this.mailOutboxRepo.save(item as any);
    }

    console.log(`[MockSeed] Created ${mailItems.length} mail outbox items`);
  }
}
