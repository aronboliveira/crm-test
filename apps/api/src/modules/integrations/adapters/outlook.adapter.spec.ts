import { OutlookAdapter } from './outlook.adapter';

describe('OutlookAdapter', () => {
  let adapter: OutlookAdapter;

  beforeEach(() => {
    adapter = new OutlookAdapter();
  });

  it('reports disconnected when not configured', async () => {
    const status = await adapter.getStatus();
    expect(status.id).toBe('outlook');
    expect(status.configured).toBe(false);
    expect(status.status).toBe('disconnected');
  });

  it('accepts tenant/client credentials and builds SMTP profile', async () => {
    await adapter.configure({
      tenantId: 'tenant-001',
      clientId: 'client-001',
      clientSecret: 'secret-001',
      smtpProfile: 'outlook',
    });

    expect(adapter.isConfigured()).toBe(true);
    expect(adapter.getSmtpProfile()).toEqual({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      user: undefined,
      pass: undefined,
      from: undefined,
      profile: 'outlook',
    });
  });

  it('returns false in testConnection when config is incomplete', async () => {
    await adapter.configure({
      tenantId: 'tenant-001',
      clientId: 'client-001',
    });

    await expect(adapter.testConnection()).resolves.toBe(false);
  });

  it('produces sync snapshot datasets when data providers return records', async () => {
    await adapter.configure({
      tenantId: 'tenant-001',
      clientId: 'client-001',
      clientSecret: 'secret-001',
    });

    jest.spyOn(adapter, 'getUnreadEmails').mockResolvedValue([
      {
        id: 'mail-1',
        subject: 'Subject',
        from: 'from@example.com',
        receivedAt: new Date().toISOString(),
      },
    ]);
    jest.spyOn(adapter, 'getUpcomingEvents').mockResolvedValue([
      {
        id: 'event-1',
        subject: 'Event',
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 3600000).toISOString(),
      },
    ]);
    jest.spyOn(adapter, 'getTasks').mockResolvedValue([
      {
        id: 'task-1',
        title: 'Task',
        status: 'notStarted',
        importance: 'normal',
      },
    ]);

    const datasets = await adapter.pullSyncSnapshot();

    expect(datasets).toHaveLength(3);
    expect(datasets.map((dataset) => dataset.recordType)).toEqual([
      'unread_emails',
      'upcoming_events',
      'tasks',
    ]);
  });
});
