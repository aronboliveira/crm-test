import { AssistantChatController } from './assistant-chat.controller';
import { AssistantChatLogService } from './assistant-chat-log.service';

describe('AssistantChatController', () => {
  it('returns paginated history for authenticated user', async () => {
    const listPageByUser = jest.fn().mockResolvedValue({
      items: [
        {
          id: 'm1',
          direction: 'assistant',
          text: 'hello',
          status: 'sent',
          createdAt: '2026-02-11T00:00:00.000Z',
        },
      ],
      nextCursor: '2026-02-11T00:00:00.000Z',
    });

    const svc = { listPageByUser } as unknown as AssistantChatLogService;
    const ctrl = new AssistantChatController(svc);

    const result = await ctrl.history(
      { user: { id: 'u1' } },
      { limit: '20', cursor: '2026-02-12T00:00:00.000Z' },
    );

    expect(listPageByUser).toHaveBeenCalledWith('u1', {
      limit: '20',
      cursor: '2026-02-12T00:00:00.000Z',
    });
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe('2026-02-11T00:00:00.000Z');
  });

  it('handles missing user id by returning empty result from service', async () => {
    const listPageByUser = jest.fn().mockResolvedValue({
      items: [],
      nextCursor: null,
    });

    const svc = { listPageByUser } as unknown as AssistantChatLogService;
    const ctrl = new AssistantChatController(svc);

    const result = await ctrl.history({ user: {} }, { limit: '10' });

    expect(listPageByUser).toHaveBeenCalledWith('', {
      limit: '10',
      cursor: undefined,
    });
    expect(result).toEqual({ items: [], nextCursor: null });
  });
});
