import { BadRequestException, NotFoundException } from '@nestjs/common';
import ProjectsService from './projects.service';

/* ─── mock repo ────────────────────────────────────────── */

const fakeOid = '507f1f77bcf86cd799439011';

const mockRepo = {
  find: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

function createService() {
  return new (ProjectsService as any)(mockRepo) as ProjectsService;
}

/* ─── tests ────────────────────────────────────────────── */

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createService();
  });

  /* ── list ── */
  describe('list', () => {
    it('should return an array of projects', async () => {
      const items = [
        { _id: '1', name: 'P1', status: 'active' },
        { _id: '2', name: 'P2', status: 'archived' },
      ];
      mockRepo.find.mockResolvedValue(items);

      const result = await service.list();
      expect(result).toEqual(items);
      expect(mockRepo.find).toHaveBeenCalledWith({ take: 500 });
    });

    it('should return empty array when no projects exist', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await service.list();
      expect(result).toEqual([]);
    });
  });

  /* ── create ── */
  describe('create', () => {
    it('should create a project with valid name', async () => {
      const saved = { _id: fakeOid, name: 'Test', status: 'active' };
      mockRepo.save.mockResolvedValue(saved);

      const result = await service.create({ name: 'Test' });
      expect(result).toEqual(saved);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test', status: 'active' }),
      );
    });

    it('should throw BadRequestException when name is empty', async () => {
      await expect(service.create({ name: '' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when name is whitespace', async () => {
      await expect(service.create({ name: '   ' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should default status to active when not provided', async () => {
      mockRepo.save.mockImplementation(async (dto) => ({
        _id: fakeOid,
        ...dto,
      }));

      const result = await service.create({ name: 'Proj' });
      expect(result.status).toBe('active');
    });

    it('should accept valid statuses', async () => {
      mockRepo.save.mockImplementation(async (dto) => ({
        _id: fakeOid,
        ...dto,
      }));

      for (const status of [
        'active',
        'archived',
        'planned',
        'blocked',
        'done',
      ] as const) {
        const result = await service.create({ name: 'P', status });
        expect(result.status).toBe(status);
      }
    });

    it('should default to active for invalid status', async () => {
      mockRepo.save.mockImplementation(async (dto) => ({
        _id: fakeOid,
        ...dto,
      }));

      const result = await service.create({
        name: 'P',
        status: 'invalid' as any,
      });
      expect(result.status).toBe('active');
    });

    it('should uppercase the project code', async () => {
      mockRepo.save.mockImplementation(async (dto) => ({
        _id: fakeOid,
        ...dto,
      }));

      const result = await service.create({ name: 'P', code: 'abc-123' });
      expect(result.code).toBe('ABC-123');
    });

    it('should include tags when provided as array', async () => {
      mockRepo.save.mockImplementation(async (dto) => ({
        _id: fakeOid,
        ...dto,
      }));

      const result = await service.create({
        name: 'P',
        tags: ['frontend', 'urgent'],
      });
      expect(result.tags).toEqual(['frontend', 'urgent']);
    });

    it('should filter empty tags', async () => {
      mockRepo.save.mockImplementation(async (dto) => ({
        _id: fakeOid,
        ...dto,
      }));

      const result = await service.create({
        name: 'P',
        tags: ['ok', '', 'also-ok'],
      });
      expect(result.tags).toEqual(['ok', 'also-ok']);
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      mockRepo.save.mockImplementation(async (dto) => ({
        _id: fakeOid,
        ...dto,
      }));

      const before = new Date().toISOString();
      const result = await service.create({ name: 'P' });
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.createdAt).toBe(result.updatedAt);
    });
  });

  /* ── update ── */
  describe('update', () => {
    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.update('not-an-oid', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when project does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.update(fakeOid, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update a project name', async () => {
      const existing = { _id: fakeOid, name: 'Old', status: 'active' };
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockRepo.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, name: 'New' });

      const result = await service.update(fakeOid, { name: 'New' });
      expect(mockRepo.update).toHaveBeenCalled();
    });
  });

  /* ── remove ── */
  describe('remove', () => {
    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.remove('bad')).rejects.toThrow(BadRequestException);
    });

    it('should call repo.delete with valid ObjectId', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 1 });
      await service.remove(fakeOid);
      expect(mockRepo.delete).toHaveBeenCalled();
    });

    it('should not throw even when no document matched', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 0 });
      await expect(service.remove(fakeOid)).resolves.not.toThrow();
    });
  });
});
