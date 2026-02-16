import { SatAdapter } from './sat.adapter';

describe('SatAdapter', () => {
  let adapter: SatAdapter;
  const resilience = {
    execute: jest.fn(async (_options: unknown, run: () => Promise<unknown>) =>
      run(),
    ),
    getIntegrationSnapshot: jest.fn().mockReturnValue([]),
  };

  beforeEach(() => {
    adapter = new SatAdapter({} as never, resilience as never);
  });

  describe('getStatus', () => {
    it('should return disconnected status when not configured', async () => {
      const status = await adapter.getStatus();

      expect(status.id).toBe('sat');
      expect(status.name).toBe('SAT ERP');
      expect(status.type).toBe('ERP/Financial');
      expect(status.status).toBe('disconnected');
      expect(status.configured).toBe(false);
    });

    it('should report configured when required fields are provided', async () => {
      await adapter.configure({
        baseUrl: 'https://sat.example.com',
        clientId: 'client-id',
        clientSecret: 'client-secret',
      });

      const status = await adapter.getStatus();
      expect(status.configured).toBe(true);
    });

    it('should accept apiUrl alias for baseUrl', async () => {
      await adapter.configure({
        apiUrl: 'https://sat.example.com',
        clientId: 'client-id',
        clientSecret: 'client-secret',
      });

      const status = await adapter.getStatus();
      expect(status.configured).toBe(true);
    });
  });

  describe('testConnection', () => {
    it('should return false when not configured', async () => {
      const result = await adapter.testConnection();
      expect(result).toBe(false);
    });
  });
});
