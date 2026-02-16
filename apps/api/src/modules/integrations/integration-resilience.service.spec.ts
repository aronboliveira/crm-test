import { IntegrationResilienceService } from './integration-resilience.service';

describe('IntegrationResilienceService', () => {
  let service: IntegrationResilienceService;

  beforeEach(() => {
    service = new IntegrationResilienceService();
  });

  it('executes action successfully through circuit breaker', async () => {
    const result = await service.execute(
      {
        integrationId: 'nextcloud',
        operation: 'testConnection',
        timeoutMs: 5000,
      },
      async () => true,
    );

    expect(result).toBe(true);
  });

  it('retries transient failures and succeeds', async () => {
    let calls = 0;

    const result = await service.execute(
      {
        integrationId: 'nextcloud',
        operation: 'sync',
        timeoutMs: 5000,
        maxRetries: 2,
        baseDelayMs: 1,
        maxDelayMs: 2,
      },
      async () => {
        calls += 1;
        if (calls < 2) {
          const err = new Error('Temporary network issue');
          throw err;
        }
        return 'ok';
      },
    );

    expect(result).toBe('ok');
    expect(calls).toBe(2);
  });

  it('does not retry non-retriable 4xx errors', async () => {
    let calls = 0;

    await expect(
      service.execute(
        {
          integrationId: 'sat',
          operation: 'pullSyncSnapshot',
          maxRetries: 3,
          baseDelayMs: 1,
          maxDelayMs: 2,
        },
        async () => {
          calls += 1;
          throw {
            response: {
              status: 401,
            },
            message: 'Unauthorized',
          };
        },
      ),
    ).rejects.toBeDefined();

    expect(calls).toBe(1);
  });

  it('should apply operation policy defaults when retry options are omitted', async () => {
    const err = Object.assign(new Error('service down'), { status: 503 });
    const action = jest.fn().mockRejectedValue(err);

    await expect(
      service.execute(
        {
          integrationId: 'integration-policy',
          operation: 'healthCheck',
          baseDelayMs: 100,
          maxDelayMs: 500,
        },
        action,
      ),
    ).rejects.toThrow('service down');

    expect(action).toHaveBeenCalledTimes(2);
  });

  it('reports resilience snapshots for an integration', async () => {
    await service.execute(
      {
        integrationId: 'outlook',
        operation: 'healthCheck',
      },
      async () => true,
    );

    const snapshots = service.getIntegrationSnapshot('outlook');

    expect(snapshots.length).toBe(1);
    expect(snapshots[0]).toEqual(
      expect.objectContaining({
        key: 'outlook:healthCheck',
        integrationId: 'outlook',
        operation: 'healthCheck',
        state: expect.any(String),
      }),
    );
  });
});
