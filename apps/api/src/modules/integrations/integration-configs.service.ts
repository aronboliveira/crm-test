import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import IntegrationConfigEntity from '../../entities/IntegrationConfigEntity';
import type { IntegrationConfig } from './types';
import { IntegrationConfigCryptoService } from './integration-config-crypto.service';

const SECRET_CONFIG_KEYS = new Set<keyof IntegrationConfig>([
  'apiKey',
  'appToken',
  'userToken',
  'password',
  'appPassword',
  'clientSecret',
  'accessToken',
  'smtpPass',
]);

@Injectable()
export class IntegrationConfigsService {
  private readonly logger = new Logger(IntegrationConfigsService.name);

  constructor(
    @InjectRepository(IntegrationConfigEntity)
    private readonly repository: MongoRepository<IntegrationConfigEntity>,
    private readonly crypto: IntegrationConfigCryptoService,
  ) {}

  async getConfig(id: string): Promise<Partial<IntegrationConfig> | null> {
    const record = await this.repository.findOne({
      where: { integrationId: id },
    });

    if (!record?.config) {
      return null;
    }

    return this.decryptConfig(id, record.config as Partial<IntegrationConfig>);
  }

  async getAll(): Promise<Map<string, Partial<IntegrationConfig>>> {
    const records = await this.repository.find();
    const configs = new Map<string, Partial<IntegrationConfig>>();

    for (const record of records) {
      configs.set(
        record.integrationId,
        this.decryptConfig(
          record.integrationId,
          (record.config as Partial<IntegrationConfig>) ?? {},
        ),
      );
    }

    return configs;
  }

  async upsert(
    id: string,
    patch: Partial<IntegrationConfig>,
  ): Promise<Partial<IntegrationConfig>> {
    const previous = await this.getConfig(id);
    const merged = this.mergeConfig(previous ?? {}, patch);
    const encrypted = this.encryptConfig(merged);

    const existing = await this.repository.findOne({
      where: { integrationId: id },
    });

    if (existing) {
      existing.config = encrypted as Record<string, unknown>;
      await this.repository.save(existing);
      return merged;
    }

    const created = this.repository.create({
      integrationId: id,
      config: encrypted as Record<string, unknown>,
    });

    await this.repository.save(created);
    return merged;
  }

  private decryptConfig(
    integrationId: string,
    config: Partial<IntegrationConfig>,
  ): Partial<IntegrationConfig> {
    const decrypted: Partial<IntegrationConfig> = { ...config };

    for (const [key, value] of Object.entries(decrypted)) {
      if (!this.isSecretKey(key) || typeof value !== 'string') {
        continue;
      }

      try {
        decrypted[key as keyof IntegrationConfig] = this.crypto.decrypt(
          value,
        ) as never;
      } catch (error) {
        this.logger.error(
          `Failed to decrypt secret "${key}" for integration "${integrationId}"`,
          error as Error,
        );
        delete decrypted[key as keyof IntegrationConfig];
      }
    }

    return decrypted;
  }

  private encryptConfig(
    config: Partial<IntegrationConfig>,
  ): Partial<IntegrationConfig> {
    const encrypted: Partial<IntegrationConfig> = { ...config };

    for (const [key, value] of Object.entries(encrypted)) {
      if (!this.isSecretKey(key) || typeof value !== 'string') {
        continue;
      }

      encrypted[key as keyof IntegrationConfig] = this.crypto.encrypt(
        value,
      ) as never;
    }

    return encrypted;
  }

  private mergeConfig(
    previous: Partial<IntegrationConfig>,
    patch: Partial<IntegrationConfig>,
  ): Partial<IntegrationConfig> {
    const merged: Partial<IntegrationConfig> = {
      ...previous,
      ...patch,
    };

    for (const [key, value] of Object.entries(merged)) {
      if (typeof value === 'string' && value.trim() === '') {
        delete merged[key as keyof IntegrationConfig];
      }
    }

    return merged;
  }

  private isSecretKey(key: string): key is keyof IntegrationConfig {
    return SECRET_CONFIG_KEYS.has(key as keyof IntegrationConfig);
  }
}
