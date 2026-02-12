import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { createHash } from 'crypto';
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
import AuthAuditEventEntity, {
  type AuditKind,
} from '../entities/AuthAuditEventEntity';

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
    @InjectRepository(AuthAuditEventEntity)
    private readonly auditRepo: MongoRepository<AuthAuditEventEntity>,
  ) {}

  async run(): Promise<void> {
    await this.#seedPermissions();
    await this.#seedRoles();
    const allEmails = await this.#seedUsers();
    const clients = await this.#seedClients();
    const projects = await this.#seedProjectsAndTasks(allEmails, clients);
    const myWorkProjects = await this.#seedAdminMyWorkPortfolio(
      projects,
      clients,
    );
    await this.#seedTags();
    await this.#seedMilestones(myWorkProjects);
    await this.#seedComments(myWorkProjects, allEmails);
    await this.#seedTemplates();
    await this.#seedMailOutbox(allEmails);
    await this.#seedAuditEvents(allEmails);
  }

  async #seedClients(): Promise<ClientEntity[]> {
    const clients: ClientEntity[] = [];
    const count = await this.clientsRepo.count();
    if (count > 0) {
      return this.clientsRepo.find();
    }

    const now = new Date().toISOString();

    // Define engagement profiles for realistic variation
    const engagementProfiles = [
      {
        name: 'high-engagement',
        weight: 0.2, // 20% of clients
        whatsappRange: { min: 80, max: 200 },
        emailRange: { min: 60, max: 150 },
        deliveryRate: { min: 0.9, max: 0.98 },
        readRate: { min: 0.6, max: 0.85 },
        replyRate: { min: 0.4, max: 0.7 },
        openRate: { min: 0.5, max: 0.75 },
        clickRate: { min: 0.3, max: 0.5 },
        emailReplyRate: { min: 0.25, max: 0.45 },
      },
      {
        name: 'medium-engagement',
        weight: 0.35, // 35% of clients
        whatsappRange: { min: 30, max: 80 },
        emailRange: { min: 20, max: 60 },
        deliveryRate: { min: 0.85, max: 0.95 },
        readRate: { min: 0.3, max: 0.6 },
        replyRate: { min: 0.15, max: 0.4 },
        openRate: { min: 0.25, max: 0.5 },
        clickRate: { min: 0.1, max: 0.3 },
        emailReplyRate: { min: 0.1, max: 0.25 },
      },
      {
        name: 'low-engagement',
        weight: 0.3, // 30% of clients
        whatsappRange: { min: 5, max: 30 },
        emailRange: { min: 5, max: 20 },
        deliveryRate: { min: 0.75, max: 0.9 },
        readRate: { min: 0.1, max: 0.3 },
        replyRate: { min: 0.05, max: 0.2 },
        openRate: { min: 0.1, max: 0.3 },
        clickRate: { min: 0.05, max: 0.15 },
        emailReplyRate: { min: 0.05, max: 0.15 },
      },
      {
        name: 'inactive',
        weight: 0.15, // 15% of clients
        whatsappRange: { min: 0, max: 5 },
        emailRange: { min: 0, max: 5 },
        deliveryRate: { min: 0.6, max: 0.8 },
        readRate: { min: 0, max: 0.15 },
        replyRate: { min: 0, max: 0.1 },
        openRate: { min: 0, max: 0.2 },
        clickRate: { min: 0, max: 0.1 },
        emailReplyRate: { min: 0, max: 0.1 },
      },
    ];

    // Helper function to select profile based on weighted probability
    const selectProfile = () => {
      const rand = Math.random();
      let cumulative = 0;
      for (const profile of engagementProfiles) {
        cumulative += profile.weight;
        if (rand <= cumulative) return profile;
      }
      return engagementProfiles[0];
    };

    const preferredContacts: Array<
      'email' | 'phone' | 'whatsapp' | 'cellphone'
    > = ['email', 'phone', 'whatsapp', 'cellphone'];
    const toMaskedCnpj = (digits: string): string =>
      digits
        .slice(0, 14)
        .padEnd(14, '0')
        .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    const toMaskedCep = (digits: string): string =>
      digits.slice(0, 8).padEnd(8, '0').replace(/^(\d{5})(\d{3})$/, '$1-$2');

    for (let i = 0; i < 15; i++) {
      const profile = selectProfile();
      const name = faker.company.name();
      const email = faker.internet.email();
      const type: 'pessoa' | 'empresa' = faker.datatype.boolean(0.6)
        ? 'empresa'
        : 'pessoa';
      const cnpj =
        type === 'empresa'
          ? toMaskedCnpj(
              `${faker.number.int({ min: 10, max: 99 })}${faker.number.int({ min: 100, max: 999 })}${faker.number.int({ min: 100, max: 999 })}${faker.number.int({ min: 1000, max: 9999 })}${faker.number.int({ min: 10, max: 99 })}`,
            )
          : undefined;
      const cep =
        type === 'empresa'
          ? toMaskedCep(
              `${faker.number.int({ min: 10000, max: 99999 })}${faker.number.int({ min: 100, max: 999 })}`,
            )
          : undefined;
      const cellPhone = faker.phone.number();
      const hasWhatsapp =
        profile.name !== 'inactive'
          ? faker.datatype.boolean(0.8)
          : faker.datatype.boolean(0.3); // inactive clients less likely to have WhatsApp

      // WhatsApp metrics with realistic progression
      const whatsappSent = faker.number.int(profile.whatsappRange);
      const deliveryRate = faker.number.float({
        min: profile.deliveryRate.min,
        max: profile.deliveryRate.max,
        fractionDigits: 2,
      });
      const readRateOfDelivered = faker.number.float({
        min: profile.readRate.min,
        max: profile.readRate.max,
        fractionDigits: 2,
      });
      const replyRateOfRead = faker.number.float({
        min: profile.replyRate.min,
        max: profile.replyRate.max,
        fractionDigits: 2,
      });

      const whatsappDelivered = Math.floor(whatsappSent * deliveryRate);
      const whatsappRead = Math.floor(whatsappDelivered * readRateOfDelivered);
      const whatsappReplied = Math.floor(whatsappRead * replyRateOfRead);

      // Email metrics with realistic progression
      const emailSent = faker.number.int(profile.emailRange);
      const openRate = faker.number.float({
        min: profile.openRate.min,
        max: profile.openRate.max,
        fractionDigits: 2,
      });
      const clickRateOfOpened = faker.number.float({
        min: profile.clickRate.min,
        max: profile.clickRate.max,
        fractionDigits: 2,
      });
      const replyRateOfOpened = faker.number.float({
        min: profile.emailReplyRate.min,
        max: profile.emailReplyRate.max,
        fractionDigits: 2,
      });

      const emailOpened = Math.floor(emailSent * openRate);
      const emailClicked = Math.floor(emailOpened * clickRateOfOpened);
      const emailReplied = Math.floor(emailOpened * replyRateOfOpened);

      // Determine preferred contact based on engagement
      let preferredContact: (typeof preferredContacts)[number];
      if (profile.name === 'inactive') {
        preferredContact = 'email';
      } else if (whatsappSent > emailSent && hasWhatsapp) {
        preferredContact = 'whatsapp';
      } else {
        preferredContact =
          preferredContacts[faker.number.int({ min: 0, max: 3 })];
      }

      const client = this.clientsRepo.create({
        id: crypto.randomUUID(),
        name,
        type,
        email,
        phone: faker.phone.number(),
        cellPhone,
        whatsappNumber: hasWhatsapp ? cellPhone : undefined,
        hasWhatsapp,
        preferredContact,
        whatsappAnalytics: {
          sent: whatsappSent,
          delivered: whatsappDelivered,
          read: whatsappRead,
          replied: whatsappReplied,
          lastMessageAt:
            whatsappSent > 0
              ? faker.date.recent({ days: 30 }).toISOString()
              : undefined,
        },
        emailAnalytics: {
          sent: emailSent,
          opened: emailOpened,
          clicked: emailClicked,
          replied: emailReplied,
          lastEmailAt:
            emailSent > 0
              ? faker.date.recent({ days: 45 }).toISOString()
              : undefined,
        },
        company: name,
        cnpj,
        cep,
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

  async #seedAuditEvents(allEmails: readonly string[]): Promise<void> {
    const targetAuditEvents = 120;
    const existingCount = await this.auditRepo.count();
    if (existingCount >= targetAuditEvents) {
      return;
    }

    const kinds: readonly AuditKind[] = [
      'auth.login.success',
      'auth.login.failure',
      'auth.password_reset.requested',
      'auth.password_reset.completed',
      'auth.password.changed',
      'auth.email.change_requested',
      'admin.user.created',
      'admin.user.role_changed',
      'admin.user.role_updated',
      'admin.user.force_reset',
      'admin.user.locked',
      'admin.user.unlocked',
      'admin.user.invite_issued',
      'admin.user.invite_reissued',
    ];

    const actorPool = [
      'admin@corp.local',
      'manager@corp.local',
      ...allEmails.slice(0, 12),
    ].filter((value, index, source) => source.indexOf(value) === index);

    const targetPool = allEmails
      .filter((email) => email !== 'admin@corp.local')
      .slice(0, 16);

    const toCreate = targetAuditEvents - existingCount;
    const now = Date.now();
    const docs: AuthAuditEventEntity[] = [];

    for (let index = 0; index < toCreate; index++) {
      const kind = kinds[index % kinds.length];
      const actorEmail =
        actorPool[index % actorPool.length] ?? 'admin@corp.local';
      const targetEmail =
        kind.startsWith('admin.user') && targetPool.length
          ? targetPool[(index * 3) % targetPool.length]
          : undefined;

      const createdAt = new Date(
        now - (index + 1) * 45 * 60 * 1000,
      ).toISOString();

      const auditEvent = this.auditRepo.create({
        kind,
        createdAt,
        actorEmail,
        actorEmailMasked: this.#maskEmail(actorEmail),
        actorEmailHash: this.#sha256(actorEmail),
        targetEmail,
        targetEmailMasked: targetEmail
          ? this.#maskEmail(targetEmail)
          : undefined,
        targetEmailHash: targetEmail ? this.#sha256(targetEmail) : undefined,
        ipHash: this.#sha256(`seed-ip-${index % 7}`),
        userAgent: index % 2 === 0 ? 'seed/web-client' : 'seed/mobile-client',
        meta: this.#buildAuditMeta(kind, index, actorEmail, targetEmail),
      } as any) as AuthAuditEventEntity;

      docs.push(auditEvent);
    }

    if (docs.length > 0) {
      await this.auditRepo.save(docs as any);
    }
  }

  #buildAuditMeta(
    kind: AuditKind,
    index: number,
    actorEmail: string,
    targetEmail?: string,
  ): Record<string, unknown> {
    if (kind === 'auth.login.success') {
      return {
        via: index % 3 === 0 ? 'sso' : 'password',
        source: index % 2 === 0 ? 'web' : 'mobile',
      };
    }

    if (kind === 'auth.login.failure') {
      return {
        reason: index % 2 === 0 ? 'invalid_password' : 'account_locked',
        source: index % 2 === 0 ? 'web' : 'mobile',
      };
    }

    if (
      kind === 'auth.password_reset.requested' ||
      kind === 'auth.password_reset.completed'
    ) {
      return {
        channel: 'email',
        requestId: `seed-reset-${index}`,
      };
    }

    if (kind === 'auth.password.changed') {
      return {
        source: 'user-profile',
        actorEmail,
      };
    }

    if (kind === 'auth.email.change_requested') {
      return {
        from: actorEmail,
        to: `updated+${index}@corp.local`,
      };
    }

    if (kind.startsWith('admin.user')) {
      return {
        actor: actorEmail,
        target: targetEmail ?? null,
        ticketRef: `ADM-${String(index + 1).padStart(4, '0')}`,
      };
    }

    return {
      seed: true,
      index,
    };
  }

  #maskEmail(email: string): string {
    const [user, domain = 'corp.local'] = email.split('@');
    const head = user.slice(0, 1) || '*';
    const tail = user.length > 1 ? user.slice(-1) : '*';
    return `${head}***${tail}@${domain}`;
  }

  #sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
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

    // Create client project distribution for realistic variation
    // Some clients get multiple projects, some get one, some get none
    const clientProjectDistribution: Map<string, number> = new Map();
    const clientIds = clients.map((c) => c.id);

    // Assign project counts to clients with realistic distribution
    // 20% get 0 projects (new/inactive clients)
    // 40% get 1 project
    // 25% get 2 projects
    // 10% get 3 projects
    // 5% get 4+ projects (high-value clients)
    const distributions = [
      { count: 0, weight: 0.2 },
      { count: 1, weight: 0.4 },
      { count: 2, weight: 0.25 },
      { count: 3, weight: 0.1 },
      { count: 4, weight: 0.05 },
    ];

    for (const clientId of clientIds) {
      const rand = Math.random();
      let cumulative = 0;
      let projectCount = 1; // default
      for (const dist of distributions) {
        cumulative += dist.weight;
        if (rand <= cumulative) {
          projectCount = dist.count;
          break;
        }
      }
      clientProjectDistribution.set(clientId, projectCount);
    }

    // Flatten the distribution to an array of client IDs, repeated by count
    const clientIdsForProjects: string[] = [];
    for (const [clientId, count] of clientProjectDistribution.entries()) {
      for (let i = 0; i < count; i++) {
        clientIdsForProjects.push(clientId);
      }
    }

    // Shuffle the array for randomness
    for (let i = clientIdsForProjects.length - 1; i > 0; i--) {
      const j = faker.number.int({ min: 0, max: i });
      [clientIdsForProjects[i], clientIdsForProjects[j]] = [
        clientIdsForProjects[j],
        clientIdsForProjects[i],
      ];
    }

    for (const name of names) {
      const exists = await this.projectsRepo.findOne({
        where: { name } as any,
      });
      let row: ProjectEntity;
      const config = projectConfigs[name] || { status: 'active' };
      const clientId = clientIdsForProjects.shift(); // Take from distributed list
      if (exists) {
        // Update ownerEmail if missing
        if (!(exists as any).ownerEmail) {
          await this.projectsRepo.update(
            exists._id as any,
            {
              ownerEmail: pick(),
              clientId: clientId,
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
          clientId: clientId,
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

  async #seedAdminMyWorkPortfolio(
    projects: ProjectEntity[],
    clients: ClientEntity[],
  ): Promise<ProjectEntity[]> {
    const now = new Date().toISOString();
    const adminEmail = 'admin@corp.local';
    const dayMs = 86_400_000;
    const toIso = (daysFromNow: number): string =>
      new Date(Date.now() + daysFromNow * dayMs).toISOString();

    const clientIds = clients
      .map((client) => String(client.id || '').trim())
      .filter(Boolean);

    const clientIdForIndex = (index: number): string | undefined => {
      if (!clientIds.length) return undefined;
      return clientIds[index % clientIds.length];
    };

    const projectSeeds = [
      {
        name: 'Revenue Intelligence Rollout',
        code: 'RIR-410',
        status: 'active',
        description:
          'Unify billing, usage, and forecast signals for weekly executive planning.',
        tags: ['api', 'backend', 'database', 'performance'],
        templateKey: 'saas-onboarding',
        dueInDays: 24,
        deadlineInDays: 31,
      },
      {
        name: 'Customer Health Radar',
        code: 'CHR-227',
        status: 'active',
        description:
          'Build account-level health scoring fed by product, support, and finance events.',
        tags: ['api', 'frontend', 'testing', 'documentation'],
        templateKey: 'enterprise-crm',
        dueInDays: 18,
        deadlineInDays: 26,
      },
      {
        name: 'Compliance Evidence Pipeline',
        code: 'CEP-632',
        status: 'planned',
        description:
          'Automate control evidence capture and retention for security audits.',
        tags: ['security', 'backend', 'infrastructure', 'documentation'],
        templateKey: 'devops-pipeline',
        dueInDays: 33,
        deadlineInDays: 42,
      },
      {
        name: 'Field Support Automation',
        code: 'FSA-905',
        status: 'blocked',
        description:
          'Reduce dispatch delays with event-driven workflow and offline field forms.',
        tags: ['mobile', 'api', 'devops', 'testing'],
        templateKey: 'mobile-app',
        dueInDays: 21,
        deadlineInDays: 29,
      },
      {
        name: 'Executive KPI Broadcast',
        code: 'EKB-778',
        status: 'active',
        description:
          'Deliver board-ready KPI digests with trigger-based briefings across channels.',
        tags: ['frontend', 'database', 'performance', 'documentation'],
        templateKey: 'data-analytics',
        dueInDays: 15,
        deadlineInDays: 22,
      },
    ] as const;

    const seededProjects: ProjectEntity[] = [];
    for (const [index, seed] of projectSeeds.entries()) {
      const clientId = clientIdForIndex(index);
      const payload: Record<string, unknown> = {
        name: seed.name,
        code: seed.code,
        status: seed.status,
        description: seed.description,
        ownerEmail: adminEmail,
        tags: seed.tags,
        templateKey: seed.templateKey,
        dueAt: toIso(seed.dueInDays),
        deadlineAt: toIso(seed.deadlineInDays),
        updatedAt: now,
      };

      if (clientId) {
        payload.clientId = clientId;
      }

      const exists = await this.projectsRepo.findOne({
        where: { name: seed.name } as any,
      });

      let row: ProjectEntity;
      if (exists) {
        await this.projectsRepo.update(exists._id as any, payload as any);
        row = (await this.projectsRepo.findOne({
          where: { _id: exists._id } as any,
        }))!;
      } else {
        row = await this.projectsRepo.save({
          ...payload,
          createdAt: now,
        } as any);
      }

      seededProjects.push(row);
    }

    const taskSeedsByProject: Record<
      string,
      readonly {
        title: string;
        description: string;
        status: 'todo' | 'doing' | 'done' | 'blocked';
        priority: 1 | 2 | 3 | 4 | 5;
        dueInDays?: number;
        deadlineInDays?: number;
        tags: readonly string[];
        subtasks: readonly string[];
      }[]
    > = {
      'Revenue Intelligence Rollout': [
        {
          title: 'Map revenue data contracts',
          description: 'Align billing and usage schemas before ETL rollout.',
          status: 'done',
          priority: 2,
          dueInDays: -18,
          deadlineInDays: -14,
          tags: ['database', 'api'],
          subtasks: ['Confirm field ownership', 'Publish schema v2'],
        },
        {
          title: 'Deploy ingestion workers',
          description: 'Ship resilient collectors for billing providers.',
          status: 'doing',
          priority: 1,
          dueInDays: 3,
          deadlineInDays: 5,
          tags: ['backend', 'devops'],
          subtasks: ['Scale worker pool', 'Run soak tests'],
        },
        {
          title: 'Validate pipeline SLAs',
          description: 'Measure latency, freshness, and recovery budgets.',
          status: 'doing',
          priority: 2,
          dueInDays: 6,
          deadlineInDays: 9,
          tags: ['performance', 'testing'],
          subtasks: ['Collect baseline metrics', 'Tune retry policy'],
        },
        {
          title: 'Create anomaly playbook',
          description: 'Define incident response for revenue deltas.',
          status: 'todo',
          priority: 3,
          dueInDays: 10,
          tags: ['documentation', 'backend'],
          subtasks: ['Draft runbook', 'Review with operations'],
        },
        {
          title: 'Backfill historical invoices',
          description: 'Load 24 months of invoice data for trend analysis.',
          status: 'todo',
          priority: 2,
          dueInDays: 14,
          tags: ['database', 'backend'],
          subtasks: ['Prepare migration scripts', 'Validate reconciliations'],
        },
        {
          title: 'Tune fraud detection alerts',
          description: 'Reduce false positives on anomalous spend patterns.',
          status: 'blocked',
          priority: 1,
          dueInDays: 4,
          deadlineInDays: 6,
          tags: ['security', 'performance'],
          subtasks: ['Refine thresholds', 'Await risk team approval'],
        },
        {
          title: 'Publish monthly executive digest',
          description: 'Summarize revenue trends for leadership.',
          status: 'done',
          priority: 3,
          dueInDays: -2,
          tags: ['documentation', 'frontend'],
          subtasks: ['Generate summary deck', 'Distribute digest'],
        },
      ],
      'Customer Health Radar': [
        {
          title: 'Define churn risk signals',
          description: 'Finalize account health features with CS leadership.',
          status: 'done',
          priority: 2,
          dueInDays: -11,
          tags: ['documentation', 'api'],
          subtasks: ['Approve feature list', 'Version scoring spec'],
        },
        {
          title: 'Integrate support ticket feed',
          description: 'Ingest ticket metadata into health scoring pipeline.',
          status: 'doing',
          priority: 2,
          dueInDays: 2,
          tags: ['api', 'backend'],
          subtasks: ['Map ticket priorities', 'Backfill 90-day history'],
        },
        {
          title: 'Train customer health model',
          description: 'Tune model weights and recalibration cadence.',
          status: 'doing',
          priority: 1,
          dueInDays: 5,
          deadlineInDays: 8,
          tags: ['performance', 'testing'],
          subtasks: ['Run training batch', 'Evaluate precision drift'],
        },
        {
          title: 'Build health score dashboard',
          description: 'Expose account risk trends for customer success.',
          status: 'todo',
          priority: 3,
          dueInDays: 9,
          tags: ['frontend', 'api'],
          subtasks: ['Wire KPI cards', 'Add account drill-down'],
        },
        {
          title: 'Configure account alerts',
          description: 'Trigger automatic nudges for high-risk accounts.',
          status: 'todo',
          priority: 2,
          dueInDays: 4,
          tags: ['backend', 'api'],
          subtasks: ['Create alert rules', 'Add notification routing'],
        },
        {
          title: 'Document escalation matrix',
          description: 'Clarify ownership for severity-driven escalations.',
          status: 'done',
          priority: 4,
          dueInDays: -1,
          tags: ['documentation'],
          subtasks: ['Define severity ladder', 'Publish team contacts'],
        },
        {
          title: 'Pilot with top 20 accounts',
          description: 'Run a controlled rollout with strategic customers.',
          status: 'blocked',
          priority: 2,
          dueInDays: 7,
          deadlineInDays: 10,
          tags: ['testing', 'documentation'],
          subtasks: ['Finalize pilot cohort', 'Get legal sign-off'],
        },
      ],
      'Compliance Evidence Pipeline': [
        {
          title: 'Catalog SOC controls',
          description: 'Map control ownership to systems and services.',
          status: 'done',
          priority: 3,
          dueInDays: -9,
          tags: ['security', 'documentation'],
          subtasks: ['Confirm owner roster', 'Freeze control taxonomy'],
        },
        {
          title: 'Automate evidence collection jobs',
          description: 'Schedule recurring evidence harvest tasks.',
          status: 'doing',
          priority: 1,
          dueInDays: 3,
          tags: ['backend', 'devops'],
          subtasks: ['Create cron orchestration', 'Monitor extraction errors'],
        },
        {
          title: 'Wire audit trail retention',
          description: 'Guarantee retention and immutable log checkpoints.',
          status: 'doing',
          priority: 2,
          dueInDays: 6,
          tags: ['security', 'infrastructure'],
          subtasks: ['Configure retention policy', 'Verify restore drills'],
        },
        {
          title: 'Create compliance evidence index',
          description: 'Allow fast lookup by control and quarter.',
          status: 'todo',
          priority: 2,
          dueInDays: 11,
          tags: ['database', 'api'],
          subtasks: ['Design index keys', 'Add query endpoint'],
        },
        {
          title: 'Implement access attestations',
          description: 'Collect quarterly privilege attestations automatically.',
          status: 'todo',
          priority: 2,
          dueInDays: 15,
          tags: ['security', 'backend'],
          subtasks: ['Sync IAM groups', 'Send manager attestations'],
        },
        {
          title: 'Draft external auditor handoff',
          description: 'Prepare export package for annual audit review.',
          status: 'todo',
          priority: 3,
          dueInDays: 18,
          tags: ['documentation'],
          subtasks: ['Assemble evidence links', 'Validate package checksum'],
        },
        {
          title: 'Encrypt long-term archives',
          description: 'Apply envelope encryption for stored evidence sets.',
          status: 'blocked',
          priority: 1,
          dueInDays: 8,
          tags: ['security', 'infrastructure'],
          subtasks: ['Provision key hierarchy', 'Complete security review'],
        },
      ],
      'Field Support Automation': [
        {
          title: 'Map field support workflows',
          description: 'Document regional dispatch and closure patterns.',
          status: 'done',
          priority: 3,
          dueInDays: -14,
          tags: ['documentation'],
          subtasks: ['Collect regional playbooks', 'Normalize workflow states'],
        },
        {
          title: 'Integrate work-order events',
          description: 'Publish events from support tooling into CRM streams.',
          status: 'doing',
          priority: 2,
          dueInDays: 5,
          tags: ['api', 'backend'],
          subtasks: ['Map external payloads', 'Validate event ordering'],
        },
        {
          title: 'Configure dispatch optimization',
          description: 'Route field engineers with SLA and region constraints.',
          status: 'blocked',
          priority: 1,
          dueInDays: 6,
          deadlineInDays: 9,
          tags: ['performance', 'api'],
          subtasks: ['Tune route scoring', 'Await mapping quota approval'],
        },
        {
          title: 'Implement technician mobile forms',
          description: 'Build constrained offline forms for site diagnostics.',
          status: 'todo',
          priority: 2,
          dueInDays: 12,
          tags: ['mobile', 'frontend'],
          subtasks: ['Design form schema', 'Implement save queue'],
        },
        {
          title: 'Build offline sync retries',
          description: 'Guarantee resilient sync after connectivity drops.',
          status: 'doing',
          priority: 1,
          dueInDays: 3,
          tags: ['mobile', 'backend'],
          subtasks: ['Add conflict resolution', 'Stress-test queue replay'],
        },
        {
          title: 'Define regional SLA matrix',
          description: 'Capture contractual windows by region and customer tier.',
          status: 'todo',
          priority: 3,
          dueInDays: 9,
          tags: ['documentation'],
          subtasks: ['Review contracts', 'Publish SLA matrix'],
        },
        {
          title: 'Run production readiness review',
          description: 'Assess reliability and support handoff criteria.',
          status: 'blocked',
          priority: 2,
          dueInDays: 4,
          tags: ['testing', 'devops'],
          subtasks: ['Execute chaos drills', 'Approve rollback plan'],
        },
      ],
      'Executive KPI Broadcast': [
        {
          title: 'Align KPI definitions with finance',
          description: 'Lock shared KPI semantics with finance stakeholders.',
          status: 'done',
          priority: 2,
          dueInDays: -7,
          tags: ['documentation'],
          subtasks: ['Approve KPI glossary', 'Version metric contracts'],
        },
        {
          title: 'Build board-level KPI tiles',
          description: 'Create concise high-impact KPI visual components.',
          status: 'doing',
          priority: 2,
          dueInDays: 2,
          tags: ['frontend', 'performance'],
          subtasks: ['Finalize tile layout', 'Add threshold states'],
        },
        {
          title: 'Set cross-channel digest schedule',
          description: 'Coordinate email, chat, and dashboard release cadence.',
          status: 'doing',
          priority: 3,
          dueInDays: 6,
          tags: ['api', 'documentation'],
          subtasks: ['Define audience segments', 'Sync delivery windows'],
        },
        {
          title: 'Launch weekly performance brief',
          description: 'Pilot weekly summary with action-focused narrative.',
          status: 'todo',
          priority: 4,
          dueInDays: 1,
          tags: ['documentation', 'frontend'],
          subtasks: ['Draft narrative template', 'Prepare launch list'],
        },
        {
          title: 'Add scenario planning widgets',
          description: 'Enable what-if views for growth and retention levers.',
          status: 'todo',
          priority: 3,
          dueInDays: 13,
          tags: ['frontend', 'api'],
          subtasks: ['Define scenario inputs', 'Build forecast renderer'],
        },
        {
          title: 'Measure digest open-to-action rate',
          description: 'Track engagement-to-execution conversion.',
          status: 'todo',
          priority: 2,
          dueInDays: 7,
          tags: ['performance', 'api'],
          subtasks: ['Create tracking events', 'Publish conversion report'],
        },
        {
          title: 'Archive outdated KPI cards',
          description: 'Retire deprecated scorecards from old reporting packs.',
          status: 'done',
          priority: 4,
          dueInDays: -3,
          tags: ['documentation'],
          subtasks: ['Identify stale cards', 'Update archival index'],
        },
      ],
    };

    for (const project of seededProjects) {
      const projectId = String(project._id);
      const taskSeeds = taskSeedsByProject[project.name] || [];

      for (const task of taskSeeds) {
        const taskSlug = task.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        const subtasks = task.subtasks.map((text, order) => ({
          id: `${taskSlug}-${order + 1}`,
          text,
          done: task.status === 'done' ? true : order === 0 && task.status === 'doing',
          order,
        }));

        const payload: Record<string, unknown> = {
          projectId,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assigneeEmail: adminEmail,
          tags: [...task.tags],
          subtasks,
          updatedAt: now,
        };

        if (typeof task.dueInDays === 'number') {
          payload.dueAt = toIso(task.dueInDays);
        }
        if (typeof task.deadlineInDays === 'number') {
          payload.deadlineAt = toIso(task.deadlineInDays);
        }

        const exists = await this.tasksRepo.findOne({
          where: { projectId, title: task.title } as any,
        });

        if (exists) {
          await this.tasksRepo.update(exists._id as any, payload as any);
        } else {
          await this.tasksRepo.save({
            ...payload,
            createdAt: now,
          } as any);
        }
      }
    }

    const merged = [...projects];
    for (const project of seededProjects) {
      const projectId = String(project._id);
      if (merged.some((candidate) => String(candidate._id) === projectId)) {
        continue;
      }
      merged.push(project);
    }

    return merged;
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
