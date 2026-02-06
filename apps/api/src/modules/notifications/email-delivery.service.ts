import { Inject, Injectable, Logger } from '@nestjs/common';
import type { EmailDeliveryResult, EmailMessage } from './types/email.types';

export const EMAIL_GATEWAY = 'EMAIL_GATEWAY';

export interface EmailGateway {
  send: (msg: EmailMessage) => Promise<EmailDeliveryResult>;
}

@Injectable()
export default class EmailDeliveryService {
  private readonly logger = new Logger(EmailDeliveryService.name);

  constructor(@Inject(EMAIL_GATEWAY) private readonly gw: EmailGateway) {
    try {
      if (!gw) {
        this.logger.error('Email gateway not injected');
        throw new Error('Email gateway initialization failed');
      }
      this.logger.log('EmailDeliveryService initialized');
    } catch (error) {
      this.logger.error('EmailDeliveryService constructor error:', error);
      throw error;
    }
  }

  async send(msg: EmailMessage): Promise<EmailDeliveryResult> {
    try {
      if (!msg || !msg.to) {
        this.logger.warn('Invalid email message - missing recipient');
        return { ok: false, deliveryId: null };
      }
      const result = await this.gw.send(msg);
      if (result.ok) {
        this.logger.log(`Email sent successfully to ${msg.to}`);
      } else {
        this.logger.warn(`Email delivery failed for ${msg.to}`);
      }
      return result;
    } catch (error) {
      this.logger.error('Error sending email:', error);
      return { ok: false, deliveryId: null };
    }
  }
}
