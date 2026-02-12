import { AssistantChatLogService } from './assistant-chat-log.service';

type MockRepo = {
  save: jest.Mock;
  find: jest.Mock;
};

const createService = (repoOverrides: Partial<MockRepo> = {}) => {
  const repo: MockRepo = {
    save: jest.fn(),
    find: jest.fn(),
    ...repoOverrides,
  };

  return {
    repo,
    service: new AssistantChatLogService(repo as any),
  };
};

describe('AssistantChatLogService', () => {
  describe('append', () => {
    it('persists normalized assistant chat message', async () => {
      const { repo, service } = createService();

      await service.append({
        userId: ' user-1 ',
        direction: 'assistant',
        text: ' hello ',
        status: 'sent',
        meta: { source: 'test' },
      });

      expect(repo.save).toHaveBeenCalledTimes(1);
      const payload = repo.save.mock.calls[0]?.[0];
      expect(payload.userId).toBe('user-1');
      expect(payload.text).toBe('hello');
      expect(payload.transport).toBe('websocket');
      expect(payload.status).toBe('sent');
    });

    it('skips persist for empty user id or text', async () => {
      const { repo, service } = createService();

      await service.append({
        userId: '',
        direction: 'user',
        text: 'hello',
        status: 'received',
      });
      await service.append({
        userId: 'u1',
        direction: 'user',
        text: '   ',
        status: 'received',
      });

      expect(repo.save).not.toHaveBeenCalled();
    });

    it('does not throw when repository save fails', async () => {
      const { service } = createService({
        save: jest.fn().mockRejectedValue(new Error('db-down')),
      });

      await expect(
        service.append({
          userId: 'u1',
          direction: 'user',
          text: 'hello',
          status: 'received',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('listRecentByUser', () => {
    it('returns reversed chronological history with clamped limit', async () => {
      const rows = [
        { id: 'm3', createdAt: '2026-02-11T10:00:03.000Z' },
        { id: 'm2', createdAt: '2026-02-11T10:00:02.000Z' },
        { id: 'm1', createdAt: '2026-02-11T10:00:01.000Z' },
      ];
      const { repo, service } = createService({
        find: jest.fn().mockResolvedValue(rows),
      });

      const result = await service.listRecentByUser('u1', 999);

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1' },
          take: 100,
        }),
      );
      expect(result.map((row: any) => row.id)).toEqual(['m1', 'm2', 'm3']);
    });

    it('returns empty list for invalid user id', async () => {
      const { repo, service } = createService();
      const result = await service.listRecentByUser('  ');
      expect(result).toEqual([]);
      expect(repo.find).not.toHaveBeenCalled();
    });
  });

  describe('listPageByUser', () => {
    it('returns page and next cursor honoring query cursor', async () => {
      const rows = [
        { id: 'm5', createdAt: '2026-02-11T10:00:05.000Z' },
        { id: 'm4', createdAt: '2026-02-11T10:00:04.000Z' },
      ];
      const { repo, service } = createService({
        find: jest.fn().mockResolvedValue(rows),
      });

      const result = await service.listPageByUser('u1', {
        limit: '2',
        cursor: '2026-02-11T11:00:00.000Z',
      });

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1', createdAt: { $lt: '2026-02-11T11:00:00.000Z' } },
          take: 2,
        }),
      );
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('2026-02-11T10:00:04.000Z');
    });

    it('returns empty result when repository find fails', async () => {
      const { service } = createService({
        find: jest.fn().mockRejectedValue(new Error('db-failure')),
      });

      const result = await service.listPageByUser('u1', { limit: '10' });
      expect(result).toEqual({ items: [], nextCursor: null });
    });

    it('clamps malformed limit to fallback and min bound', async () => {
      const { repo, service } = createService({
        find: jest.fn().mockResolvedValue([]),
      });

      await service.listPageByUser('u1', { limit: 'abc' });
      expect(repo.find).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 30 }),
      );

      await service.listPageByUser('u1', { limit: '-5' });
      expect(repo.find).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 1 }),
      );
    });
  });
});
