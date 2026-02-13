import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { ObjectId } from 'mongodb';
import { createInterface } from 'readline';
import { Readable } from 'stream';
import { MongoRepository } from 'typeorm';
import ImportIngestionRunEntity, {
  type ImportIngestionDuplicateStrategy,
} from '../../entities/ImportIngestionRunEntity';
import ProjectEntity from '../../entities/ProjectEntity';
import TaskEntity from '../../entities/TaskEntity';
import {
  projectImportRowSchema,
  taskImportRowSchema,
  type ValidatedImportRow,
} from './import-row.schemas';

type ImportSourceFormat = 'csv' | 'yaml' | 'xml' | 'json' | 'markdown';

type ImportFileOptions = Readonly<{
  duplicateStrategy?: string;
}>;

export type ImportFileResult = Readonly<{
  projects: number;
  tasks: number;
  skipped: number;
  totalRows: number;
  duplicateRowsInPayload: number;
  idempotent: boolean;
  duplicateStrategy: ImportIngestionDuplicateStrategy;
  importKey: string;
}>;

type RawImportRow = Readonly<{
  type: 'project' | 'task';
  name: string;
  description: string;
  status: string;
  priority: number;
  dueAt: string;
  tags: string[];
  projectId: string;
  code: string;
}>;

type PersistedImportStats = Readonly<{
  projects: number;
  tasks: number;
  skipped: number;
}>;

type ExistingLookup = Readonly<{
  projectByKey: Readonly<Map<string, ProjectEntity>>;
  taskByKey: Readonly<Map<string, TaskEntity>>;
}>;

const DUPLICATE_STRATEGIES = new Set<ImportIngestionDuplicateStrategy>([
  'skip-duplicates',
  'update-on-match',
  'strict-fail',
]);

const normalizeDuplicateStrategy = (
  raw: string | undefined,
): ImportIngestionDuplicateStrategy => {
  const value = String(raw || 'skip-duplicates').trim().toLowerCase();
  if (DUPLICATE_STRATEGIES.has(value as ImportIngestionDuplicateStrategy)) {
    return value as ImportIngestionDuplicateStrategy;
  }
  throw new BadRequestException(
    'Invalid duplicateStrategy. Use skip-duplicates, update-on-match or strict-fail.',
  );
};

