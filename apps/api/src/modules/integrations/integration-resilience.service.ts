import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';

type ResilienceAction<T> = () => Promise<T>;

type BreakerState = 'open' | 'closed' | 'halfOpen';

export interface ResilienceExecutionOptions {
  integrationId: string;
  operation: string;
  timeoutMs?: number;
  resetTimeoutMs?: number;
  errorThresholdPercentage?: number;
  volumeThreshold?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export interface ResilienceSnapshot {
  key: string;
  integrationId: string;
  operation: string;
  state: BreakerState;
  fires: number;
  failures: number;
  successes: number;
  rejects: number;
  timeouts: number;
}

type ResiliencePolicy = Readonly<{
  timeoutMs: number;
  resetTimeoutMs: number;
  errorThresholdPercentage: number;
  volumeThreshold: number;
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}>;

const DEFAULT_POLICY: ResiliencePolicy = {
  timeoutMs: 10_000,
  resetTimeoutMs: 30_000,
  errorThresholdPercentage: 50,
  volumeThreshold: 5,
  maxRetries: 2,
  baseDelayMs: 300,
  maxDelayMs: 8_000,
};

const OPERATION_POLICY_OVERRIDES: Readonly<
  Record<string, Partial<ResiliencePolicy>>
> = {
  testConnection: {
    timeoutMs: 15_000,
    maxRetries: 1,
    baseDelayMs: 250,
  },
  healthCheck: {
    timeoutMs: 12_000,
    maxRetries: 1,
  },
  pullSyncSnapshot: {
    timeoutMs: 30_000,
    maxRetries: 1,
    baseDelayMs: 700,
    maxDelayMs: 10_000,
  },
  sync: {
    timeoutMs: 45_000,
    maxRetries: 1,
    baseDelayMs: 1_000,
    maxDelayMs: 12_000,
  },
};

@Injectable()
export class IntegrationResilienceService {
  private readonly logger = new Logger(IntegrationResilienceService.name);
  private readonly breakers = new Map<
    string,
    {
      integrationId: string;
      operation: string;
      breaker: CircuitBreaker<[ResilienceAction<unknown>], unknown>;
    }
  >();

  async execute<T>(
    options: ResilienceExecutionOptions,
    action: ResilienceAction<T>,
  ): Promise<T> {
    const resolved = this.resolvePolicy(options);
    const breaker = this.getOrCreateBreaker(resolved);
    const retries = this.toSafeInt(resolved.maxRetries, 2, 0, 5);
    const baseDelayMs = this.toSafeInt(resolved.baseDelayMs, 300, 100, 2_000);
    const maxDelayMs = this.toSafeInt(resolved.maxDelayMs, 8_000, 500, 20_000);

    let attempt = 0;
    while (attempt <= retries) {
      try {
        return (await breaker.fire(action)) as T;
      } catch (error) {
        if (!this.shouldRetry(error) || attempt >= retries) {
          throw error;
        }

        const delayMs = this.calculateBackoffDelay(
          attempt + 1,
          baseDelayMs,
          maxDelayMs,
        );

        this.logger.warn(
          `Retrying integration call (${resolved.integrationId}:${resolved.operation}) attempt ${attempt + 2}/${retries + 1} in ${delayMs}ms`,
        );

        await this.sleep(delayMs);
        attempt += 1;
      }
    }

    throw new Error('Unexpected resilience execution flow');
  }

  getIntegrationSnapshot(integrationId: string): ResilienceSnapshot[] {
    return [...this.breakers.values()]
      .filter((entry) => entry.integrationId === integrationId)
      .map((entry) => this.toSnapshot(entry));
  }

  private toSnapshot(entry: {
    integrationId: string;
    operation: string;
    breaker: CircuitBreaker<[ResilienceAction<unknown>], unknown>;
  }): ResilienceSnapshot {
    const stats = entry.breaker.stats;
    return {
      key: `${entry.integrationId}:${entry.operation}`,
      integrationId: entry.integrationId,
      operation: entry.operation,
      state: this.getBreakerState(entry.breaker),
      fires: stats.fires,
      failures: stats.failures,
      successes: stats.successes,
      rejects: stats.rejects,
      timeouts: stats.timeouts,
    };
  }

