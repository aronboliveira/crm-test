import { BadRequestException, ConflictException } from '@nestjs/common';
import ImportService from './import.service';

const mockProjectRepo = {
  find: jest.fn(),
  bulkWrite: jest.fn(),
};

const mockTaskRepo = {
  find: jest.fn(),
  bulkWrite: jest.fn(),
};

const mockIngestionRunRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

function createService() {
  return new (ImportService as any)(
    mockProjectRepo,
    mockTaskRepo,
    mockIngestionRunRepo,
  ) as ImportService;
}

describe('ImportService', () => {
  let service: ImportService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProjectRepo.find.mockResolvedValue([]);
    mockTaskRepo.find.mockResolvedValue([]);
    mockProjectRepo.bulkWrite.mockResolvedValue({ ok: 1 });
    mockTaskRepo.bulkWrite.mockResolvedValue({ ok: 1 });
    mockIngestionRunRepo.findOne.mockResolvedValue(null);
    mockIngestionRunRepo.create.mockImplementation((value: any) => value);
    mockIngestionRunRepo.save.mockImplementation(async (value: any) => value);
    service = createService();
  });

  it('imports mixed project/task rows from JSON using bulkWrite', async () => {
    const fileContent = JSON.stringify([
      {
        type: 'project',
        name: 'Projeto JSON',
        description: 'Origem json',
        status: 'active',
      },
      {
        type: 'task',
        title: 'Task JSON',
        description: 'Linha de tarefa',
        status: 'doing',
        priority: 2,
      },
    ]);

    const result = await service.importFile(
      Buffer.from(fileContent, 'utf-8'),
      'application/json',
      'owner@corp.local',
      'dataset.json',
    );

    expect(result.projects).toBe(1);
    expect(result.tasks).toBe(1);
    expect(result.idempotent).toBe(false);
    expect(mockProjectRepo.bulkWrite).toHaveBeenCalledTimes(1);
    expect(mockTaskRepo.bulkWrite).toHaveBeenCalledTimes(1);
  });

  it('supports markdown table payloads', async () => {
    const fileContent = [
      '| type | name | description | status | priority | projectId |',
      '| --- | --- | --- | --- | --- | --- |',
      '| project | Projeto MD | Linha projeto | planned | 3 | |',
      '| task | Task MD | Linha tarefa | todo | 2 | project-md |',
    ].join('\n');

    const result = await service.importFile(
      Buffer.from(fileContent, 'utf-8'),
      'text/markdown',
      'owner@corp.local',
      'dataset.md',
    );

    expect(result.projects).toBe(1);
    expect(result.tasks).toBe(1);
  });

  it('supports markdown key:value blocks', async () => {
    const fileContent = [
      'type: project',
      'name: Projeto Bloco',
      'status: active',
      '',
      'type: task',
      'title: Tarefa em bloco',
      'status: doing',
      'priority: 1',
      'projectId: abc-123',
    ].join('\n');

    const result = await service.importFile(
      Buffer.from(fileContent, 'utf-8'),
      'text/plain',
      'owner@corp.local',
      'dataset.md',
    );

    expect(result.projects).toBe(1);
    expect(result.tasks).toBe(1);
  });

  it('streams CSV parsing and rejects strict duplicate rows in payload', async () => {
    const csv = [
      'type,name,status,priority,project_id',
      'task,Task A,todo,3,prj-1',
      'task,Task A,todo,2,prj-1',
    ].join('\n');

    await expect(
      service.importFile(
        Buffer.from(csv, 'utf-8'),
        'text/csv',
        'owner@corp.local',
        'dataset.csv',
        { duplicateStrategy: 'strict-fail' },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('skips duplicates when strategy is skip-duplicates', async () => {
    mockProjectRepo.find.mockResolvedValue([
      { _id: 'p1', code: 'PROJ-1' },
    ]);
    const json = JSON.stringify([
      { type: 'project', name: 'Proj 1', code: 'PROJ-1', status: 'active' },
      { type: 'task', title: 'Task 1', status: 'todo', priority: 3 },
    ]);

    const result = await service.importFile(
      Buffer.from(json, 'utf-8'),
      'application/json',
      'owner@corp.local',
      'dataset.json',
      { duplicateStrategy: 'skip-duplicates' },
    );

    expect(result.projects).toBe(0);
    expect(result.tasks).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('updates duplicates when strategy is update-on-match', async () => {
    mockProjectRepo.find.mockResolvedValue([
      { _id: 'p1', code: 'PROJ-1' },
    ]);
    const json = JSON.stringify([
      {
        type: 'project',
        name: 'Proj 1 Atualizado',
        code: 'PROJ-1',
        status: 'done',
      },
    ]);

    const result = await service.importFile(
      Buffer.from(json, 'utf-8'),
      'application/json',
      'owner@corp.local',
      'dataset.json',
      { duplicateStrategy: 'update-on-match' },
    );

    expect(result.projects).toBe(1);
    expect(result.skipped).toBe(0);
    const projectOps = mockProjectRepo.bulkWrite.mock.calls[0]?.[0] ?? [];
    expect(projectOps[0]?.updateOne).toBeDefined();
  });

  it('returns cached response for identical idempotent import', async () => {
    mockIngestionRunRepo.findOne.mockResolvedValueOnce({
      key: 'hash-key',
      status: 'completed',
      projects: 7,
      tasks: 9,
      skipped: 2,
      totalRows: 20,
      duplicateRowsInPayload: 1,
    });

    const result = await service.importFile(
      Buffer.from('[]', 'utf-8'),
      'application/json',
      'owner@corp.local',
      'dataset.json',
      { duplicateStrategy: 'skip-duplicates' },
    );

    expect(result.idempotent).toBe(true);
    expect(result.projects).toBe(7);
    expect(mockProjectRepo.bulkWrite).not.toHaveBeenCalled();
    expect(mockTaskRepo.bulkWrite).not.toHaveBeenCalled();
  });

  it('rejects invalid format and invalid duplicate strategy', async () => {
    await expect(
      service.importFile(
        Buffer.from('name,value', 'utf-8'),
        'application/octet-stream',
        'owner@corp.local',
        'dataset.bin',
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.importFile(
        Buffer.from('[]', 'utf-8'),
        'application/json',
        'owner@corp.local',
        'dataset.json',
        { duplicateStrategy: 'wrong-mode' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects rows that violate schema contract', async () => {
    const json = JSON.stringify([
      {
        type: 'task',
        title: 'Task Contract',
        status: 'todo',
        priority: 99,
      },
    ]);

    await expect(
      service.importFile(
        Buffer.from(json, 'utf-8'),
        'application/json',
        'owner@corp.local',
        'dataset.json',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
