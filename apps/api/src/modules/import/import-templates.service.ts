import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { MongoRepository } from 'typeorm';
import ImportTemplateEntity, {
  type ImportTemplateKind,
  type ImportTemplateVersionSnapshot,
} from '../../entities/ImportTemplateEntity';
import ImportTemplateProfilesCatalog, {
  type ImportSourceProfile,
} from './import-template-profiles.catalog';

type CreateImportTemplateDto = Readonly<{
  kind: ImportTemplateKind;
  name: string;
  description?: string;
  profileKey?: string;
  columnMapping: Readonly<Record<string, string>>;
  defaultValues?: Readonly<Record<string, string>>;
  changeNote?: string;
}>;

type UpdateImportTemplateDto = Readonly<{
  name?: string;
  description?: string;
  profileKey?: string;
  columnMapping?: Readonly<Record<string, string>>;
  defaultValues?: Readonly<Record<string, string>>;
  bumpVersion?: boolean;
  changeNote?: string;
}>;

type PreviewApplyDto = Readonly<{
  targetVersion?: number;
  currentColumnMapping?: Readonly<Record<string, string>>;
  currentDefaultValues?: Readonly<Record<string, string>>;
}>;

type DiffEntry = Readonly<{
  key: string;
  from?: string;
  to?: string;
}>;

type DiffResult = Readonly<{
  added: readonly DiffEntry[];
  removed: readonly DiffEntry[];
  changed: readonly DiffEntry[];
}>;

const VALID_KINDS = new Set<ImportTemplateKind>(['clients', 'projects', 'users']);

const normalizeText = (value: unknown): string =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

