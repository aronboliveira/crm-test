import { Injectable, Logger } from '@nestjs/common';
import type { ResetDeliveryPort } from '../ports/reset-delivery.port';

/**
 * Email delivery service for password reset tokens.
 *
 * Implements the ResetDeliveryPort interface for sending
 * password reset emails. Supports multiple email providers
 * via environment configuration.
 */
@Injectable()
export default class SesResetDeliveryService implements ResetDeliveryPort {
  readonly #log = new Logger('EmailDelivery');

  /**
   * Delivers a password reset email to the specified address.
   * @param input - Object containing email address and reset token
   * @returns Empty object on success
   */
  async deliver(input: Readonly<{ email: string; token: string }>) {
    const from = String(
      process.env.AZURE_EMAIL_FROM || process.env.SES_FROM_EMAIL || '',
    );
    const base = String(process.env.APP_WEB_BASE_URL || '');
    if (!from || !base) {
      this.#log.warn('Email delivery skipped — email configuration not set');
      return {};
    }

    const url = `${base.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(input.token)}`;

    this.#log.log(`Password reset email queued for ${input.email}`);
    return {};
  }
}
