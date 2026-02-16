import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import ClientEntity from '../../entities/ClientEntity';
import ProjectEntity from '../../entities/ProjectEntity';
import TaskEntity from '../../entities/TaskEntity';
import LeadEntity from '../../entities/LeadEntity';
import MessageEventEntity from '../../entities/MessageEventEntity';
import UserEntity from '../../entities/UserEntity';

export type ImportSuggestionKind = 'clients' | 'projects' | 'users';

export type ImportFieldSuggestion = Readonly<{
  value: string;
  score: number;
}>;

export type ImportFieldSuggestionsItem = Readonly<{
  field: string;
  suggestions: readonly ImportFieldSuggestion[];
}>;

type ListSuggestionsOptions = Readonly<{
  kind: ImportSuggestionKind;
  field?: string;
  query?: string;
  limit?: number;
}>;

const VALID_KINDS = new Set<ImportSuggestionKind>([
  'clients',
  'projects',
  'users',
]);

const normalizeToken = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const toCleanText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const toSafeLimit = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5;
  return Math.max(1, Math.min(5, Math.floor(parsed)));
};

class WeightedSuggestionsBuilder {
  private readonly byField = new Map<string, Map<string, number>>();

  add(field: string, value: unknown, score: number): void {
    const safeField = toCleanText(field);
    const safeValue = toCleanText(value);
    if (!safeField || !safeValue) return;
    const normalizedScore = Number.isFinite(score) ? Math.max(0, score) : 0;
    if (normalizedScore <= 0) return;

    if (!this.byField.has(safeField)) {
      this.byField.set(safeField, new Map<string, number>());
    }
    const map = this.byField.get(safeField)!;
    map.set(safeValue, (map.get(safeValue) ?? 0) + normalizedScore);
  }

  finalize(
    fieldFilter: string | undefined,
    query: string | undefined,
    limit: number,
  ): ImportFieldSuggestionsItem[] {
    const normalizedQuery = normalizeToken(query);
    const normalizedField = toCleanText(fieldFilter);
    const fields = normalizedField
      ? [...this.byField.keys()].filter((field) => field === normalizedField)
      : [...this.byField.keys()];

    return fields
      .map((field) => {
        const suggestions = [...(this.byField.get(field)?.entries() ?? [])]
          .map(([value, baseScore]) => {
            const queryBoost = this.queryBoost(value, normalizedQuery);
            if (queryBoost === null) return null;
            return {
              value,
              score: Number((baseScore + queryBoost).toFixed(2)),
            };
          })
          .filter((entry): entry is { value: string; score: number } =>
            Boolean(entry),
          )
          .sort((left, right) => {
            if (right.score !== left.score) {
              return right.score - left.score;
            }
            return left.value.localeCompare(right.value, 'pt-BR');
          })
          .slice(0, limit);

        return {
          field,
          suggestions,
        };
      })
      .filter((item) => item.suggestions.length > 0);
  }

  private queryBoost(value: string, normalizedQuery: string): number | null {
    if (!normalizedQuery) return 0;
    const normalizedValue = normalizeToken(value);
    if (!normalizedValue.includes(normalizedQuery)) return null;
    if (normalizedValue.startsWith(normalizedQuery)) return 120;
    return 60;
  }
}