  private getBreakerState(
    breaker: CircuitBreaker<[ResilienceAction<unknown>], unknown>,
  ): BreakerState {
    if (breaker.opened) {
      return 'open';
    }
    if (breaker.halfOpen) {
      return 'halfOpen';
    }
    return 'closed';
  }

  private getOrCreateBreaker(options: ResilienceExecutionOptions) {
    const key = `${options.integrationId}:${options.operation}`;
    const existing = this.breakers.get(key);
    if (existing) {
      return existing.breaker;
    }

    const timeoutMs = this.toSafeInt(options.timeoutMs, 10_000, 1_000, 60_000);
    const resetTimeoutMs = this.toSafeInt(
      options.resetTimeoutMs,
      30_000,
      5_000,
      120_000,
    );
    const errorThresholdPercentage = this.toSafeInt(
      options.errorThresholdPercentage,
      50,
      10,
      100,
    );
    const volumeThreshold = this.toSafeInt(options.volumeThreshold, 5, 1, 50);

    const breaker = new CircuitBreaker(
      async (run: ResilienceAction<unknown>) => run(),
      {
        timeout: timeoutMs,
        resetTimeout: resetTimeoutMs,
        errorThresholdPercentage,
        volumeThreshold,
      },
    );

    breaker.on('open', () => {
      this.logger.warn(
        `Circuit opened for integration ${options.integrationId} (${options.operation})`,
      );
    });

    breaker.on('halfOpen', () => {
      this.logger.log(
        `Circuit half-open for integration ${options.integrationId} (${options.operation})`,
      );
    });

    breaker.on('close', () => {
      this.logger.log(
        `Circuit closed for integration ${options.integrationId} (${options.operation})`,
      );
    });

    this.breakers.set(key, {
      integrationId: options.integrationId,
      operation: options.operation,
      breaker,
    });

    return breaker;
  }

  private resolvePolicy(
    options: ResilienceExecutionOptions,
  ): ResilienceExecutionOptions {
    const operationPolicy = OPERATION_POLICY_OVERRIDES[options.operation] ?? {};

    return {
      integrationId: options.integrationId,
      operation: options.operation,
      timeoutMs:
        options.timeoutMs ??
        operationPolicy.timeoutMs ??
        DEFAULT_POLICY.timeoutMs,
      resetTimeoutMs:
        options.resetTimeoutMs ??
        operationPolicy.resetTimeoutMs ??
        DEFAULT_POLICY.resetTimeoutMs,
      errorThresholdPercentage:
        options.errorThresholdPercentage ??
        operationPolicy.errorThresholdPercentage ??
        DEFAULT_POLICY.errorThresholdPercentage,
      volumeThreshold:
        options.volumeThreshold ??
        operationPolicy.volumeThreshold ??
        DEFAULT_POLICY.volumeThreshold,
      maxRetries:
        options.maxRetries ??
        operationPolicy.maxRetries ??
        DEFAULT_POLICY.maxRetries,
      baseDelayMs:
        options.baseDelayMs ??
        operationPolicy.baseDelayMs ??
        DEFAULT_POLICY.baseDelayMs,
      maxDelayMs:
        options.maxDelayMs ??
        operationPolicy.maxDelayMs ??
        DEFAULT_POLICY.maxDelayMs,
    };
  }

  private shouldRetry(error: unknown): boolean {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error);

    if (
      message.includes('breaker is open') ||
      message.includes('eopenbreaker')
    ) {
      return false;
    }

    const status = this.getStatusCode(error);
    if (status !== null && status >= 400 && status < 500) {
      return status === 408 || status === 429;
    }

    return true;
  }

  private getStatusCode(error: unknown): number | null {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const candidate = error as {
      status?: unknown;
      response?: { status?: unknown };
    };

    const status =
      typeof candidate.status === 'number'
        ? candidate.status
        : typeof candidate.response?.status === 'number'
          ? candidate.response.status
          : null;

    return status;
  }

  private calculateBackoffDelay(
    attempt: number,
    baseDelayMs: number,
    maxDelayMs: number,
  ): number {
    const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
    const jitter = Math.floor(Math.random() * Math.max(50, baseDelayMs));
    return Math.min(maxDelayMs, exponential + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private toSafeInt(
    value: unknown,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const parsed =
      typeof value === 'number'
        ? Math.trunc(value)
        : typeof value === 'string'
          ? Number.parseInt(value, 10)
          : fallback;

    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, parsed));
  }
}
