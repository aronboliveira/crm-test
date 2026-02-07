import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import ProjectEntity from '../../entities/ProjectEntity';
import TaskEntity from '../../entities/TaskEntity';

/**
 * Handles CSV, YML, and XML bulk import of projects / tasks.
 *
 * Expected CSV columns (first row is header, comma-separated):
 *   type, name|title, description, status, priority, dueAt, tags
 *
 * Expected YML structure (array of objects):
 *   - type: project|task
 *     name: My Project
 *     ...
 *
 * Expected XML:
 *   <items><item type="project"><name>...</name>...</item></items>
 */
@Injectable()
export default class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: MongoRepository<ProjectEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepo: MongoRepository<TaskEntity>,
  ) {}

  /* ── public entry point ───────────────────────────────────── */

  async importFile(
    buffer: Buffer,
    mimeType: string,
    ownerEmail: string,
  ): Promise<{ projects: number; tasks: number }> {
    const text = buffer.toString('utf-8').trim();
    if (!text) throw new BadRequestException('Empty file');

    let rows: ImportRow[];

    if (
      mimeType === 'text/csv' ||
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'text/plain'
    ) {
      rows = this.parseCsv(text);
    } else if (
      mimeType === 'application/x-yaml' ||
      mimeType === 'text/yaml' ||
      mimeType === 'application/yaml'
    ) {
      rows = this.parseYaml(text);
    } else if (mimeType === 'application/xml' || mimeType === 'text/xml') {
      rows = this.parseXml(text);
    } else {
      throw new BadRequestException(
        `Unsupported file type: ${mimeType}. Accepted: csv, yml, xml`,
      );
    }

    return this.persist(rows, ownerEmail);
  }

  /* ── CSV parser (no external deps) ────────────────────────── */

  private parseCsv(text: string): ImportRow[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2)
      throw new BadRequestException(
        'CSV must have a header and at least one row',
      );

    const header = lines[0]!.split(',').map((h) => h.trim().toLowerCase());
    const rows: ImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = this.splitCsvLine(lines[i]!);
      const obj: Record<string, string> = {};
      header.forEach((h, idx) => {
        obj[h] = (cols[idx] || '').trim();
      });
      rows.push(this.mapRow(obj));
    }
    return rows;
  }

  /** Handles quoted values with commas inside */
  private splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  /* ── YAML parser (minimal, no deps) ──────────────────────── */

  private parseYaml(text: string): ImportRow[] {
    // Minimal YAML list-of-maps parser.
    // For production, consider js-yaml, but we avoid extra deps here.
    const items: ImportRow[] = [];
    let current: Record<string, string> = {};

    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trimEnd();
      if (/^\s*-\s/.test(line)) {
        if (Object.keys(current).length) items.push(this.mapRow(current));
        current = {};
        const kv = line.replace(/^\s*-\s*/, '');
        this.parseYamlKv(kv, current);
      } else if (/^\s+\w/.test(line)) {
        this.parseYamlKv(line.trim(), current);
      }
    }
    if (Object.keys(current).length) items.push(this.mapRow(current));
    return items;
  }

  private parseYamlKv(segment: string, out: Record<string, string>): void {
    const idx = segment.indexOf(':');
    if (idx < 1) return;
    const key = segment.slice(0, idx).trim().toLowerCase();
    const val = segment
      .slice(idx + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    out[key] = val;
  }

  /* ── XML parser (minimal, no deps) ───────────────────────── */

  private parseXml(text: string): ImportRow[] {
    // Minimal parser: extract <item> children of <items>
    const items: ImportRow[] = [];
    const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
    let m: RegExpExecArray | null;

    while ((m = itemRe.exec(text)) !== null) {
      const inner = m[1]!;
      const obj: Record<string, string> = {};

      // read type attribute if present
      const typeAttr = /<item\b[^>]*type=["']([^"']+)["']/.exec(m[0]);
      if (typeAttr) obj['type'] = typeAttr[1]!;

      // read child elements
      const tagRe = /<(\w+)>([\s\S]*?)<\/\1>/g;
      let t: RegExpExecArray | null;
      while ((t = tagRe.exec(inner)) !== null) {
        obj[t[1]!.toLowerCase()] = t[2]!.trim();
      }
      items.push(this.mapRow(obj));
    }
    return items;
  }

  /* ── helpers ──────────────────────────────────────────────── */

  private mapRow(obj: Record<string, string>): ImportRow {
    const type =
      (obj['type'] || 'task').toLowerCase() === 'project' ? 'project' : 'task';
    return {
      type,
      name: obj['name'] || obj['title'] || 'Untitled',
      description: obj['description'] || obj['desc'] || '',
      status: obj['status'] || (type === 'project' ? 'planned' : 'todo'),
      priority: parseInt(obj['priority'] || '3', 10) || 3,
      dueAt: obj['dueat'] || obj['due_at'] || obj['due'] || '',
      tags: (obj['tags'] || '')
        .split(/[;|,]/)
        .map((t) => t.trim())
        .filter(Boolean),
      projectId: obj['projectid'] || obj['project_id'] || '',
    };
  }

  private async persist(
    rows: ImportRow[],
    ownerEmail: string,
  ): Promise<{ projects: number; tasks: number }> {
    let projects = 0;
    let tasks = 0;
    const now = new Date().toISOString();

    for (const r of rows) {
      if (r.type === 'project') {
        await this.projectRepo.save({
          name: r.name,
          code: r.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .slice(0, 20),
          description: r.description,
          status: r.status,
          ownerEmail,
          dueAt: r.dueAt,
          tags: r.tags,
          createdAt: now,
          updatedAt: now,
        } as any);
        projects++;
      } else {
        await this.taskRepo.save({
          title: r.name,
          description: r.description,
          status: r.status,
          priority: r.priority,
          assigneeEmail: ownerEmail,
          dueAt: r.dueAt,
          tags: r.tags,
          projectId: r.projectId || undefined,
          createdAt: now,
          updatedAt: now,
        } as any);
        tasks++;
      }
    }

    this.logger.log(
      `Import complete: ${projects} projects, ${tasks} tasks (by ${ownerEmail})`,
    );
    return { projects, tasks };
  }
}

interface ImportRow {
  type: 'project' | 'task';
  name: string;
  description: string;
  status: string;
  priority: number;
  dueAt: string;
  tags: string[];
  projectId: string;
}
