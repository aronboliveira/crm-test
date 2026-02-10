import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import ClientEntity from '../../entities/ClientEntity';
import { ObjectId } from 'mongodb';

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

    const now = new Date().toISOString();
    const id = new ObjectId().toHexString();

    return this.repo.save({
      id,
      name,
      company:
        typeof dto?.company === 'string' && dto.company.trim()
          ? dto.company.trim()
          : undefined,
      email:
        typeof dto?.email === 'string' && dto.email.trim()
          ? dto.email.trim()
          : undefined,
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

    if (typeof dto?.name === 'string' && dto.name.trim()) {
      patch.name = dto.name.trim();
    }
    if ('company' in (dto || {})) {
      patch.company =
        typeof dto?.company === 'string' && dto.company.trim()
          ? dto.company.trim()
          : undefined;
    }
    if ('email' in (dto || {})) {
      patch.email =
        typeof dto?.email === 'string' && dto.email.trim()
          ? dto.email.trim()
          : undefined;
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

    await this.repo.update(oid as any, patch);
    return (await this.repo.findOne({ where: { _id: oid } as any })) as any;
  }

  async remove(id: string): Promise<void> {
    const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
    if (!oid) throw new BadRequestException('Invalid id');
    await this.repo.delete(oid as any);
  }
}
