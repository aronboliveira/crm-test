import type { IntegrationConfig } from '../../types';
import SafeJsonUtil from '../../../../common/json/safe-json.util';

export const MAIL_DATASET_TYPES = Object.freeze({
  unreadEmails: 'unread_emails',
  upcomingCalls: 'upcoming_calls',
  upcomingEvents: 'upcoming_events',
  tasks: 'tasks',
});

export const MAIL_DEFAULTS = Object.freeze({
  smtpPort: 587,
  smtpSecure: false,
  zimbraSyncWindowMinutes: 60,
  outlookSyncWindowMinutes: 60,
});

export interface MailSmtpProfile {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from?: string;
  profile: 'zimbra' | 'outlook' | 'default';
}

export class IntegrationValueSanitizer {
  static normalizeString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  static normalizeUrl(value: unknown): string | undefined {
    const normalized = this.normalizeString(value);
    if (!normalized) {
      return undefined;
    }
    try {
      const url = new URL(normalized);
      return url.toString().replace(/\/$/, '');
    } catch {
      return normalized;
    }
  }

  static normalizePort(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.floor(parsed);
      }
    }
    return undefined;
  }

  static normalizeBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
    return undefined;
  }

  static hasString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }
}

export class SafeJsonCodec {
  static parseObject(
    input: unknown,
    fallback: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const parsed = SafeJsonUtil.parseObject(input);
    return parsed ?? fallback;
  }

  static stringify(input: unknown, fallback = '{}'): string {
    return SafeJsonUtil.stringify(input, fallback);
  }
}

export class MailSmtpProfileFactory {
  static fromConfig(
    config: Partial<IntegrationConfig>,
    options: {
      fallbackHost?: string;
      fallbackPort?: number;
      fallbackSecure?: boolean;
      profile: 'zimbra' | 'outlook';
    },
  ): MailSmtpProfile | null {
    const host =
      IntegrationValueSanitizer.normalizeString(config.smtpHost) ??
      IntegrationValueSanitizer.normalizeString(options.fallbackHost);
    if (!host) {
      return null;
    }

    const port =
      IntegrationValueSanitizer.normalizePort(config.smtpPort) ??
      options.fallbackPort ??
      MAIL_DEFAULTS.smtpPort;
    const secure =
      IntegrationValueSanitizer.normalizeBoolean(config.smtpSecure) ??
      options.fallbackSecure ??
      MAIL_DEFAULTS.smtpSecure;

    return {
      host,
      port,
      secure,
      user: IntegrationValueSanitizer.normalizeString(config.smtpUser),
      pass: IntegrationValueSanitizer.normalizeString(config.smtpPass),
      from: IntegrationValueSanitizer.normalizeString(config.smtpFrom),
      profile: config.smtpProfile === 'default' ? 'default' : options.profile,
    };
  }
}
