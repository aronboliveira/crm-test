import { BadRequestException } from '@nestjs/common';
import ImportTemplatesService from './import-templates.service';

const validId = '507f1f77bcf86cd799439011';

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

function createService() {
  return new (ImportTemplatesService as any)(
    mockRepo,
  ) as ImportTemplatesService;
}

describe('ImportTemplatesService', () => {
  let service: ImportTemplatesService;

  beforeEach(() => {
    mockRepo.find.mockReset();
    mockRepo.findOne.mockReset();
    mockRepo.create.mockReset();
    mockRepo.save.mockReset();
    mockRepo.delete.mockReset();
    service = createService();
  });

  it('creates first version on template creation', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    mockRepo.create.mockImplementation((value: any) => value);
    mockRepo.save.mockImplementation(async (value: any) => value);

    const created = await service.create(
      {
        kind: 'clients',
        name: 'ERP Clientes',
        columnMapping: { name: 'Nome', email: 'Email' },
        defaultValues: { preferredContact: 'email' },
      },
      'admin@corp.local',
    );

    expect(created.latestVersion).toBe(1);
    expect(created.versions).toHaveLength(1);
    expect(created.versions[0]?.columnMapping.name).toBe('Nome');
  });

  it('bumps version when mapping changes', async () => {
    mockRepo.findOne
      .mockResolvedValueOnce({
        _id: validId,
        kind: 'clients',
        name: 'ERP Clientes',
        nameNormalized: 'erp clientes',
        profileKey: undefined,
        description: '',
        columnMapping: { name: 'Nome' },
        defaultValues: {},
        latestVersion: 1,
        versions: [
          {
            version: 1,
            createdAt: new Date(0).toISOString(),
            createdByEmail: 'admin@corp.local',
            columnMapping: { name: 'Nome' },
            defaultValues: {},
          },
        ],
      })
      .mockResolvedValueOnce(null);
    mockRepo.save.mockImplementation(async (value: any) => value);

    const updated = await service.update(
      validId,
      {
        columnMapping: { name: 'Nome Cliente' },
      },
      'owner@corp.local',
    );

    expect(updated.latestVersion).toBe(2);
    expect(updated.versions).toHaveLength(2);
    expect(updated.versions[1]?.columnMapping.name).toBe('Nome Cliente');
  });

  it('previewApply returns diff summary', async () => {
    mockRepo.findOne.mockResolvedValue({
      _id: validId,
      kind: 'users',
      name: 'Usuarios RH',
      latestVersion: 2,
      versions: [
        {
          version: 1,
          createdAt: new Date(0).toISOString(),
          createdByEmail: 'admin@corp.local',
          columnMapping: { email: 'Email' },
          defaultValues: {},
        },
        {
          version: 2,
          createdAt: new Date().toISOString(),
          createdByEmail: 'admin@corp.local',
          columnMapping: { email: 'mail', roleKey: 'perfil' },
          defaultValues: { roleKey: 'member' },
        },
      ],
    });

    const preview = await service.previewApply(validId, {
      targetVersion: 2,
      currentColumnMapping: { email: 'Email' },
      currentDefaultValues: {},
    });

    expect(preview.targetVersion).toBe(2);
    expect(preview.diff.mapping.changed).toHaveLength(1);
    expect(preview.diff.mapping.added).toHaveLength(1);
    expect(preview.diff.defaults.added).toHaveLength(1);
  });

  it('rejects empty mapping on create', async () => {
    await expect(
      service.create(
        {
          kind: 'projects',
          name: 'Sem Mapeamento',
          columnMapping: {},
        },
        'owner@corp.local',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
