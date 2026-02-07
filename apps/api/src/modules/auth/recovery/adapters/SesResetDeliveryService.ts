import { Injectable, Logger } from '@nestjs/common';
import type { ResetDeliveryPort } from '../ports/reset-delivery.port';

/**
 * Stub delivery service — replaces the old AWS SES implementation.
 * TODO: Replace with Azure Communication Services Email when ready:
 *   npm i @azure/communication-email
 *   Use EmailClient from @azure/communication-email
 */
@Injectable()
export default class SesResetDeliveryService implements ResetDeliveryPort {
  readonly #log = new Logger('AzureEmailDelivery');

  async deliver(input: Readonly<{ email: string; token: string }>) {
    const from = String(
      process.env.AZURE_EMAIL_FROM || process.env.SES_FROM_EMAIL || '',
    );
    const base = String(process.env.APP_WEB_BASE_URL || '');
    if (!from || !base) {
      this.#log.warn(
        'Email delivery skipped — AZURE_EMAIL_FROM or APP_WEB_BASE_URL not set',
      );
      return {};
    }

    const url = `${base.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(input.token)}`;

    // TODO: Wire up Azure Communication Services Email
    // const { EmailClient } = await import('@azure/communication-email');
    // const client = new EmailClient(process.env.AZURE_COMM_CONNECTION_STRING!);
    // await client.beginSend({ ... });

    this.#log.log(
      `[STUB] Would send password-reset email to ${input.email} | link: ${url}`,
    );
    return {};
  }
}
