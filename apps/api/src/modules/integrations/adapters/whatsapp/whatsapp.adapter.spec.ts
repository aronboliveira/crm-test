import { WhatsAppAdapter } from './whatsapp.adapter';

describe('WhatsAppAdapter', () => {
  let adapter: WhatsAppAdapter;

  beforeEach(() => {
    adapter = new WhatsAppAdapter({} as never);
  });

  it('returns disconnected status when not configured', async () => {
    const status = await adapter.getStatus();

    expect(status.id).toBe('whatsapp');
    expect(status.configured).toBe(false);
    expect(status.status).toBe('disconnected');
  });

  it('reports connected after successful connection test', async () => {
    await adapter.configure({
      accessToken: 'token-123',
      businessAccountId: 'waba-123',
    });

    (adapter as any).client = {
      testConnection: jest.fn().mockResolvedValue(true),
    };

    await expect(adapter.testConnection()).resolves.toBe(true);

    const status = await adapter.getStatus();
    expect(status.configured).toBe(true);
    expect(status.status).toBe('connected');
    expect(status.lastError).toBeUndefined();
  });

  it('reports error when connection test fails', async () => {
    await adapter.configure({
      accessToken: 'token-123',
      businessAccountId: 'waba-123',
    });

    (adapter as any).client = {
      testConnection: jest.fn().mockResolvedValue(false),
    };

    await expect(adapter.testConnection()).resolves.toBe(false);

    const status = await adapter.getStatus();
    expect(status.configured).toBe(true);
    expect(status.status).toBe('error');
    expect(status.lastError).toBe('Connection test failed');
  });

  it('normalizes config values and applies default API version', async () => {
    await adapter.configure({
      accessToken: '  token-123  ',
      businessAccountId: '  waba-123  ',
      phoneNumberId: '   ',
      apiVersion: '   ',
    });

    expect((adapter as any).config).toMatchObject({
      accessToken: 'token-123',
      businessAccountId: 'waba-123',
      phoneNumberId: undefined,
      apiVersion: 'v18.0',
    });
  });

  it('returns safe health metadata when integration is not configured', async () => {
    const health = await adapter.getHealthInfo();

    expect(health).toMatchObject({
      configured: false,
      healthy: false,
      setupReady: false,
    });
    expect(Array.isArray((health as any).setup)).toBe(true);
    expect((health as any).missingRequired).toEqual(
      expect.arrayContaining([
        'Access Token (Meta Graph API)',
        'WhatsApp Business Account ID',
      ]),
    );
    expect((health as any).nextStep).toContain('Provide required Meta credentials');
  });

  it('builds sync snapshot datasets for template reconciliation', async () => {
    await adapter.configure({
      accessToken: 'token-123',
      businessAccountId: 'waba-123',
    });

    (adapter as any).client = {
      getAllTemplates: jest.fn().mockResolvedValue([
        {
          id: 'tpl-1',
          name: 'welcome_customer',
          language: 'pt_BR',
          status: 'APPROVED',
          category: 'UTILITY',
          components: [{ type: 'BODY', text: 'Oi {{1}}' }],
        },
      ]),
    };

    const datasets = await adapter.pullSyncSnapshot();

    expect(datasets).toHaveLength(2);
    expect(datasets[0]).toMatchObject({
      recordType: 'whatsapp_templates',
      externalIdField: 'sourceId',
    });
    expect(datasets[0].records[0]).toMatchObject({
      sourceId: 'tpl-1',
      name: 'welcome_customer',
    });
    expect(datasets[1]).toMatchObject({
      recordType: 'whatsapp_template_usage',
      externalIdField: 'sourceId',
    });
  });
});
