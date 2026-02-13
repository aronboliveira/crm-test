import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DevicesService } from './devices.service';

const fakeOid = '507f1f77bcf86cd799439011';

const mockRepo = {
  find: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

function createService() {
  return new (DevicesService as any)(mockRepo) as DevicesService;
}

describe('DevicesService', () => {
  let service: DevicesService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-13T12:00:00.000Z'));
    service = createService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create', () => {
    it('throws when owner email is empty', async () => {
      await expect(service.create('', { name: 'Laptop' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when name is missing', async () => {
      await expect(
        service.create('user@corp.local', { name: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('defaults kind and status when invalid', async () => {
      mockRepo.save.mockImplementation(async (payload) => payload);

      const result = await service.create('user@corp.local', {
        name: 'Workstation',
        kind: 'invalid',
        status: 'invalid',
      });

      expect(result.kind).toBe('physical');
      expect(result.status).toBe('offline');
    });
  });

  describe('list', () => {
    it('throws when owner email is empty', async () => {
      await expect(service.list('', {})).rejects.toThrow(BadRequestException);
    });

    it('applies filters/pagination/sort and returns metadata', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.list('Admin@corp.local', {
        q: '  notebook ',
        status: 'online',
        kind: 'virtual',
        page: '2',
        pageSize: '15',
        sortBy: 'name',
        sortDir: 'asc',
      });

      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerEmail: 'admin@corp.local',
            status: 'online',
            kind: 'virtual',
            name: expect.any(Object),
          }),
          skip: 15,
          take: 15,
          order: { name: 1 },
        }),
      );
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(15);
      expect(result.sortBy).toBe('name');
      expect(result.sortDir).toBe('asc');
      expect(result.nextCursor).toBeNull();
    });

    it('clamps invalid pagination and falls back sorting', async () => {
      mockRepo.findAndCount.mockResolvedValue([[{ id: 'a' }], 21]);

      const result = await service.list('user@corp.local', {
        page: '-3',
        pageSize: '999',
        sortBy: 'invalid',
        sortDir: 'invalid',
      });

      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
          order: { updatedAt: -1 },
        }),
      );
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
      expect(result.sortBy).toBe('updatedAt');
      expect(result.sortDir).toBe('desc');
      expect(result.nextCursor).toBeNull();
    });
  });

  describe('update', () => {
    it('throws for invalid id', async () => {
      await expect(
        service.update('invalid-id', 'user@corp.local', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when item is not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update(fakeOid, 'user@corp.local', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates and returns refreshed entity', async () => {
      const current = {
        _id: fakeOid,
        ownerEmail: 'user@corp.local',
        name: 'Host A',
      };
      mockRepo.findOne.mockResolvedValueOnce(current).mockResolvedValueOnce({
        ...current,
        name: 'Host B',
      });
      mockRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.update(fakeOid, 'user@corp.local', {
        name: 'Host B',
      });

      expect(mockRepo.update).toHaveBeenCalled();
      expect(result.name).toBe('Host B');
    });
  });

  describe('analytics', () => {
    it('aggregates totals, top groups and daily activity', async () => {
      mockRepo.find.mockResolvedValue([
        {
          ownerEmail: 'admin@corp.local',
          status: 'online',
          kind: 'physical',
          vendor: 'Dell',
          operatingSystem: 'Windows 11 Pro',
          tags: ['support', 'field'],
          updatedAt: '2026-02-12T08:00:00.000Z',
        },
        {
          ownerEmail: 'admin@corp.local',
          status: 'online',
          kind: 'virtual',
          vendor: 'Dell',
          operatingSystem: 'Ubuntu 24.04',
          tags: ['support'],
          updatedAt: '2026-02-12T11:00:00.000Z',
        },
        {
          ownerEmail: 'admin@corp.local',
          status: 'offline',
          kind: 'virtual',
          vendor: 'Lenovo',
          operatingSystem: 'Ubuntu 24.04',
          tags: ['datacenter'],
          updatedAt: '2026-02-11T10:00:00.000Z',
        },
        {
          ownerEmail: 'admin@corp.local',
          status: 'maintenance',
          kind: 'physical',
          vendor: '',
          operatingSystem: '',
          tags: [],
          lastSeenAt: '2026-02-10T16:30:00.000Z',
          updatedAt: '2026-02-10T09:00:00.000Z',
        },
      ]);

      const result = await service.analytics('Admin@corp.local', {
        kind: 'physical',
        days: '7',
        top: '3',
      });

      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerEmail: 'admin@corp.local',
            kind: 'physical',
          }),
        }),
      );

      expect(result.total).toBe(4);
      expect(result.status).toEqual({
        online: 2,
        offline: 1,
        maintenance: 1,
      });
      expect(result.kind).toEqual({
        physical: 2,
        virtual: 2,
      });
      expect(result.topVendors).toEqual([
        { label: 'Dell', value: 2 },
        { label: 'Lenovo', value: 1 },
        { label: 'Nao informado', value: 1 },
      ]);
      expect(result.topOperatingSystems).toEqual([
        { label: 'Ubuntu 24.04', value: 2 },
        { label: 'Nao informado', value: 1 },
        { label: 'Windows 11 Pro', value: 1 },
      ]);
      expect(result.topTags).toEqual([
        { label: 'support', value: 2 },
        { label: 'datacenter', value: 1 },
        { label: 'field', value: 1 },
      ]);

      const dailyByDate = new Map(
        result.activityByDay.map((item) => [item.date, item]),
      );
      expect(result.activityByDay).toHaveLength(7);
      expect(dailyByDate.get('02-10')).toMatchObject({
        total: 1,
        maintenance: 1,
      });
      expect(dailyByDate.get('02-11')).toMatchObject({
        total: 1,
        offline: 1,
      });
      expect(dailyByDate.get('02-12')).toMatchObject({
        total: 2,
        online: 2,
      });
    });
  });

  describe('remove', () => {
    it('throws for invalid id', async () => {
      await expect(
        service.remove('invalid-id', 'user@corp.local'),
      ).rejects.toThrow(BadRequestException);
    });

    it('calls delete when device exists', async () => {
      const current = {
        _id: fakeOid,
        ownerEmail: 'user@corp.local',
        name: 'Host A',
      };
      mockRepo.findOne.mockResolvedValue(current);
      mockRepo.delete.mockResolvedValue({ affected: 1 });

      await service.remove(fakeOid, 'user@corp.local');
      expect(mockRepo.delete).toHaveBeenCalledWith(expect.anything());
    });
  });
});
