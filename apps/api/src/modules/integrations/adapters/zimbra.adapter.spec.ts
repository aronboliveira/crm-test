import { ZimbraAdapter } from './zimbra.adapter';

describe('ZimbraAdapter', () => {
  let adapter: ZimbraAdapter;

  beforeEach(() => {
    adapter = new ZimbraAdapter();
  });

  it('reports disconnected when not configured', async () => {
    const status = await adapter.getStatus();
    expect(status.id).toBe('zimbra');
    expect(status.configured).toBe(false);
    expect(status.status).toBe('disconnected');
  });

  it('normalizes config and exposes SMTP profile', async () => {
    await adapter.configure({
      apiUrl: 'https://mail.example.com/',
      username: ' admin ',
      password: ' secret ',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpSecure: false,
      smtpProfile: 'zimbra',
    });

    expect(adapter.isConfigured()).toBe(true);
    expect(adapter.getSmtpProfile()).toEqual({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      user: undefined,
      pass: undefined,
      from: undefined,
      profile: 'zimbra',
    });
  });

  it('produces sync snapshot datasets when configured', async () => {
    await adapter.configure({
      baseUrl: 'https://mail.example.com',
      username: 'admin',
      password: 'secret',
      mockNotifications: true,
    });

    const datasets = await adapter.pullSyncSnapshot();

    expect(datasets).toHaveLength(2);
    expect(datasets[0].recordType).toBe('unread_emails');
    expect(datasets[1].recordType).toBe('upcoming_calls');
    expect(datasets[0].records.length).toBeGreaterThan(0);
    expect(datasets[1].records.length).toBeGreaterThan(0);
  });
});
