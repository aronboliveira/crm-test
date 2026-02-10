import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import type { EmailDeliveryResult, EmailMessage } from './types/email.types';
import type { EmailGateway } from './email-delivery.service';

export interface SmtpProfileConfig {
  name: string;
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from?: string;
}

@Injectable()
export default class SmtpEmailGateway implements EmailGateway {
  private readonly logger = new Logger(SmtpEmailGateway.name);
  private readonly profiles: Map<string, SmtpProfileConfig> = new Map();
  private readonly transporters: Map<string, Transporter> = new Map();
  private readonly defaultProfile: string | null = null;

  constructor() {
    const profiles = this.loadProfilesFromEnv();
    for (const profile of profiles) {
      this.profiles.set(profile.name, profile);
    }

    this.defaultProfile = process.env.DEFAULT_SMTP_PROFILE || null;

    if (this.profiles.size === 0) {
      this.logger.warn('No SMTP profiles configured');
    } else {
      this.logger.log(
        `SMTP profiles loaded: ${Array.from(this.profiles.keys()).join(', ')}`,
      );
    }
  }

  async send(msg: EmailMessage): Promise<EmailDeliveryResult> {
    const requestedProfile = msg.meta?.smtpProfile as string | undefined;
    const flowBoth =
      requestedProfile === 'both' || process.env.SMTP_FLOW_BOTH === '1';

    if (flowBoth) {
      const profiles = Array.from(this.profiles.values());
      if (profiles.length === 0) {
        this.logger.warn('No SMTP profiles configured for dual flow');
        return { ok: false, deliveryId: null };
      }

      const results = await Promise.all(
        profiles.map((profile) => this.sendViaProfile(profile, msg)),
      );
      const ok = results.every((result) => result.ok);
      const deliveryId = results
        .map((result) => result.deliveryId)
        .filter((id): id is string => Boolean(id))
        .join(',');

      if (!ok) {
        this.logger.warn(
          `SMTP dual flow had failures for ${msg.to} (profiles: ${profiles
            .map((p) => p.name)
            .join(', ')})`,
        );
      }

      return { ok, deliveryId: deliveryId || null };
    }

    const profileName = requestedProfile || this.defaultProfile;

    if (!profileName) {
      this.logger.warn('No SMTP profile selected for message');
      return { ok: false, deliveryId: null };
    }

    const profile = this.profiles.get(profileName);
    if (!profile) {
      this.logger.warn(`SMTP profile not found: ${profileName}`);
      return { ok: false, deliveryId: null };
    }

    return this.sendViaProfile(profile, msg);
  }

  private async sendViaProfile(
    profile: SmtpProfileConfig,
    msg: EmailMessage,
  ): Promise<EmailDeliveryResult> {
    if (!profile.host || !profile.port) {
      this.logger.warn(`SMTP profile incomplete: ${profile.name}`);
      return { ok: false, deliveryId: null };
    }

    try {
      const transporter = this.getTransporter(profile);
      const info = await transporter.sendMail({
        from: profile.from || profile.user,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      });

      this.logger.log(
        `SMTP email sent via ${profile.name} to ${msg.to} (id: ${info.messageId})`,
      );
      return { ok: true, deliveryId: info.messageId || null };
    } catch (error) {
      this.logger.error(`SMTP send failed (${profile.name}):`, error);
      return { ok: false, deliveryId: null };
    }
  }

  private getTransporter(profile: SmtpProfileConfig): Transporter {
    const cached = this.transporters.get(profile.name);
    if (cached) {
      return cached;
    }

    const transporter = nodemailer.createTransport({
      host: profile.host,
      port: profile.port,
      secure: profile.secure,
      auth: profile.user
        ? {
            user: profile.user,
            pass: profile.pass,
          }
        : undefined,
    });

    this.transporters.set(profile.name, transporter);
    return transporter;
  }

  private loadProfilesFromEnv(): SmtpProfileConfig[] {
    const profiles: SmtpProfileConfig[] = [];

    const zimbra = this.buildProfileFromEnv('ZIMBRA_SMTP', 'zimbra');
    if (zimbra) profiles.push(zimbra);

    const outlook = this.buildProfileFromEnv('OUTLOOK_SMTP', 'outlook');
    if (outlook) profiles.push(outlook);

    const generic = this.buildProfileFromEnv('SMTP', 'default');
    if (generic) profiles.push(generic);

    return profiles;
  }

  private buildProfileFromEnv(
    prefix: string,
    name: string,
  ): SmtpProfileConfig | null {
    const host = process.env[`${prefix}_HOST`];
    const portStr = process.env[`${prefix}_PORT`];

    if (!host || !portStr) {
      return null;
    }

    const secure = process.env[`${prefix}_SECURE`] === 'true';
    const port = parseInt(portStr, 10);

    return {
      name,
      host,
      port: Number.isNaN(port) ? 587 : port,
      secure,
      user: process.env[`${prefix}_USER`],
      pass: process.env[`${prefix}_PASS`],
      from: process.env[`${prefix}_FROM`],
    };
  }
}
