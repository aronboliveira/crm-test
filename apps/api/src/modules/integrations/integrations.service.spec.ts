import { NotFoundException } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import type { IntegrationAdapter } from './types';

const createAdapter = (id: string): jest.Mocked<IntegrationAdapter> =>
  ({
    getStatus: jest.fn().mockResolvedValue({
      id,
      name: id.toUpperCase(),
      type: 'test',
      status: 'disconnected',
      configured: false,
      features: [],
    }),
    testConnection: jest.fn().mockResolvedValue(false),
    configure: jest.fn().mockResolvedValue(undefined),
    sync: jest.fn().mockResolvedValue(undefined),
    pullSyncSnapshot: jest.fn().mockResolvedValue([]),
  }) as unknown as jest.Mocked<IntegrationAdapter>;

describe('IntegrationsService', () => {
  let service: IntegrationsService;
  let glpi: jest.Mocked<IntegrationAdapter>;
  let sat: jest.Mocked<IntegrationAdapter>;
  let nextcloud: jest.Mocked<IntegrationAdapter>;
  let configs: {
    getAll: jest.Mock;
    getConfig: jest.Mock;
    upsert: jest.Mock;
  };
  let syncRuns: {
    createJob: jest.Mock;
    getJobView: jest.Mock;
    markRunning: jest.Mock;
    markRetrying: jest.Mock;
    markFailed: jest.Mock;
    markSucceeded: jest.Mock;
    reconcileDataset: jest.Mock;
    appendDatasetSummary: jest.Mock;
  };

  beforeEach(() => {
    glpi = createAdapter('glpi');
    sat = createAdapter('sat');
    nextcloud = createAdapter('nextcloud');
    configs = {
      getAll: jest.fn().mockResolvedValue(new Map()),
      getConfig: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    };
    syncRuns = {
      createJob: jest.fn().mockResolvedValue({
        jobId: 'sync-glpi-1',
        integrationId: 'glpi',
        maxAttempts: 3,
      }),
      getJobView: jest.fn(),
      markRunning: jest.fn().mockResolvedValue(undefined),
      markRetrying: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
      markSucceeded: jest.fn().mockResolvedValue(undefined),
      reconcileDataset: jest.fn().mockResolvedValue({
        processed: 1,
        created: 1,
        updated: 0,
        unchanged: 0,
        deleted: 0,
        failed: 0,
      }),
      appendDatasetSummary: jest.fn().mockResolvedValue(undefined),
    };

    service = new IntegrationsService(
      glpi as never,
      sat as never,
      nextcloud as never,
      createAdapter('whatsapp') as never,
      createAdapter('zimbra') as never,
      createAdapter('outlook') as never,
      configs as never,
      syncRuns as never,
    );
  });

  it('returns masked GLPI config overview without exposing secrets', async () => {
    glpi.getStatus.mockResolvedValue({
      id: 'glpi',
      name: 'GLPI',
      type: 'Helpdesk',
      status: 'connected',
      configured: true,
      features: [],
    });
    configs.getConfig.mockResolvedValue({
      baseUrl: 'https://glpi.example.com',
      username: 'admin',
      appToken: 'secret-app-token',
      userToken: 'secret-user-token',
      password: 'secret-password',
    });

    const overview = await service.getConfigOverview('glpi');

    expect(overview).toEqual({
      integrationId: 'glpi',
      configured: true,
      values: {
        baseUrl: 'https://glpi.example.com',
        username: 'admin',
        authMode: 'user_token',
      },
      secrets: {
        appToken: true,
        userToken: true,
        password: true,
      },
    });
  });

  it('returns masked SAT config overview with secret presence flag', async () => {
    sat.getStatus.mockResolvedValue({
      id: 'sat',
      name: 'SAT ERP',
      type: 'ERP',
      status: 'connected',
      configured: true,
      features: [],
    });
    configs.getConfig.mockResolvedValue({
      apiUrl: 'https://sat.example.com',
      clientId: 'sat-client-id',
      clientSecret: 'sat-secret',
      companyId: 'corp-001',
      syncInvoices: false,
      syncProducts: true,
    });

    const overview = await service.getConfigOverview('sat');

    expect(overview).toEqual({
      integrationId: 'sat',
      configured: true,
      values: {
        baseUrl: 'https://sat.example.com',
        clientId: 'sat-client-id',
        companyId: 'corp-001',
        syncInvoices: false,
        syncProducts: true,
      },
      secrets: {
        clientSecret: true,
      },
    });
  });

  it('returns masked Nextcloud config overview with auth mode and secret flags', async () => {
    nextcloud.getStatus.mockResolvedValue({
      id: 'nextcloud',
      name: 'Nextcloud',
      type: 'Storage',
      status: 'connected',
      configured: true,
      features: [],
    });
    configs.getConfig.mockResolvedValue({
      serverUrl: 'https://cloud.example.com',
      username: 'cloud-admin',
      basePath: '/CRM',
      appPassword: 'app-secret',
      password: '',
    });

    const overview = await service.getConfigOverview('nextcloud');

    expect(overview).toEqual({
      integrationId: 'nextcloud',
      configured: true,
      values: {
        baseUrl: 'https://cloud.example.com',
        username: 'cloud-admin',
        defaultFolder: '/CRM',
        authMode: 'app_password',
      },
      secrets: {
        appPassword: true,
        password: false,
      },
    });
  });

  it('returns masked Zimbra config overview with SMTP settings and secret flags', async () => {
    const zimbra = createAdapter('zimbra');
    zimbra.getStatus.mockResolvedValue({
      id: 'zimbra',
      name: 'Zimbra Mail',
      type: 'Email',
      status: 'connected',
      configured: true,
      features: [],
    });
    configs.getConfig.mockResolvedValue({
      baseUrl: 'https://mail.example.com',
      username: 'zimbra-admin',
      password: 'zimbra-secret',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpSecure: false,
      smtpFrom: 'crm@example.com',
      smtpProfile: 'zimbra',
      smtpPass: 'smtp-secret',
      mockNotifications: true,
    });

    service = new IntegrationsService(
      glpi as never,
      sat as never,
      nextcloud as never,
      createAdapter('whatsapp') as never,
      zimbra as never,
      createAdapter('outlook') as never,
      configs as never,
      syncRuns as never,
    );

    const overview = await service.getConfigOverview('zimbra');

    expect(overview.values).toMatchObject({
      baseUrl: 'https://mail.example.com',
      username: 'zimbra-admin',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpSecure: false,
      smtpFrom: 'crm@example.com',
      smtpProfile: 'zimbra',
      mockNotifications: true,
    });
    expect(overview.secrets).toEqual({
      password: true,
      smtpPass: true,
    });
  });

  it('returns masked Outlook config overview with SMTP settings and secret flags', async () => {
    const outlook = createAdapter('outlook');
    outlook.getStatus.mockResolvedValue({
      id: 'outlook',
      name: 'Microsoft Outlook',
      type: 'Email',
      status: 'connected',
      configured: true,
      features: [],
    });
    configs.getConfig.mockResolvedValue({
      tenantId: 'tenant-001',
      clientId: 'client-001',
      clientSecret: 'client-secret',
      smtpHost: 'smtp.office365.com',
      smtpPort: 587,
      smtpSecure: false,
      smtpFrom: 'crm@example.com',
      smtpProfile: 'outlook',
      smtpPass: 'smtp-secret',
      mockNotifications: false,
    });

    service = new IntegrationsService(
      glpi as never,
      sat as never,
      nextcloud as never,
      createAdapter('whatsapp') as never,
      createAdapter('zimbra') as never,
      outlook as never,
      configs as never,
      syncRuns as never,
    );

    const overview = await service.getConfigOverview('outlook');

    expect(overview.values).toMatchObject({
      tenantId: 'tenant-001',
      clientId: 'client-001',
      smtpHost: 'smtp.office365.com',
      smtpPort: 587,
      smtpSecure: false,
      smtpFrom: 'crm@example.com',
      smtpProfile: 'outlook',
      mockNotifications: false,
    });
    expect(overview.secrets).toEqual({
      clientSecret: true,
      smtpPass: true,
    });
  });

  it('returns masked WhatsApp config overview with secret presence flag', async () => {
    const whatsapp = createAdapter('whatsapp');
    whatsapp.getStatus.mockResolvedValue({
      id: 'whatsapp',
      name: 'WhatsApp Business',
      type: 'Communication',
      status: 'connected',
      configured: true,
      features: [],
    });
    configs.getConfig.mockResolvedValue({
      businessAccountId: '1234567890',
      phoneNumberId: '99887766',
      apiVersion: 'v19.0',
      accessToken: 'wa-secret-token',
    });

    service = new IntegrationsService(
      glpi as never,
      sat as never,
      nextcloud as never,
      whatsapp as never,
      createAdapter('zimbra') as never,
      createAdapter('outlook') as never,
      configs as never,
      syncRuns as never,
    );

    const overview = await service.getConfigOverview('whatsapp');

    expect(overview).toEqual({
      integrationId: 'whatsapp',
      configured: true,
      values: {
        businessAccountId: '1234567890',
        phoneNumberId: '99887766',
        apiVersion: 'v19.0',
      },
      secrets: {
        accessToken: true,
      },
    });
  });

  it('throws NotFoundException when integration id is unknown', async () => {
    await expect(service.getConfigOverview('unknown')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('includes Nextcloud health metadata in checkHealth details', async () => {
    const nextcloudWithHealth = createAdapter('nextcloud') as jest.Mocked<
      IntegrationAdapter
    > & {
      isConfigured: jest.Mock;
      getHealthInfo: jest.Mock;
    };
    nextcloudWithHealth.isConfigured = jest.fn().mockResolvedValue(true);
    nextcloudWithHealth.testConnection.mockResolvedValue(true);
    nextcloudWithHealth.getHealthInfo = jest.fn().mockReturnValue({
      authMode: 'app_password',
      defaultFolder: '/CRM',
      configured: true,
    });

    service = new IntegrationsService(
      glpi as never,
      sat as never,
      nextcloudWithHealth as never,
      createAdapter('whatsapp') as never,
      createAdapter('zimbra') as never,
      createAdapter('outlook') as never,
      configs as never,
      syncRuns as never,
    );

    const health = await service.checkHealth('nextcloud');

    expect(health.status).toBe('healthy');
    expect(health.details.info.nextcloud).toEqual({
      authMode: 'app_password',
      defaultFolder: '/CRM',
      configured: true,
    });
  });

  it('triggers sync job orchestration and returns persisted job id', async () => {
    (glpi.pullSyncSnapshot as jest.Mock).mockResolvedValue([
      {
        recordType: 'tickets',
        records: [{ sourceId: '1', title: 'Ticket 1' }],
        externalIdField: 'sourceId',
      },
    ]);
    syncRuns.createJob.mockResolvedValue({
      jobId: 'sync-glpi-123',
      integrationId: 'glpi',
      maxAttempts: 3,
    });

    const result = await service.triggerSync('glpi');
    await new Promise((resolve) => setImmediate(resolve));

    expect(result).toEqual({
      message: 'Sync initiated for glpi',
      jobId: 'sync-glpi-123',
    });
    expect(syncRuns.createJob).toHaveBeenCalledWith('glpi', 3);
    expect(syncRuns.markRunning).toHaveBeenCalledWith('sync-glpi-123', 1);
    expect(syncRuns.reconcileDataset).toHaveBeenCalledWith(
      'sync-glpi-123',
      'glpi',
      expect.objectContaining({ recordType: 'tickets' }),
    );
    expect(syncRuns.markSucceeded).toHaveBeenCalledWith('sync-glpi-123', 1);
  });

  it('returns persisted sync job view by id', async () => {
    syncRuns.getJobView.mockResolvedValue({
      jobId: 'sync-glpi-123',
      integrationId: 'glpi',
      status: 'succeeded',
      attempt: 1,
      maxAttempts: 3,
      summary: {
        total: {
          processed: 1,
          created: 1,
          updated: 0,
          unchanged: 0,
          deleted: 0,
          failed: 0,
        },
        byType: {},
      },
      createdAt: '2026-02-12T00:00:00.000Z',
      updatedAt: '2026-02-12T00:00:00.000Z',
    });

    const view = await service.getSyncJob('sync-glpi-123');

    expect(syncRuns.getJobView).toHaveBeenCalledWith('sync-glpi-123');
    expect(view.status).toBe('succeeded');
  });
});
