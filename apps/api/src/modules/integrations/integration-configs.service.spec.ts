import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { MongoRepository } from 'typeorm';
import IntegrationConfigEntity from '../../entities/IntegrationConfigEntity';
import { IntegrationConfigCryptoService } from './integration-config-crypto.service';
import { IntegrationConfigsService } from './integration-configs.service';

describe('IntegrationConfigsService', () => {
  let service: IntegrationConfigsService;
  let repository: jest.Mocked<MongoRepository<IntegrationConfigEntity>>;
  let crypto: {
    encrypt: jest.Mock<string, [string]>;
    decrypt: jest.Mock<string, [string]>;
  };

  beforeEach(async () => {
    const repoMock = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<MongoRepository<IntegrationConfigEntity>>;
    crypto = {
      encrypt: jest
        .fn()
        .mockImplementation((value: string) => `enc:${value}`),
      decrypt: jest.fn().mockImplementation((value: string) =>
        value.startsWith('enc:') ? value.slice(4) : value,
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationConfigsService,
        {
          provide: IntegrationConfigCryptoService,
          useValue: crypto,
        },
        {
          provide: getRepositoryToken(IntegrationConfigEntity),
          useValue: repoMock,
        },
      ],
    }).compile();

    service = module.get<IntegrationConfigsService>(IntegrationConfigsService);
    repository = module.get(
      getRepositoryToken(IntegrationConfigEntity),
    ) as jest.Mocked<MongoRepository<IntegrationConfigEntity>>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when config record does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    const result = await service.getConfig('glpi');

    expect(result).toBeNull();
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { integrationId: 'glpi' },
    });
  });

  it('returns mapped configs from all records', async () => {
    repository.find.mockResolvedValue([
      {
        integrationId: 'glpi',
        config: { baseUrl: 'https://glpi.example.com', appToken: 'enc:token' },
      } as IntegrationConfigEntity,
      {
        integrationId: 'sat',
        config: { baseUrl: 'https://sat.example.com', apiKey: 'enc:sat-key' },
      } as IntegrationConfigEntity,
    ]);

    const result = await service.getAll();

    expect(result.get('glpi')).toEqual({
      baseUrl: 'https://glpi.example.com',
      appToken: 'token',
    });
    expect(result.get('sat')).toEqual({
      baseUrl: 'https://sat.example.com',
      apiKey: 'sat-key',
    });
  });

  it('decrypts encrypted secret fields when loading a single config', async () => {
    repository.findOne.mockResolvedValue({
      integrationId: 'sat',
      config: {
        baseUrl: 'https://sat.example.com',
        clientId: 'client-id',
        clientSecret: 'enc:client-secret',
      },
    } as IntegrationConfigEntity);

    const result = await service.getConfig('sat');

    expect(result).toEqual({
      baseUrl: 'https://sat.example.com',
      clientId: 'client-id',
      clientSecret: 'client-secret',
    });
    expect(crypto.decrypt).toHaveBeenCalledWith('enc:client-secret');
  });

  it('creates new config record when integration has no previous config', async () => {
    repository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    repository.create.mockImplementation(
      (value) => value as IntegrationConfigEntity,
    );
    repository.save.mockResolvedValue({} as IntegrationConfigEntity);

    const merged = await service.upsert('glpi', {
      baseUrl: 'https://glpi.example.com',
      appToken: 'app-token',
      userToken: 'user-token',
    });

    expect(repository.create).toHaveBeenCalledWith({
      integrationId: 'glpi',
      config: {
        baseUrl: 'https://glpi.example.com',
        appToken: 'enc:app-token',
        userToken: 'enc:user-token',
      },
    });
    expect(merged).toEqual({
      baseUrl: 'https://glpi.example.com',
      appToken: 'app-token',
      userToken: 'user-token',
    });
  });

  it('encrypts Nextcloud appPassword when persisting config', async () => {
    repository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    repository.create.mockImplementation(
      (value) => value as IntegrationConfigEntity,
    );
    repository.save.mockResolvedValue({} as IntegrationConfigEntity);

    const merged = await service.upsert('nextcloud', {
      baseUrl: 'https://cloud.example.com',
      username: 'cloud-user',
      appPassword: 'cloud-app-password',
    });

    expect(repository.create).toHaveBeenCalledWith({
      integrationId: 'nextcloud',
      config: {
        baseUrl: 'https://cloud.example.com',
        username: 'cloud-user',
        appPassword: 'enc:cloud-app-password',
      },
    });
    expect(merged).toEqual({
      baseUrl: 'https://cloud.example.com',
      username: 'cloud-user',
      appPassword: 'cloud-app-password',
    });
  });

  it('merges config patch with existing config and strips empty strings', async () => {
    const existing = {
      integrationId: 'glpi',
      config: {
        baseUrl: 'https://glpi.example.com',
        appToken: 'enc:existing-app-token',
        userToken: 'enc:existing-user-token',
      },
    } as IntegrationConfigEntity;

    repository.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(existing);
    repository.save.mockResolvedValue(existing);

    const merged = await service.upsert('glpi', {
      userToken: '',
      username: 'admin',
      password: 'admin-pass',
    });

    expect(existing.config).toEqual({
      baseUrl: 'https://glpi.example.com',
      appToken: 'enc:existing-app-token',
      username: 'admin',
      password: 'enc:admin-pass',
    });
    expect(merged).toEqual({
      baseUrl: 'https://glpi.example.com',
      appToken: 'existing-app-token',
      username: 'admin',
      password: 'admin-pass',
    });
    expect(repository.save).toHaveBeenCalledWith(existing);
  });
});
