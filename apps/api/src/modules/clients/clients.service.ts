import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import ClientEntity from '../../entities/ClientEntity';
import { ObjectId } from 'mongodb';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CLIENT_TYPE_RE = /^(pessoa|empresa)$/;
const CNPJ_RE = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const CEP_RE = /^\d{5}-\d{3}$/;

type NormalizedClientType = 'pessoa' | 'empresa';

const normalizeClientType = (value: unknown): NormalizedClientType => {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (CLIENT_TYPE_RE.test(raw)) {
    return raw as NormalizedClientType;
  }
  return 'pessoa';
};

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized ? normalized : undefined;
};

const normalizeEmail = (value: unknown): string | undefined => {
  const email = normalizeOptionalString(value);
  if (!email) return undefined;
  return EMAIL_RE.test(email) ? email : undefined;
};

const formatCnpj = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 14) return undefined;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5',
  );
};

const formatCep = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 8) return undefined;
  return digits.replace(/^(\d{5})(\d{3})$/, '$1-$2');
};

/**
 * Service responsible for managing client entities.
 * Provides CRUD operations for clients stored in MongoDB.
 *
 * @example
 * ```typescript
 * const clients = await clientsService.findAll();
 * const newClient = await clientsService.create({ name: 'Acme Corp' });
 * ```
 */