@Injectable()
export default class ImportService {
  private readonly logger = new Logger(ImportService.name);
  private static readonly BATCH_SIZE = 250;
  private static readonly CSV_MIME_TYPES = new Set([
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
  ]);
  private static readonly YAML_MIME_TYPES = new Set([
    'application/x-yaml',
    'text/yaml',
    'application/yaml',
  ]);
  private static readonly XML_MIME_TYPES = new Set([
    'application/xml',
    'text/xml',
  ]);
  private static readonly JSON_MIME_TYPES = new Set([
    'application/json',
    'text/json',
  ]);
  private static readonly MARKDOWN_MIME_TYPES = new Set([
    'text/markdown',
    'text/x-markdown',
  ]);

  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: MongoRepository<ProjectEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepo: MongoRepository<TaskEntity>,
    @InjectRepository(ImportIngestionRunEntity)
    private readonly ingestionRunRepo: MongoRepository<ImportIngestionRunEntity>,
  ) {}

  async importFile(
    buffer: Buffer,
    mimeType: string,
    ownerEmail: string,
    originalName?: string,
    options: ImportFileOptions = {},
  ): Promise<ImportFileResult> {
    const normalizedOwner = String(ownerEmail || '').trim().toLowerCase();
    if (!normalizedOwner) {
      throw new BadRequestException('Owner email is required');
    }

    const format = this.resolveFormat(mimeType, originalName);
    if (!format) {
      throw new BadRequestException(
        `Unsupported file type: ${mimeType}. Accepted: csv, yml, yaml, xml, json, md`,
      );
    }

    const duplicateStrategy = normalizeDuplicateStrategy(options.duplicateStrategy);
    const fileHash = createHash('sha256').update(buffer).digest('hex');
    const importKey = createHash('sha256')
      .update(`${normalizedOwner}|${format}|${duplicateStrategy}|${fileHash}`)
      .digest('hex');
    const now = new Date().toISOString();

    const existingRun = await this.ingestionRunRepo.findOne({
      where: { key: importKey } as any,
    });
    if (existingRun?.status === 'completed') {
      return {
        projects: Number(existingRun.projects || 0),
        tasks: Number(existingRun.tasks || 0),
        skipped: Number(existingRun.skipped || 0),
        totalRows: Number(existingRun.totalRows || 0),
        duplicateRowsInPayload: Number(existingRun.duplicateRowsInPayload || 0),
        idempotent: true,
        duplicateStrategy,
        importKey,
      };
    }
    if (existingRun?.status === 'processing') {
      throw new ConflictException('An import with the same payload is already processing.');
    }

    let runEntity: ImportIngestionRunEntity;
    if (existingRun) {
      runEntity = existingRun;
    } else {
      runEntity = new ImportIngestionRunEntity();
      runEntity.key = importKey;
      runEntity.ownerEmail = normalizedOwner;
      runEntity.format = format;
      runEntity.duplicateStrategy = duplicateStrategy;
      runEntity.fileHash = fileHash;
      runEntity.fileName = originalName;
      runEntity.mimeType = mimeType;
      runEntity.status = 'processing';
      runEntity.totalRows = 0;
      runEntity.projects = 0;
      runEntity.tasks = 0;
      runEntity.skipped = 0;
      runEntity.duplicateRowsInPayload = 0;
      runEntity.createdAt = now;
      runEntity.updatedAt = now;
    }

    runEntity.status = 'processing';
    runEntity.updatedAt = now;
    runEntity.error = undefined;
    runEntity.completedAt = undefined;
    await this.ingestionRunRepo.save(runEntity);

    try {
      const rawRows = await this.parseRowsByFormat(buffer, format);
      const validatedRows = rawRows.map((row, index) =>
        this.validateAndNormalizeRow(row, index + 1),
      );
      const deduped = this.applyPayloadDedup(validatedRows, duplicateStrategy);
      const existingLookup = await this.fetchExistingLookup(
        deduped.rows,
        normalizedOwner,
      );
      const persisted = await this.persistRows(
        deduped.rows,
        normalizedOwner,
        duplicateStrategy,
        existingLookup,
      );

      const completedAt = new Date().toISOString();
      runEntity.status = 'completed';
      runEntity.totalRows = rawRows.length;
      runEntity.projects = persisted.projects;
      runEntity.tasks = persisted.tasks;
      runEntity.skipped = persisted.skipped;
      runEntity.duplicateRowsInPayload = deduped.duplicateRowsInPayload;
      runEntity.updatedAt = completedAt;
      runEntity.completedAt = completedAt;
      await this.ingestionRunRepo.save(runEntity);

      this.logger.log(
        `Import complete: ${persisted.projects} projects, ${persisted.tasks} tasks, ` +
          `${persisted.skipped} skipped (${duplicateStrategy}) by ${normalizedOwner}`,
      );

      return {
        projects: persisted.projects,
        tasks: persisted.tasks,
        skipped: persisted.skipped,
        totalRows: rawRows.length,
        duplicateRowsInPayload: deduped.duplicateRowsInPayload,
        idempotent: false,
        duplicateStrategy,
        importKey,
      };
    } catch (error) {
      const failedAt = new Date().toISOString();
      runEntity.status = 'failed';
      runEntity.error =
        error instanceof Error ? error.message.slice(0, 400) : 'Import failed';
      runEntity.updatedAt = failedAt;
      await this.ingestionRunRepo.save(runEntity);
      throw error;
    }
  }

  private async parseRowsByFormat(
    buffer: Buffer,
    format: ImportSourceFormat,
  ): Promise<RawImportRow[]> {
    if (format === 'csv') return this.parseCsvStream(buffer);
    if (format === 'yaml') return this.parseYamlStream(buffer);
    if (format === 'xml') return this.parseXml(buffer.toString('utf-8').trim());
    if (format === 'json') return this.parseJson(buffer.toString('utf-8').trim());
    return this.parseMarkdown(buffer.toString('utf-8').trim());
  }

  private async parseCsvStream(buffer: Buffer): Promise<RawImportRow[]> {
    const rows: RawImportRow[] = [];
    let headers: string[] | null = null;
    let delimiter = ',';

    for await (const rawLine of this.iterateLines(buffer)) {
      const line = rawLine.replace(/\uFEFF/g, '');
      if (!line.trim()) continue;
      if (!headers) {
        delimiter = this.detectDelimiter(line);
        headers = this.splitCsvLine(line, delimiter).map((item) =>
          item.trim().toLowerCase(),
        );
        continue;
      }
      const cols = this.splitCsvLine(line, delimiter);
      const obj: Record<string, string> = {};
      headers.forEach((key, index) => {
        obj[key] = String(cols[index] ?? '').trim();
      });
      rows.push(this.mapRow(obj));
    }

    if (!headers) {
      throw new BadRequestException('CSV must have a header and at least one row');
    }
    if (!rows.length) {
      throw new BadRequestException('CSV must contain at least one data row');
    }
    return rows;
  }

  private detectDelimiter(line: string): string {
    const comma = (line.match(/,/g) ?? []).length;
    const semicolon = (line.match(/;/g) ?? []).length;
    const tab = (line.match(/\t/g) ?? []).length;
    if (semicolon > comma && semicolon >= tab) return ';';
    if (tab > comma && tab > semicolon) return '\t';
    return ',';
  }

  private splitCsvLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuote = !inQuote;
        continue;
      }
      if (!inQuote && ch === delimiter) {
        result.push(current);
        current = '';
        continue;
      }
      current += ch;
    }
    result.push(current);
    return result;
  }

  private async parseYamlStream(buffer: Buffer): Promise<RawImportRow[]> {
    const rows: RawImportRow[] = [];
    let current: Record<string, string> = {};

    const flushCurrent = () => {
      if (Object.keys(current).length > 0) {
        rows.push(this.mapRow(current));
        current = {};
      }
    };

    for await (const rawLine of this.iterateLines(buffer)) {
      const line = rawLine.trimEnd();
      if (!line.trim()) continue;
      if (/^\s*-\s/.test(line)) {
        flushCurrent();
        const kv = line.replace(/^\s*-\s*/, '');
        this.parseYamlKv(kv, current);
        continue;
      }
      if (/^\s+\w/.test(line) || /^[A-Za-z_]/.test(line)) {
        this.parseYamlKv(line.trim(), current);
      }
    }
    flushCurrent();

    if (!rows.length) {
      throw new BadRequestException('YAML must contain at least one entry');
    }
    return rows;
  }

  private parseYamlKv(segment: string, out: Record<string, string>): void {
    const idx = segment.indexOf(':');
    if (idx < 1) return;
    const key = segment.slice(0, idx).trim().toLowerCase();
    const value = segment
      .slice(idx + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    out[key] = value;
  }

  private parseXml(text: string): RawImportRow[] {
    if (!text) throw new BadRequestException('Empty file');
    const items: RawImportRow[] = [];
    const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
    let m: RegExpExecArray | null;

    while ((m = itemRe.exec(text)) !== null) {
      const inner = m[1] ?? '';
      const obj: Record<string, string> = {};

      const typeAttr = /<item\b[^>]*type=["']([^"']+)["']/.exec(m[0] ?? '');
      if (typeAttr?.[1]) obj['type'] = typeAttr[1];

      const tagRe = /<(\w+)>([\s\S]*?)<\/\1>/g;
      let t: RegExpExecArray | null;
      while ((t = tagRe.exec(inner)) !== null) {
        if (!t[1]) continue;
        obj[t[1].toLowerCase()] = String(t[2] ?? '').trim();
      }
      items.push(this.mapRow(obj));
    }
    if (!items.length) {
      throw new BadRequestException('XML must contain at least one <item> row');
    }
    return items;
  }

  private parseJson(text: string): RawImportRow[] {
    if (!text) throw new BadRequestException('Empty file');
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new BadRequestException('Invalid JSON payload');
    }

    const items = this.extractJsonItems(parsed);
    if (!items.length) {
      throw new BadRequestException('JSON must contain at least one record');
    }
    return items.map((entry) => this.mapRow(this.stringifyRecord(entry)));
  }

  private extractJsonItems(value: unknown): ReadonlyArray<Record<string, unknown>> {
    if (Array.isArray(value)) {
      return value.filter((entry) => this.isRecord(entry)) as Array<
        Record<string, unknown>
      >;
    }
    if (!this.isRecord(value)) return [];

    const rec = value as Record<string, unknown>;
    const nested = rec['items'] ?? rec['rows'] ?? rec['data'];
    if (Array.isArray(nested)) {
      return nested.filter((entry) => this.isRecord(entry)) as Array<
        Record<string, unknown>
      >;
    }
    return [rec];
  }

  private parseMarkdown(text: string): RawImportRow[] {
    if (!text) throw new BadRequestException('Empty file');
    const tableRows = this.parseMarkdownTable(text);
    if (tableRows.length > 0) {
      return tableRows.map((entry) => this.mapRow(entry));
    }
    const blockRows = this.parseMarkdownKeyValueBlocks(text);
    if (blockRows.length > 0) {
      return blockRows.map((entry) => this.mapRow(entry));
    }
    throw new BadRequestException(
      'Markdown must contain a table or key:value blocks',
    );
  }

  private parseMarkdownTable(text: string): Array<Record<string, string>> {
    const lines = text
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const tableLines = lines.filter((line) => line.includes('|'));
    if (tableLines.length < 3) return [];

    const header = this.splitMarkdownTableLine(tableLines[0] ?? '');
    const separator = this.splitMarkdownTableLine(tableLines[1] ?? '');
    if (!header.length || !separator.length) return [];
    const separatorValid = separator.every((cell) => /^:?-{3,}:?$/.test(cell));
    if (!separatorValid) return [];

    const rows: Array<Record<string, string>> = [];
    for (let index = 2; index < tableLines.length; index += 1) {
      const rowValues = this.splitMarkdownTableLine(tableLines[index] ?? '');
      if (!rowValues.some((value) => value)) continue;
      const row: Record<string, string> = {};
      header.forEach((field, fieldIndex) => {
        row[field.toLowerCase()] = String(rowValues[fieldIndex] ?? '').trim();
      });
      rows.push(row);
    }
    return rows;
  }

  private splitMarkdownTableLine(line: string): string[] {
    return line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());
  }

  private parseMarkdownKeyValueBlocks(text: string): Array<Record<string, string>> {
    const blocks: Array<Record<string, string>> = [];
    let current: Record<string, string> = {};

    const pushCurrent = () => {
      if (Object.keys(current).length > 0) {
        blocks.push(current);
        current = {};
      }
    };

    for (const rawLine of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || /^#{1,6}\s+/.test(line)) {
        pushCurrent();
        continue;
      }
      const normalized = line.replace(/^[-*]\s+/, '');
      const match = normalized.match(/^([^:]+)\s*:\s*(.+)$/);
      if (!match) continue;
      const key = match[1]?.trim().toLowerCase().replace(/\s+/g, '_');
      const value = match[2]?.trim() ?? '';
      if (!key || !value) continue;
      current[key] = value;
    }
    pushCurrent();
    return blocks;
  }

  private mapRow(obj: Record<string, string>): RawImportRow {
    const type =
      (obj['type'] || 'task').toLowerCase() === 'project' ? 'project' : 'task';
    return {
      type,
      name: String(obj['name'] || obj['title'] || 'Untitled').trim(),
      description: String(obj['description'] || obj['desc'] || '').trim(),
      status: String(obj['status'] || (type === 'project' ? 'planned' : 'todo')).trim(),
      priority: parseInt(String(obj['priority'] || '3').trim(), 10) || 3,
      dueAt: String(obj['dueat'] || obj['due_at'] || obj['due'] || '').trim(),
      tags: String(obj['tags'] || '')
        .split(/[;|,]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
      projectId: String(obj['projectid'] || obj['project_id'] || '').trim(),
      code: String(obj['code'] || obj['project_code'] || '').trim(),
    };
  }

  private validateAndNormalizeRow(
    rawRow: RawImportRow,
    rowNumber: number,
  ): ValidatedImportRow {
    const parsed =
      rawRow.type === 'project'
        ? projectImportRowSchema.safeParse(rawRow)
        : taskImportRowSchema.safeParse(rawRow);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'invalid row';
      throw new BadRequestException(`Row ${rowNumber}: ${firstError}`);
    }
    return parsed.data;
  }

  private applyPayloadDedup(
    rows: readonly ValidatedImportRow[],
    strategy: ImportIngestionDuplicateStrategy,
  ): Readonly<{
    rows: readonly ValidatedImportRow[];
    duplicateRowsInPayload: number;
  }> {
    const seen = new Set<string>();
    const deduped: ValidatedImportRow[] = [];
    const updateMap = new Map<string, ValidatedImportRow>();
    let duplicateRowsInPayload = 0;

    rows.forEach((row) => {
      const key = this.rowDedupKey(row);
      if (seen.has(key)) {
        duplicateRowsInPayload += 1;
        if (strategy === 'strict-fail') {
          throw new ConflictException(
            `Duplicate row detected in payload for key "${key}"`,
          );
        }
        if (strategy === 'update-on-match') {
          updateMap.set(key, row);
        }
        return;
      }
      seen.add(key);
      if (strategy === 'update-on-match') {
        updateMap.set(key, row);
        return;
      }
      deduped.push(row);
    });

    return {
      rows:
        strategy === 'update-on-match' ? Array.from(updateMap.values()) : deduped,
      duplicateRowsInPayload,
    };
  }

  private async fetchExistingLookup(
    rows: readonly ValidatedImportRow[],
    ownerEmail: string,
  ): Promise<ExistingLookup> {
    const projectCodes = new Set<string>();
    const taskTitles = new Set<string>();

    rows.forEach((row) => {
      if (row.type === 'project') {
        projectCodes.add(String(row.code || '').trim().toUpperCase());
      } else {
        taskTitles.add(String(row.name || '').trim());
      }
    });

    const existingProjects =
      projectCodes.size > 0
        ? await this.projectRepo.find({
            where: { code: { $in: Array.from(projectCodes) } } as any,
            take: Math.max(500, projectCodes.size * 2),
          } as any)
        : [];
    const existingTasks =
      taskTitles.size > 0
        ? await this.taskRepo.find({
            where: {
              title: { $in: Array.from(taskTitles) },
              assigneeEmail: ownerEmail,
            } as any,
            take: Math.max(500, taskTitles.size * 5),
          } as any)
        : [];

    const projectByKey = new Map<string, ProjectEntity>();
    existingProjects.forEach((item) => {
      const key = `project:${String((item as any).code || '')
        .trim()
        .toUpperCase()}`;
      if (!key.endsWith(':')) {
        projectByKey.set(key, item);
      }
    });

    const taskByKey = new Map<string, TaskEntity>();
    existingTasks.forEach((item) => {
      const scope = String((item as any).projectId || '__no_project__').trim();
      const title = String((item as any).title || '')
        .trim()
        .toLowerCase();
      const key = `task:${scope}:${title}:${ownerEmail}`;
      taskByKey.set(key, item);
    });

    return { projectByKey, taskByKey };
  }

  private async persistRows(
    rows: readonly ValidatedImportRow[],
    ownerEmail: string,
    strategy: ImportIngestionDuplicateStrategy,
    existingLookup: ExistingLookup,
  ): Promise<PersistedImportStats> {
    const now = new Date().toISOString();
    const projectOps: any[] = [];
    const taskOps: any[] = [];
    let projects = 0;
    let tasks = 0;
    let skipped = 0;

    for (const row of rows) {
      const dedupKey = this.rowDedupKey(row, ownerEmail);
      if (row.type === 'project') {
        const existing = existingLookup.projectByKey.get(dedupKey);
        if (existing) {
          if (strategy === 'strict-fail') {
            throw new ConflictException(
              `Project duplicate found for key "${dedupKey}"`,
            );
          }
          if (strategy === 'skip-duplicates') {
            skipped += 1;
            continue;
          }
          projectOps.push({
            updateOne: {
              filter: { _id: (existing as any)._id as ObjectId },
              update: {
                $set: {
                  name: row.name,
                  code: row.code,
                  description: row.description || undefined,
                  status: row.status,
                  ownerEmail,
                  dueAt: row.dueAt || undefined,
                  tags: row.tags.length ? row.tags : undefined,
                  updatedAt: now,
                },
              },
              upsert: false,
            },
          });
          projects += 1;
          continue;
        }
        projectOps.push({
          insertOne: {
            document: {
              name: row.name,
              code: row.code,
              description: row.description || undefined,
              status: row.status,
              ownerEmail,
              dueAt: row.dueAt || undefined,
              tags: row.tags.length ? row.tags : undefined,
              createdAt: now,
              updatedAt: now,
            },
          },
        });
        projects += 1;
        continue;
      }

      const existing = existingLookup.taskByKey.get(dedupKey);
      if (existing) {
        if (strategy === 'strict-fail') {
          throw new ConflictException(`Task duplicate found for key "${dedupKey}"`);
        }
        if (strategy === 'skip-duplicates') {
          skipped += 1;
          continue;
        }
        taskOps.push({
          updateOne: {
            filter: { _id: (existing as any)._id as ObjectId },
            update: {
              $set: {
                title: row.name,
                description: row.description || undefined,
                status: row.status,
                priority: row.priority,
                assigneeEmail: ownerEmail,
                dueAt: row.dueAt || undefined,
                tags: row.tags.length ? row.tags : undefined,
                projectId: row.projectId || undefined,
                updatedAt: now,
              },
            },
            upsert: false,
          },
        });
        tasks += 1;
        continue;
      }
      taskOps.push({
        insertOne: {
          document: {
            title: row.name,
            description: row.description || undefined,
            status: row.status,
            priority: row.priority,
            assigneeEmail: ownerEmail,
            dueAt: row.dueAt || undefined,
            tags: row.tags.length ? row.tags : undefined,
            projectId: row.projectId || undefined,
            createdAt: now,
            updatedAt: now,
          },
        },
      });
      tasks += 1;
    }

    await this.executeBulk(this.projectRepo, projectOps);
    await this.executeBulk(this.taskRepo, taskOps);
    return { projects, tasks, skipped };
  }

  private async executeBulk<T extends object>(
    repo: MongoRepository<T>,
    operations: readonly any[],
  ): Promise<void> {
    if (!operations.length) return;
    for (let index = 0; index < operations.length; index += ImportService.BATCH_SIZE) {
      const chunk = operations.slice(index, index + ImportService.BATCH_SIZE);
      await repo.bulkWrite(chunk as any, { ordered: false } as any);
    }
  }

  private rowDedupKey(
    row: ValidatedImportRow,
    ownerEmail = '',
  ): string {
    if (row.type === 'project') {
      return `project:${String(row.code || '').trim().toUpperCase()}`;
    }
    const scope = String(row.projectId || '__no_project__').trim();
    return `task:${scope}:${row.name.trim().toLowerCase()}:${ownerEmail}`;
  }

  private resolveFormat(
    mimeType: string,
    originalName?: string,
  ): ImportSourceFormat | null {
    const normalizedMime = String(mimeType || '')
      .toLowerCase()
      .split(';')[0]
      .trim();
    const extension = String(originalName || '')
      .toLowerCase()
      .split('.')
      .pop();

    if (
      ImportService.CSV_MIME_TYPES.has(normalizedMime) ||
      extension === 'csv' ||
      (normalizedMime === 'text/plain' && extension === 'csv')
    ) {
      return 'csv';
    }
    if (
      ImportService.YAML_MIME_TYPES.has(normalizedMime) ||
      extension === 'yml' ||
      extension === 'yaml'
    ) {
      return 'yaml';
    }
    if (
      ImportService.XML_MIME_TYPES.has(normalizedMime) ||
      extension === 'xml'
    ) {
      return 'xml';
    }
    if (
      ImportService.JSON_MIME_TYPES.has(normalizedMime) ||
      extension === 'json'
    ) {
      return 'json';
    }
    if (
      ImportService.MARKDOWN_MIME_TYPES.has(normalizedMime) ||
      extension === 'md' ||
      extension === 'markdown' ||
      (normalizedMime === 'text/plain' &&
        (extension === 'md' || extension === 'markdown'))
    ) {
      return 'markdown';
    }
    return null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private stringifyRecord(record: Record<string, unknown>): Record<string, string> {
    return Object.entries(record).reduce<Record<string, string>>(
      (acc, [rawKey, rawValue]) => {
        const key = String(rawKey || '').trim().toLowerCase();
        if (!key) return acc;
        if (typeof rawValue === 'string') {
          acc[key] = rawValue.trim();
          return acc;
        }
        if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
          acc[key] = String(rawValue);
          return acc;
        }
        if (Array.isArray(rawValue)) {
          acc[key] = rawValue
            .map((entry) => String(entry ?? '').trim())
            .filter(Boolean)
            .join(', ');
          return acc;
        }
        if (this.isRecord(rawValue)) {
          acc[key] = JSON.stringify(rawValue);
          return acc;
        }
        acc[key] = '';
        return acc;
      },
      {},
    );
  }

  private async *iterateLines(buffer: Buffer): AsyncGenerator<string> {
    const input = Readable.from([buffer]);
    input.setEncoding('utf8');
    const rl = createInterface({ input, crlfDelay: Infinity });
    for await (const line of rl) {
      yield String(line);
    }
  }
}
