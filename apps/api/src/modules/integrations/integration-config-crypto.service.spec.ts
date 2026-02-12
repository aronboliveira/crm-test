import { IntegrationConfigCryptoService } from './integration-config-crypto.service';

describe('IntegrationConfigCryptoService', () => {
  const originalIntegrationKey = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY = 'integration-test-key';
    process.env.JWT_SECRET = 'jwt-test-key';
  });

  afterEach(() => {
    if (typeof originalIntegrationKey === 'undefined') {
      delete process.env.INTEGRATIONS_ENCRYPTION_KEY;
    } else {
      process.env.INTEGRATIONS_ENCRYPTION_KEY = originalIntegrationKey;
    }

    if (typeof originalJwtSecret === 'undefined') {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  it('encrypts and decrypts secret values', () => {
    const service = new IntegrationConfigCryptoService();
    const plain = 'my-secret-token';

    const encrypted = service.encrypt(plain);
    const decrypted = service.decrypt(encrypted);

    expect(encrypted).not.toEqual(plain);
    expect(service.isEncrypted(encrypted)).toBe(true);
    expect(decrypted).toBe(plain);
  });

  it('does not re-encrypt values already in encrypted format', () => {
    const service = new IntegrationConfigCryptoService();
    const once = service.encrypt('top-secret');
    const twice = service.encrypt(once);

    expect(twice).toBe(once);
  });

  it('returns plaintext values untouched', () => {
    const service = new IntegrationConfigCryptoService();

    expect(service.decrypt('plain-value')).toBe('plain-value');
  });
});
