import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { nanoid } from 'nanoid';

import MailOutboxEntity from '../../entities/MailOutboxEntity';
import type { EmailDeliveryResult, EmailMessage } from './types/email.types';
import type { EmailGateway } from './email-delivery.service';

@Injectable()
export default class MockEmailGateway implements EmailGateway {
  private readonly logger = new Logger(MockEmailGateway.name);

  constructor(
    @InjectRepository(MailOutboxEntity)
    private readonly repo: MongoRepository<MailOutboxEntity>,
  ) {
    try {
      if (!repo) {
        this.logger.error('Repository not injected');
        throw new Error('Repository initialization failed');
      }
      this.logger.log('MockEmailGateway initialized');
    } catch (error) {
      this.logger.error('MockEmailGateway constructor error:', error);
      throw error;
    }
  }

  async send(msg: EmailMessage): Promise<EmailDeliveryResult> {
    try {
      const to = String(msg.to || '')
        .trim()
        .toLowerCase();
      if (!to) {
        this.logger.warn('Cannot send email - invalid recipient');
        return { ok: false, deliveryId: null };
      }

      const createdAt = new Date().toISOString();
      const id = nanoid(14);

      try {
        await this.repo.save({
          to,
          kind: msg.kind,
          createdAt,
          subject: String(msg.subject || ''),
          text: msg.text,
          html: msg.html,
          meta: { ...(msg.meta || {}), mockDeliveryId: id },
        } as any);

        this.logger.log(`Mock email saved to outbox for ${to} (ID: ${id})`);
        return { ok: true, deliveryId: id };
      } catch (saveError) {
        this.logger.error('Error saving email to outbox:', saveError);
        return { ok: false, deliveryId: null };
      }
    } catch (error) {
      this.logger.error('Error in send method:', error);
      return { ok: false, deliveryId: null };
    }
  }
}