@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly repo: MongoRepository<ClientEntity>,
  ) {}

  /**
   * Retrieves all clients, optionally filtered by name.
   * @param q - Optional search query for filtering by name (case-insensitive)
   * @returns Array of matching client entities
   */
  async findAll(q?: string): Promise<ClientEntity[]> {
    if (q) {
      return this.repo.find({
        where: {
          name: { $regex: new RegExp(q, 'i') },
        } as any,
      });
    }
    return this.repo.find();
  }

  async findOneById(id: string): Promise<ClientEntity> {
    const safeId = typeof id === 'string' ? id.trim() : '';
    if (!safeId) throw new BadRequestException('Invalid id');

    let item = (await this.repo.findOne({
      where: { id: safeId } as any,
    })) as ClientEntity | null;

    if (!item && ObjectId.isValid(safeId)) {
      item = (await this.repo.findOne({
        where: { _id: new ObjectId(safeId) } as any,
      })) as ClientEntity | null;
    }

    if (!item) throw new NotFoundException('Not found');
    return item;
  }

  async create(dto: any): Promise<ClientEntity> {
    const name = typeof dto?.name === 'string' ? dto.name.trim() : '';
    if (!name) throw new BadRequestException('Invalid name');

    const type = normalizeClientType(dto?.type);
    const cnpj = formatCnpj(dto?.cnpj);
    const cep = formatCep(dto?.cep);
    const normalizedEmail = normalizeEmail(dto?.email);
    const rawEmail = normalizeOptionalString(dto?.email);

    if (rawEmail && !normalizedEmail) {
      throw new BadRequestException('Invalid email');
    }

    if (type === 'empresa') {
      if (!cnpj || !CNPJ_RE.test(cnpj)) {
        throw new BadRequestException(
          'CNPJ is required for clients of type empresa',
        );
      }
      if (!cep || !CEP_RE.test(cep)) {
        throw new BadRequestException(
          'CEP is required for clients of type empresa',
        );
      }
    }

    const now = new Date().toISOString();
    const id = new ObjectId().toHexString();

    return this.repo.save({
      id,
      name,
      type,
      company:
        typeof dto?.company === 'string' && dto.company.trim()
          ? dto.company.trim()
          : undefined,
      email: normalizedEmail,
      phone:
        typeof dto?.phone === 'string' && dto.phone.trim()
          ? dto.phone.trim()
          : undefined,
      cellPhone:
        typeof dto?.cellPhone === 'string' && dto.cellPhone.trim()
          ? dto.cellPhone.trim()
          : undefined,
      whatsappNumber:
        typeof dto?.whatsappNumber === 'string' && dto.whatsappNumber.trim()
          ? dto.whatsappNumber.trim()
          : undefined,
      hasWhatsapp:
        typeof dto?.hasWhatsapp === 'boolean' ? dto.hasWhatsapp : undefined,
      preferredContact:
        typeof dto?.preferredContact === 'string'
          ? dto.preferredContact
          : undefined,
      whatsappAnalytics:
        typeof dto?.whatsappAnalytics === 'object'
          ? dto.whatsappAnalytics
          : undefined,
      emailAnalytics:
        typeof dto?.emailAnalytics === 'object'
          ? dto.emailAnalytics
          : undefined,
      notes:
        typeof dto?.notes === 'string' && dto.notes.trim()
          ? dto.notes.trim()
          : undefined,
      cnpj,
      cep,
      createdAt: now,
      updatedAt: now,
    } as any);
  }

  async update(id: string, dto: any): Promise<ClientEntity> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id');

    const cur = await this.repo.findOne({ where: { _id: oid } as any });
    if (!cur) throw new NotFoundException('Not found');

    const patch: any = {
      updatedAt: new Date().toISOString(),
    };
    let nextType: NormalizedClientType = normalizeClientType(cur?.type);
    let nextCnpj = formatCnpj(cur?.cnpj) ?? undefined;
    let nextCep = formatCep(cur?.cep) ?? undefined;

    if (typeof dto?.name === 'string' && dto.name.trim()) {
      patch.name = dto.name.trim();
    }
    if ('type' in (dto || {})) {
      nextType = normalizeClientType(dto?.type);
      patch.type = nextType;
    }
    if ('company' in (dto || {})) {
      patch.company =
        typeof dto?.company === 'string' && dto.company.trim()
          ? dto.company.trim()
          : undefined;
    }
    if ('email' in (dto || {})) {
      const maybeEmail = normalizeOptionalString(dto?.email);
      if (maybeEmail && !normalizeEmail(dto?.email)) {
        throw new BadRequestException('Invalid email');
      }
      patch.email = normalizeEmail(dto?.email);
    }
    if ('phone' in (dto || {})) {
      patch.phone =
        typeof dto?.phone === 'string' && dto.phone.trim()
          ? dto.phone.trim()
          : undefined;
    }
    if ('cellPhone' in (dto || {})) {
      patch.cellPhone =
        typeof dto?.cellPhone === 'string' && dto.cellPhone.trim()
          ? dto.cellPhone.trim()
          : undefined;
    }
    if ('whatsappNumber' in (dto || {})) {
      patch.whatsappNumber =
        typeof dto?.whatsappNumber === 'string' && dto.whatsappNumber.trim()
          ? dto.whatsappNumber.trim()
          : undefined;
    }
    if ('hasWhatsapp' in (dto || {})) {
      patch.hasWhatsapp =
        typeof dto?.hasWhatsapp === 'boolean' ? dto.hasWhatsapp : undefined;
    }
    if ('preferredContact' in (dto || {})) {
      patch.preferredContact =
        typeof dto?.preferredContact === 'string'
          ? dto.preferredContact
          : undefined;
    }
    if ('whatsappAnalytics' in (dto || {})) {
      patch.whatsappAnalytics =
        typeof dto?.whatsappAnalytics === 'object'
          ? dto.whatsappAnalytics
          : undefined;
    }
    if ('emailAnalytics' in (dto || {})) {
      patch.emailAnalytics =
        typeof dto?.emailAnalytics === 'object'
          ? dto.emailAnalytics
          : undefined;
    }
    if ('notes' in (dto || {})) {
      patch.notes =
        typeof dto?.notes === 'string' && dto.notes.trim()
          ? dto.notes.trim()
          : undefined;
    }
    if ('cnpj' in (dto || {})) {
      const normalizedCnpj = formatCnpj(dto?.cnpj);
      const rawCnpj = normalizeOptionalString(dto?.cnpj);
      if (rawCnpj && (!normalizedCnpj || !CNPJ_RE.test(normalizedCnpj))) {
        throw new BadRequestException('Invalid CNPJ');
      }
      nextCnpj = normalizedCnpj;
      patch.cnpj = normalizedCnpj;
    }
    if ('cep' in (dto || {})) {
      const normalizedCep = formatCep(dto?.cep);
      const rawCep = normalizeOptionalString(dto?.cep);
      if (rawCep && (!normalizedCep || !CEP_RE.test(normalizedCep))) {
        throw new BadRequestException('Invalid CEP');
      }
      nextCep = normalizedCep;
      patch.cep = normalizedCep;
    }

    if (nextType === 'empresa') {
      if (!nextCnpj || !CNPJ_RE.test(nextCnpj)) {
        throw new BadRequestException(
          'CNPJ is required for clients of type empresa',
        );
      }
      if (!nextCep || !CEP_RE.test(nextCep)) {
        throw new BadRequestException(
          'CEP is required for clients of type empresa',
        );
      }
    }

    await this.repo.update(oid as any, patch);
    return (await this.repo.findOne({ where: { _id: oid } as any })) as any;
  }

  async remove(id: string): Promise<void> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id');
    await this.repo.delete(oid as any);
  }
}
