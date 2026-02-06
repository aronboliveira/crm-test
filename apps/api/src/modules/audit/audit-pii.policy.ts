import { createHash } from 'crypto';

export type AuditPiiMode = 'full' | 'masked';

export default class AuditPiiPolicy {
  static mode(): AuditPiiMode {
    const env = String(process.env.AUDIT_PII_MODE || '')
      .trim()
      .toLowerCase();
    const node = String(process.env.NODE_ENV || '')
      .trim()
      .toLowerCase();
    if (env === 'full' || env === 'masked') return env;

    return node === 'production' ? 'masked' : 'full';
  }

  static hashEmail(email: string): string {
    const e = (email || '').trim().toLowerCase();
    return createHash('sha256').update(e).digest('hex');
  }

  static maskEmail(email: string): string {
    const e = (email || '').trim().toLowerCase();
    const at = e.indexOf('@');
    if (at <= 0) return e ? '***' : '';

    const local = e.slice(0, at);
    const domain = e.slice(at + 1);

    const head = local.slice(0, 1);
    const tail = local.length > 2 ? local.slice(-1) : '';
    const mid = local.length > 2 ? '***' : '**';

    return `${head}${mid}${tail}@${domain}`;
  }
}
