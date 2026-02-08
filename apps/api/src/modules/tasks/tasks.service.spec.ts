import { BadRequestException, NotFoundException } from '@nestjs/common';
import TasksService from './tasks.service';

/* ─── mocks ────────────────────────────────────────────── */

const fakeOid = '507f1f77bcf86cd799439011';
const fakeProjectId = '607f1f77bcf86cd799439022';

const mockProjectsLookup = {
  existsById: jest.fn().mockResolvedValue(true),
};

const mockRepo = {
  find: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

function createService() {
  return new (TasksService as any)(
    mockProjectsLookup,
    mockRepo,
  ) as TasksService;
}

/* ─── tests ────────────────────────────────────────────── */

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProjectsLookup.existsById.mockResolvedValue(true);
    service = createService();
  });

  /* ── list ── */
  describe('list', () => {
    it('should return tasks from repo', async () => {
      const items = [
        { _id: '1', title: 'T1', status: 'todo' },
        { _id: '2', title: 'T2', status: 'done' },
      ];
      mockRepo.find.mockResolvedValue(items);

      const result = await service.list();
      expect(result).toEqual(items);
      expect(mockRepo.find).toHaveBeenCalledWith({ take: 1000 });
    });

    it('should return empty array when no tasks', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await service.list();
      expect(result).toEqual([]);
    });
  });

  /* ── create ── */
  describe('create', () => {
    it('should create a task with valid fields', async () => {
      const saved = {
        _id: fakeOid,
        title: 'My Task',
        projectId: fakeProjectId,
        status: 'todo',
        priority: 3,
      };
      mockRepo.save.mockResolvedValue(saved);

      const result = await service.create({
        projectId: fakeProjectId,
        title: 'My Task',
      });
      expect(result).toEqual(saved);
    });

    it('should throw BadRequestException when projectId is empty', async () => {
      await expect(
        service.create({ projectId: '', title: 'T' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when title is empty', async () => {
      await expect(
        service.create({ projectId: fakeProjectId, title: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when project does not exist', async () => {
      mockProjectsLookup.existsById.mockResolvedValue(false);
      await expect(
        service.create({ projectId: fakeProjectId, title: 'T' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should default status to todo', async () => {
      mockRepo.save.mockImplementation(async (dto) => ({
        _id: fakeOid,
        ...dto,
      }));

      const result = await service.create({
        projectId: fakeProjectId,
        title: 'T',
      });
      expect(result.status).toBe('todo');
    });

    it('should accept valid statuses', async () => {
      mockRepo.save.mockImplementation(async (dto) => ({
        _id: fakeOid,
        ...dto,
      }));

      for (const status of ['todo', 'doing', 'done', 'blocked'] as const) {
        const result = await service.create({
          projectId: fakeProjectId,
          title: 'T',
          status,
        });
        expect(result.status).toBe(status);
      }
    });

    it('should default priority to 3', async () => {
      mockRepo.save.mockImplementation(async (dto) => ({
        _id: fakeOid,
        ...dto,
      }));

      const result = await service.create({
        projectId: fakeProjectId,
        title: 'T',
      });
      expect(result.priority).toBe(3);
    });

    it('should accept valid priorities 1-5', async () => {
      mockRepo.save.mockImplementation(async (dto) => ({
        _id: fakeOid,
        ...dto,
      }));

      for (const priority of [1, 2, 3, 4, 5] as const) {
        const result = await service.create({
          projectId: fakeProjectId,
          title: 'T',
          priority,
        });
        expect(result.priority).toBe(priority);
      }
    });

    it('should default invalid priority to 3', async () => {
      mockRepo.save.mockImplementation(async (dto) => ({
        _id: fakeOid,
        ...dto,
      }));

      const result = await service.create({
        projectId: fakeProjectId,
        title: 'T',
        priority: 99 as any,
      });
      expect(result.priority).toBe(3);
    });

    it('should set timestamps on creation', async () => {
      mockRepo.save.mockImplementation(async (dto) => ({
        _id: fakeOid,
        ...dto,
      }));

      const result = await service.create({
        projectId: fakeProjectId,
        title: 'T',
      });
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should validate dueAt is ISO format', async () => {
      mockRepo.save.mockImplementation(async (dto) => ({
        _id: fakeOid,
        ...dto,
      }));

      const iso = '2026-03-01T00:00:00.000Z';
      const result = await service.create({
        projectId: fakeProjectId,
        title: 'T',
        dueAt: iso,
      });
      expect(result.dueAt).toBe(iso);
    });

    it('should ignore non-ISO dueAt', async () => {
      mockRepo.save.mockImplementation(async (dto) => ({
        _id: fakeOid,
        ...dto,
      }));

      const result = await service.create({
        projectId: fakeProjectId,
        title: 'T',
        dueAt: 'not-a-date',
      });
      expect(result.dueAt).toBeUndefined();
    });
  });

  /* ── update ── */
  describe('update', () => {
    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.update('bad', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when task not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.update(fakeOid, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update task title', async () => {
      const existing = {
        _id: fakeOid,
        title: 'Old',
        projectId: fakeProjectId,
      };
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockRepo.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, title: 'New' });

      const result = await service.update(fakeOid, { title: 'New' });
      expect(mockRepo.update).toHaveBeenCalled();
    });

    it('should reject empty projectId on update', async () => {
      const existing = { _id: fakeOid, title: 'T', projectId: fakeProjectId };
      mockRepo.findOne.mockResolvedValue(existing);

      await expect(
        service.update(fakeOid, { projectId: '  ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject projectId when project does not exist', async () => {
      const existing = { _id: fakeOid, title: 'T', projectId: fakeProjectId };
      mockRepo.findOne.mockResolvedValue(existing);
      mockProjectsLookup.existsById.mockResolvedValue(false);

      await expect(
        service.update(fakeOid, { projectId: 'nonexistent' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  /* ── remove ── */
  describe('remove', () => {
    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.remove('invalid')).rejects.toThrow(
        BadRequestException,
      );
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