const normalizeName = (name: string): string =>
  normalizeText(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const normalizeRecord = (
  raw: Readonly<Record<string, string>> | undefined,
): Record<string, string> => {
  return Object.entries(raw ?? {}).reduce<Record<string, string>>(
    (record, [rawKey, rawValue]) => {
      const key = normalizeText(rawKey);
      const value = normalizeText(String(rawValue ?? ''));
      if (!key || !value) return record;
      record[key] = value;
      return record;
    },
    {},
  );
};

const recordsEqual = (
  left: Readonly<Record<string, string>>,
  right: Readonly<Record<string, string>>,
): boolean => {
  const leftEntries = Object.entries(left).sort(([a], [b]) => a.localeCompare(b));
  const rightEntries = Object.entries(right).sort(([a], [b]) => a.localeCompare(b));
  if (leftEntries.length !== rightEntries.length) return false;
  return leftEntries.every(([key, value], index) => {
    const rightEntry = rightEntries[index];
    return rightEntry?.[0] === key && rightEntry?.[1] === value;
  });
};

@Injectable()
export default class ImportTemplatesService {
  private readonly logger = new Logger(ImportTemplatesService.name);

  constructor(
    @InjectRepository(ImportTemplateEntity)
    private readonly repo: MongoRepository<ImportTemplateEntity>,
  ) {}

  async list(kind?: ImportTemplateKind): Promise<ImportTemplateEntity[]> {
    const where = kind ? ({ kind } as Partial<ImportTemplateEntity>) : undefined;
    return this.repo.find({
      where: where as any,
      order: { updatedAt: 'DESC' } as any,
    });
  }

  async findById(id: string): Promise<ImportTemplateEntity> {
    const oid = this.toObjectId(id);
    const row = await this.repo.findOne({ where: { _id: oid } as any });
    if (!row) throw new NotFoundException('Template de importação não encontrado.');
    return row;
  }

  async create(
    dto: CreateImportTemplateDto,
    actorEmail: string,
  ): Promise<ImportTemplateEntity> {
    this.ensureKind(dto.kind);
    const name = normalizeText(dto.name);
    if (!name) throw new BadRequestException('Nome do template é obrigatório.');

    const nameNormalized = normalizeName(name);
    const duplicate = await this.repo.findOne({
      where: {
        kind: dto.kind,
        nameNormalized,
      } as any,
    });
    if (duplicate) {
      throw new BadRequestException('Já existe template com este nome.');
    }

    const columnMapping = normalizeRecord(dto.columnMapping);
    if (Object.keys(columnMapping).length === 0) {
      throw new BadRequestException(
        'Template deve conter ao menos um mapeamento de coluna.',
      );
    }

    const defaultValues = normalizeRecord(dto.defaultValues);
    const nowIso = new Date().toISOString();
    const safeActor = normalizeText(actorEmail) || 'unknown';
    const firstVersion: ImportTemplateVersionSnapshot = {
      version: 1,
      createdAt: nowIso,
      createdByEmail: safeActor,
      changeNote: normalizeText(dto.changeNote) || 'Versão inicial',
      profileKey: normalizeText(dto.profileKey) || undefined,
      columnMapping,
      defaultValues,
    };

    const entity = this.repo.create({
      kind: dto.kind,
      name,
      nameNormalized,
      description: normalizeText(dto.description) || undefined,
      profileKey: normalizeText(dto.profileKey) || undefined,
      latestVersion: 1,
      usageCount: 0,
      columnMapping,
      defaultValues,
      versions: [firstVersion],
      createdByEmail: safeActor,
      updatedByEmail: safeActor,
      createdAt: nowIso,
      updatedAt: nowIso,
    } as any);

    const saved = await this.repo.save(entity);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async update(
    id: string,
    dto: UpdateImportTemplateDto,
    actorEmail: string,
  ): Promise<ImportTemplateEntity> {
    const row = await this.findById(id);
    const nowIso = new Date().toISOString();
    const safeActor = normalizeText(actorEmail) || 'unknown';

    const nextName = dto.name !== undefined ? normalizeText(dto.name) : row.name;
    if (!nextName) throw new BadRequestException('Nome do template inválido.');
    const nextNameNormalized = normalizeName(nextName);

    if (nextNameNormalized !== row.nameNormalized) {
      const duplicate = await this.repo.findOne({
        where: {
          _id: { $ne: row._id },
          kind: row.kind,
          nameNormalized: nextNameNormalized,
        } as any,
      });
      if (duplicate) {
        throw new BadRequestException('Já existe template com este nome.');
      }
    }

    const nextColumnMapping =
      dto.columnMapping !== undefined
        ? normalizeRecord(dto.columnMapping)
        : normalizeRecord(row.columnMapping);
    if (Object.keys(nextColumnMapping).length === 0) {
      throw new BadRequestException(
        'Template deve conter ao menos um mapeamento de coluna.',
      );
    }
    const nextDefaultValues =
      dto.defaultValues !== undefined
        ? normalizeRecord(dto.defaultValues)
        : normalizeRecord(row.defaultValues);
    const nextDescription =
      dto.description !== undefined
        ? normalizeText(dto.description) || undefined
        : row.description;
    const nextProfileKey =
      dto.profileKey !== undefined
        ? normalizeText(dto.profileKey) || undefined
        : row.profileKey;

    const mappingChanged = !recordsEqual(nextColumnMapping, row.columnMapping);
    const defaultsChanged = !recordsEqual(nextDefaultValues, row.defaultValues);
    const profileChanged = (nextProfileKey ?? '') !== (row.profileKey ?? '');
    const shouldBumpVersion =
      dto.bumpVersion !== false && (mappingChanged || defaultsChanged || profileChanged);

    row.name = nextName;
    row.nameNormalized = nextNameNormalized;
    row.description = nextDescription;
    row.profileKey = nextProfileKey;
    row.columnMapping = nextColumnMapping;
    row.defaultValues = nextDefaultValues;
    row.updatedAt = nowIso;
    row.updatedByEmail = safeActor;

    if (shouldBumpVersion) {
      const nextVersion = row.latestVersion + 1;
      row.latestVersion = nextVersion;
      row.versions = [
        ...(row.versions ?? []),
        {
          version: nextVersion,
          createdAt: nowIso,
          createdByEmail: safeActor,
          changeNote: normalizeText(dto.changeNote) || 'Atualização manual',
          profileKey: row.profileKey,
          columnMapping: nextColumnMapping,
          defaultValues: nextDefaultValues,
        },
      ];
    }

    return this.repo.save(row);
  }

  async remove(id: string): Promise<void> {
    const oid = this.toObjectId(id);
    await this.repo.delete(oid as any);
  }

  async markAsUsed(id: string): Promise<ImportTemplateEntity> {
    const row = await this.findById(id);
    row.usageCount = (row.usageCount ?? 0) + 1;
    row.updatedAt = new Date().toISOString();
    return this.repo.save(row);
  }

  async previewApply(id: string, dto: PreviewApplyDto) {
    const row = await this.findById(id);
    const targetVersion = dto.targetVersion ?? row.latestVersion;
    const targetSnapshot = this.pickVersionSnapshot(row, targetVersion);
    const currentColumnMapping = normalizeRecord(dto.currentColumnMapping);
    const currentDefaultValues = normalizeRecord(dto.currentDefaultValues);
    const mappingDiff = this.diffRecords(
      currentColumnMapping,
      targetSnapshot.columnMapping,
    );
    const defaultsDiff = this.diffRecords(
      currentDefaultValues,
      targetSnapshot.defaultValues,
    );

    const summary = {
      mappingChanged:
        mappingDiff.added.length +
          mappingDiff.removed.length +
          mappingDiff.changed.length >
        0,
      defaultsChanged:
        defaultsDiff.added.length +
          defaultsDiff.removed.length +
          defaultsDiff.changed.length >
        0,
      mappingDeltaCount:
        mappingDiff.added.length +
        mappingDiff.removed.length +
        mappingDiff.changed.length,
      defaultsDeltaCount:
        defaultsDiff.added.length +
        defaultsDiff.removed.length +
        defaultsDiff.changed.length,
    };

    return {
      templateId: String(row._id),
      templateName: row.name,
      targetVersion: targetSnapshot.version,
      targetProfileKey: targetSnapshot.profileKey,
      targetColumnMapping: targetSnapshot.columnMapping,
      targetDefaultValues: targetSnapshot.defaultValues,
      diff: {
        mapping: mappingDiff,
        defaults: defaultsDiff,
        summary,
      },
    };
  }

  listProfiles(kind?: ImportTemplateKind): ImportSourceProfile[] {
    if (kind) this.ensureKind(kind);
    return ImportTemplateProfilesCatalog.list(kind);
  }

  private ensureKind(kind: string): asserts kind is ImportTemplateKind {
    if (!VALID_KINDS.has(kind as ImportTemplateKind)) {
      throw new BadRequestException('Kind inválido. Use clients, projects ou users.');
    }
  }

  private toObjectId(id: string): ObjectId {
    if (!ObjectId.isValid(id)) throw new BadRequestException('ID inválido.');
    return new ObjectId(id);
  }

  private pickVersionSnapshot(
    row: ImportTemplateEntity,
    targetVersion: number,
  ): ImportTemplateVersionSnapshot {
    const version = Number.isFinite(targetVersion)
      ? Math.floor(targetVersion)
      : row.latestVersion;
    const snapshot = (row.versions ?? []).find((entry) => entry.version === version);
    if (!snapshot) {
      this.logger.warn(
        `Template ${String(row._id)} does not contain version ${String(targetVersion)}`,
      );
      throw new BadRequestException('Versão solicitada não existe.');
    }
    return snapshot;
  }

  private diffRecords(
    currentRecord: Readonly<Record<string, string>>,
    targetRecord: Readonly<Record<string, string>>,
  ): DiffResult {
    const added: DiffEntry[] = [];
    const removed: DiffEntry[] = [];
    const changed: DiffEntry[] = [];

    const currentKeys = new Set(Object.keys(currentRecord));
    const targetKeys = new Set(Object.keys(targetRecord));

    targetKeys.forEach((key) => {
      if (!currentKeys.has(key)) {
        added.push({ key, to: targetRecord[key] });
        return;
      }
      const from = currentRecord[key] ?? '';
      const to = targetRecord[key] ?? '';
      if (from !== to) {
        changed.push({ key, from, to });
      }
    });

    currentKeys.forEach((key) => {
      if (!targetKeys.has(key)) {
        removed.push({ key, from: currentRecord[key] });
      }
    });

    return { added, removed, changed };
  }
}

export type {
  CreateImportTemplateDto,
  PreviewApplyDto,
  UpdateImportTemplateDto,
};
