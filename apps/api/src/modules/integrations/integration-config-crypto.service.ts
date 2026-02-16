import { Injectable, Logger } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

const ENCRYPTED_PREFIX = 'enc:v1';
const AES_256_GCM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class IntegrationConfigCryptoService {
  private readonly logger = new Logger(IntegrationConfigCryptoService.name);
  private readonly key: Buffer;

  constructor() {
    const integrationKey = process.env.INTEGRATIONS_ENCRYPTION_KEY;
    const jwtSecret = process.env.JWT_SECRET;

    if (!integrationKey && !jwtSecret) {
      this.logger.warn(
        'INTEGRATIONS_ENCRYPTION_KEY and JWT_SECRET are not set; using development fallback key for integration secret encryption.',
      );
    } else if (!integrationKey && jwtSecret) {
      this.logger.warn(
        'INTEGRATIONS_ENCRYPTION_KEY is not set; falling back to JWT_SECRET for integration secret encryption.',
      );
    }

    const keyMaterial =
      integrationKey ??
      jwtSecret ??
      'dev_secret_change_me_integration_fallback';

    this.key = createHash('sha256').update(keyMaterial).digest();
  }

  encrypt(value: string): string {
    if (this.isEncrypted(value)) {
      return value;
    }

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(AES_256_GCM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return `${ENCRYPTED_PREFIX}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  decrypt(value: string): string {
    if (!this.isEncrypted(value)) {
      return value;
    }

    const parts = value.split(':');
    if (parts.length !== 5) {
      throw new Error('Invalid encrypted integration secret format');
    }

    const [, version, ivEncoded, authTagEncoded, payloadEncoded] = parts;
    if (version !== 'v1') {
      throw new Error('Unsupported encrypted integration secret version');
    }
    const iv = Buffer.from(ivEncoded, 'base64');
    const authTag = Buffer.from(authTagEncoded, 'base64');
    const payload = Buffer.from(payloadEncoded, 'base64');

    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error('Invalid encrypted integration secret payload');
    }

    const decipher = createDecipheriv(AES_256_GCM, this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(payload),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  isEncrypted(value: string): boolean {
    return value.startsWith(`${ENCRYPTED_PREFIX}:`);
  }
}
