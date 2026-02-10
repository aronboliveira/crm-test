import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import ClientEntity from '../../entities/ClientEntity';
import MessageEventEntity, {
  type MessageChannel,
  type MessageEventType,
} from '../../entities/MessageEventEntity';

const VALID_CHANNELS: MessageChannel[] = ['whatsapp', 'email'];

const VALID_EVENT_TYPES: Record<MessageChannel, MessageEventType[]> = {
  whatsapp: ['sent', 'delivered', 'read', 'replied'],
  email: ['sent', 'opened', 'clicked', 'replied'],
};

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(MessageEventEntity)
    private readonly repo: MongoRepository<MessageEventEntity>,
    @InjectRepository(ClientEntity)
    private readonly clientsRepo: MongoRepository<ClientEntity>,
  ) {}

  async createEvent(dto: any) {
    const clientId =
      typeof dto?.clientId === 'string' ? dto.clientId.trim() : '';
    if (!clientId) throw new BadRequestException('Invalid clientId');

    const channel = (dto?.channel || '').toString() as MessageChannel;
    if (!VALID_CHANNELS.includes(channel)) {
      throw new BadRequestException('Invalid channel');
    }

    const eventType = (dto?.eventType || '').toString() as MessageEventType;
    if (!VALID_EVENT_TYPES[channel].includes(eventType)) {
      throw new BadRequestException('Invalid eventType');
    }

    const now = new Date().toISOString();
    const id = new ObjectId().toHexString();

    const event = await this.repo.save({
      id,
      clientId,
      channel,
      eventType,
      direction:
        dto?.direction === 'inbound' || dto?.direction === 'outbound'
          ? dto.direction
          : undefined,
      meta: typeof dto?.meta === 'object' ? dto.meta : undefined,
      createdAt: now,
    } as any);

    const client = await this.clientsRepo.findOne({
      where: { id: clientId } as any,
    });
    if (!client) throw new NotFoundException('Client not found');

    const patch: Partial<ClientEntity> = {
      updatedAt: now,
    };

    if (channel === 'whatsapp') {
      const cur = client.whatsappAnalytics || {};
      patch.whatsappAnalytics = {
        sent: cur.sent ?? 0,
        delivered: cur.delivered ?? 0,
        read: cur.read ?? 0,
        replied: cur.replied ?? 0,
        lastMessageAt: now,
      };

      if (eventType === 'sent') patch.whatsappAnalytics.sent! += 1;
      if (eventType === 'delivered') patch.whatsappAnalytics.delivered! += 1;
      if (eventType === 'read') patch.whatsappAnalytics.read! += 1;
      if (eventType === 'replied') patch.whatsappAnalytics.replied! += 1;
    }

    if (channel === 'email') {
      const cur = client.emailAnalytics || {};
      patch.emailAnalytics = {
        sent: cur.sent ?? 0,
        opened: cur.opened ?? 0,
        clicked: cur.clicked ?? 0,
        replied: cur.replied ?? 0,
        lastEmailAt: now,
      };

      if (eventType === 'sent') patch.emailAnalytics.sent! += 1;
      if (eventType === 'opened') patch.emailAnalytics.opened! += 1;
      if (eventType === 'clicked') patch.emailAnalytics.clicked! += 1;
      if (eventType === 'replied') patch.emailAnalytics.replied! += 1;
    }

    await this.clientsRepo.update(client._id as any, patch as any);

    return { id: event.id };
  }

  async getClientAnalytics(clientId: string) {
    const client = await this.clientsRepo.findOne({
      where: { id: clientId } as any,
    });
    if (!client) throw new NotFoundException('Client not found');

    return {
      clientId,
      whatsappAnalytics: client.whatsappAnalytics || {
        sent: 0,
        delivered: 0,
        read: 0,
        replied: 0,
        lastMessageAt: undefined,
      },
      emailAnalytics: client.emailAnalytics || {
        sent: 0,
        opened: 0,
        clicked: 0,
        replied: 0,
        lastEmailAt: undefined,
      },
    };
  }
}
