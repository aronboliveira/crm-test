import { NextcloudAdapter } from './nextcloud.adapter';

describe('NextcloudAdapter', () => {
  let adapter: NextcloudAdapter;
  let apiClient: {
    configure: jest.Mock;
    testConnection: jest.Mock;
  };

  beforeEach(() => {
    adapter = new NextcloudAdapter({} as never);
    apiClient = {
      configure: jest.fn(),
      testConnection: jest.fn().mockResolvedValue(true),
    };
    (adapter as any).apiClient = apiClient;
  });

  it('returns disconnected status when not configured', async () => {
    const status = await adapter.getStatus();

    expect(status.id).toBe('nextcloud');
    expect(status.configured).toBe(false);
    expect(status.status).toBe('disconnected');
  });

  it('accepts serverUrl alias and app password auth', async () => {
    await adapter.configure({
      serverUrl: 'https://cloud.example.com',
      username: 'cloud-user',
      appPassword: 'app-secret',
      basePath: 'CRM',
    });

    const status = await adapter.getStatus();

    expect(status.configured).toBe(true);
    expect(apiClient.configure).toHaveBeenCalledWith({
      baseUrl: 'https://cloud.example.com',
      username: 'cloud-user',
      password: undefined,
      appPassword: 'app-secret',
    });
    expect((adapter as any).config.defaultFolder).toBe('/CRM');
  });

  it('accepts password auth mode when app password is absent', async () => {
    await adapter.configure({
      baseUrl: 'https://cloud.example.com',
      username: 'cloud-user',
      password: 'plain-password',
    });

    const status = await adapter.getStatus();
    expect(status.configured).toBe(true);
  });

  it('testConnection returns false when configuration is incomplete', async () => {
    await adapter.configure({
      baseUrl: 'https://cloud.example.com',
      username: 'cloud-user',
    });

    const result = await adapter.testConnection();

    expect(result).toBe(false);
    expect(apiClient.testConnection).not.toHaveBeenCalled();
  });

  it('updates connection state when connection test succeeds', async () => {
    await adapter.configure({
      baseUrl: 'https://cloud.example.com',
      username: 'cloud-user',
      appPassword: 'app-secret',
    });

    const result = await adapter.testConnection();
    const status = await adapter.getStatus();

    expect(result).toBe(true);
    expect(status.status).toBe('connected');
  });
});