@Injectable()
export default class ImportFieldSuggestionsService {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly clientsRepo: MongoRepository<ClientEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectsRepo: MongoRepository<ProjectEntity>,
    @InjectRepository(TaskEntity)
    private readonly tasksRepo: MongoRepository<TaskEntity>,
    @InjectRepository(LeadEntity)
    private readonly leadsRepo: MongoRepository<LeadEntity>,
    @InjectRepository(MessageEventEntity)
    private readonly messageEventsRepo: MongoRepository<MessageEventEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepo: MongoRepository<UserEntity>,
  ) {}

  async list(
    options: ListSuggestionsOptions,
  ): Promise<readonly ImportFieldSuggestionsItem[]> {
    const kind = options.kind;
    if (!VALID_KINDS.has(kind)) {
      throw new BadRequestException(
        'Kind inválido. Use clients, projects ou users.',
      );
    }
    const limit = toSafeLimit(options.limit);
    const field = toCleanText(options.field) || undefined;
    const query = toCleanText(options.query) || undefined;

    if (kind === 'clients') {
      return this.listClientSuggestions(field, query, limit);
    }
    if (kind === 'projects') {
      return this.listProjectSuggestions(field, query, limit);
    }
    return this.listUserSuggestions(field, query, limit);
  }

  private async listClientSuggestions(
    field: string | undefined,
    query: string | undefined,
    limit: number,
  ): Promise<readonly ImportFieldSuggestionsItem[]> {
    const [clients, projects, leads, messageEvents] = await Promise.all([
      this.clientsRepo.find({ take: 1000 } as any),
      this.projectsRepo.find({ take: 4000 } as any),
      this.leadsRepo.find({ take: 4000 } as any),
      this.messageEventsRepo.find({ take: 8000 } as any),
    ]);

    const projectsByClientId = new Map<string, number>();
    projects.forEach((project) => {
      const clientId = toCleanText((project as any).clientId);
      if (!clientId) return;
      projectsByClientId.set(
        clientId,
        (projectsByClientId.get(clientId) ?? 0) + 1,
      );
    });

    const conversionsByClientId = new Map<string, number>();
    leads.forEach((lead) => {
      const clientId = toCleanText((lead as any).convertedClientId);
      if (!clientId) return;
      conversionsByClientId.set(
        clientId,
        (conversionsByClientId.get(clientId) ?? 0) + 1,
      );
    });

    const eventsByClientId = new Map<string, number>();
    messageEvents.forEach((event) => {
      const clientId = toCleanText((event as any).clientId);
      if (!clientId) return;
      eventsByClientId.set(clientId, (eventsByClientId.get(clientId) ?? 0) + 1);
    });

    const builder = new WeightedSuggestionsBuilder();
    clients.forEach((client) => {
      const clientId = toCleanText((client as any).id);
      const projectCount = projectsByClientId.get(clientId) ?? 0;
      const convertedCount = conversionsByClientId.get(clientId) ?? 0;
      const eventCount = eventsByClientId.get(clientId) ?? 0;
      const baseScore =
        8 + projectCount * 5 + convertedCount * 3 + eventCount * 0.2;

      builder.add('name', (client as any).name, baseScore + 8);
      builder.add('company', (client as any).company, baseScore + 5);
      builder.add('email', (client as any).email, baseScore + 4);
      builder.add('phone', (client as any).phone, baseScore + 3);
      builder.add('cellPhone', (client as any).cellPhone, baseScore + 3);
      builder.add(
        'whatsappNumber',
        (client as any).whatsappNumber,
        baseScore + 3,
      );
      builder.add('cep', (client as any).cep, baseScore + 1);
      builder.add('cnpj', (client as any).cnpj, baseScore + 1);
    });

    return builder.finalize(field, query, limit);
  }

  private async listProjectSuggestions(
    field: string | undefined,
    query: string | undefined,
    limit: number,
  ): Promise<readonly ImportFieldSuggestionsItem[]> {
    const [projects, tasks] = await Promise.all([
      this.projectsRepo.find({ take: 4000 } as any),
      this.tasksRepo.find({ take: 12000 } as any),
    ]);

    const tasksByProjectId = new Map<string, number>();
    tasks.forEach((task) => {
      const projectId = toCleanText((task as any).projectId);
      if (!projectId) return;
      tasksByProjectId.set(
        projectId,
        (tasksByProjectId.get(projectId) ?? 0) + 1,
      );
    });

    const statusBoostByValue: Readonly<Record<string, number>> = {
      active: 5,
      planned: 4,
      blocked: 2,
      done: 3,
      archived: 1,
    };

    const builder = new WeightedSuggestionsBuilder();
    projects.forEach((project) => {
      const projectId = toCleanText(String((project as any)._id ?? ''));
      const taskCount = tasksByProjectId.get(projectId) ?? 0;
      const status = toCleanText((project as any).status).toLowerCase();
      const statusBoost = statusBoostByValue[status] ?? 1;
      const baseScore = 8 + taskCount * 2 + statusBoost;

      builder.add('name', (project as any).name, baseScore + 8);
      builder.add('code', (project as any).code, baseScore + 4);
      builder.add('ownerEmail', (project as any).ownerEmail, baseScore + 4);
      builder.add('status', status, baseScore + 2);
      builder.add('description', (project as any).description, baseScore + 1);

      const tags = Array.isArray((project as any).tags)
        ? (project as any).tags
        : [];
      tags.forEach((tag: unknown) => builder.add('tags', tag, baseScore + 1));
    });

    return builder.finalize(field, query, limit);
  }

  private async listUserSuggestions(
    field: string | undefined,
    query: string | undefined,
    limit: number,
  ): Promise<readonly ImportFieldSuggestionsItem[]> {
    const [users, tasks, projects] = await Promise.all([
      this.usersRepo.find({ take: 1000 } as any),
      this.tasksRepo.find({ take: 12000 } as any),
      this.projectsRepo.find({ take: 4000 } as any),
    ]);

    const taskAssignmentsByEmail = new Map<string, number>();
    tasks.forEach((task) => {
      const email = normalizeToken((task as any).assigneeEmail);
      if (!email) return;
      taskAssignmentsByEmail.set(
        email,
        (taskAssignmentsByEmail.get(email) ?? 0) + 1,
      );
    });

    const projectsByOwnerEmail = new Map<string, number>();
    projects.forEach((project) => {
      const email = normalizeToken((project as any).ownerEmail);
      if (!email) return;
      projectsByOwnerEmail.set(
        email,
        (projectsByOwnerEmail.get(email) ?? 0) + 1,
      );
    });

    const builder = new WeightedSuggestionsBuilder();
    users.forEach((user) => {
      const email = toCleanText((user as any).email).toLowerCase();
      if (!email) return;
      const taskCount = taskAssignmentsByEmail.get(email) ?? 0;
      const projectOwnership = projectsByOwnerEmail.get(email) ?? 0;
      const roles = Array.isArray((user as any).roles)
        ? (user as any).roles
        : [];
      const roleBoost = roles.includes('admin')
        ? 4
        : roles.includes('manager')
          ? 3
          : roles.includes('member')
            ? 2
            : 1;
      const baseScore = 8 + taskCount * 3 + projectOwnership * 2 + roleBoost;

      builder.add('email', email, baseScore + 8);
      builder.add('firstName', (user as any).firstName, baseScore + 4);
      builder.add('lastName', (user as any).lastName, baseScore + 4);
      builder.add('department', (user as any).department, baseScore + 3);
      builder.add('phone', (user as any).phone, baseScore + 2);
    });

    return builder.finalize(field, query, limit);
  }
}
