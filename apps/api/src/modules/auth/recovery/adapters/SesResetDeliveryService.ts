import { Injectable } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import type { ResetDeliveryPort } from '../ports/reset-delivery.port';

@Injectable()
export default class SesResetDeliveryService implements ResetDeliveryPort {
  #client: SESClient;

  constructor() {
    this.#client = new SESClient({
      region: String(process.env.AWS_REGION || 'us-east-1'),
    });
  }

  async deliver(input: Readonly<{ email: string; token: string }>) {
    const from = String(process.env.SES_FROM_EMAIL || '');
    const base = String(process.env.APP_WEB_BASE_URL || '');
    if (!from || !base) return {};

    const url = `${base.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(input.token)}`;

    const subject = 'Password reset';
    const text = `Use this link to reset your password:\n${url}\n\nIf you did not request it, ignore this email.`;
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
        <h2>Password reset</h2>
        <p>Use the link below to reset your password:</p>
        <p><a href="${url}">${url}</a></p>
        <p style="opacity:0.75">If you did not request it, you can ignore this email.</p>
      </div>
    `.trim();

    await this.#client.send(
      new SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: [input.email] },
        Message: {
          Subject: { Data: subject },
          Body: {
            Text: { Data: text },
            Html: { Data: html },
          },
        },
      }),
    );

    return {};
  }
}
