import ImportFieldSuggestionsService from './import-field-suggestions.service';

const mockClientsRepo = { find: jest.fn() };
const mockProjectsRepo = { find: jest.fn() };
const mockTasksRepo = { find: jest.fn() };
const mockLeadsRepo = { find: jest.fn() };
const mockMessageEventsRepo = { find: jest.fn() };
const mockUsersRepo = { find: jest.fn() };

function createService() {
  return new (ImportFieldSuggestionsService as any)(
    mockClientsRepo,
    mockProjectsRepo,
    mockTasksRepo,
    mockLeadsRepo,
    mockMessageEventsRepo,
    mockUsersRepo,
  ) as ImportFieldSuggestionsService;
}

describe('ImportFieldSuggestionsService', () => {
  let service: ImportFieldSuggestionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createService();
  });

  it('ranks client name suggestions by relation-weighted score', async () => {
    mockClientsRepo.find.mockResolvedValue([
      { id: 'c1', name: 'Cliente Alfa', company: 'Alfa SA' },
      { id: 'c2', name: 'Cliente Beta', company: 'Beta SA' },
    ]);
    mockProjectsRepo.find.mockResolvedValue([
      { _id: 'p1', clientId: 'c1' },
      { _id: 'p2', clientId: 'c1' },
      { _id: 'p3', clientId: 'c2' },
    ]);
    mockLeadsRepo.find.mockResolvedValue([
      { convertedClientId: 'c1' },
      { convertedClientId: 'c1' },
      { convertedClientId: 'c2' },
    ]);
    mockMessageEventsRepo.find.mockResolvedValue([
      ...Array.from({ length: 8 }).map(() => ({ clientId: 'c1' })),
      { clientId: 'c2' },
    ]);
    mockTasksRepo.find.mockResolvedValue([]);
    mockUsersRepo.find.mockResolvedValue([]);

    const items = await service.list({
      kind: 'clients',
      field: 'name',
      limit: 5,
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.field).toBe('name');
    expect(items[0]?.suggestions[0]?.value).toBe('Cliente Alfa');
  });

  it('filters and boosts results by query prefix', async () => {
    mockClientsRepo.find.mockResolvedValue([
      { id: 'c1', name: 'Ana Souza', company: 'Ana Tech' },
      { id: 'c2', name: 'Bruno Alves', company: 'Bruno Labs' },
      { id: 'c3', name: 'Anabela Lima', company: 'Lima Corp' },
    ]);
    mockProjectsRepo.find.mockResolvedValue([]);
    mockLeadsRepo.find.mockResolvedValue([]);
    mockMessageEventsRepo.find.mockResolvedValue([]);
    mockTasksRepo.find.mockResolvedValue([]);
    mockUsersRepo.find.mockResolvedValue([]);

    const items = await service.list({
      kind: 'clients',
      field: 'name',
      query: 'ana',
      limit: 5,
    });

    expect(items).toHaveLength(1);
    const values = items[0]?.suggestions.map((entry) => entry.value) ?? [];
    expect(values).toContain('Ana Souza');
    expect(values).toContain('Anabela Lima');
    expect(values).not.toContain('Bruno Alves');
  });

  it('returns user field suggestions with task/project influence', async () => {
    mockUsersRepo.find.mockResolvedValue([
      { email: 'ana@corp.local', roles: ['manager'], firstName: 'Ana' },
      { email: 'bia@corp.local', roles: ['member'], firstName: 'Bia' },
    ]);
    mockTasksRepo.find.mockResolvedValue([
      { assigneeEmail: 'ana@corp.local' },
      { assigneeEmail: 'ana@corp.local' },
      { assigneeEmail: 'bia@corp.local' },
    ]);
    mockProjectsRepo.find.mockResolvedValue([
      { ownerEmail: 'ana@corp.local', status: 'active' },
    ]);
    mockClientsRepo.find.mockResolvedValue([]);
    mockLeadsRepo.find.mockResolvedValue([]);
    mockMessageEventsRepo.find.mockResolvedValue([]);

    const items = await service.list({
      kind: 'users',
      field: 'email',
      limit: 5,
    });
    expect(items[0]?.suggestions[0]?.value).toBe('ana@corp.local');
  });
});
