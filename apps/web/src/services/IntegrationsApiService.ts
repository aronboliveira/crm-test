import ApiClientService from "./ApiClientService";

export type IntegrationConnectionStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "pending";

export interface IntegrationStatusResponse {
  id: string;
  name: string;
  type: string;
  status: IntegrationConnectionStatus;
  configured: boolean;
  lastSyncAt?: string;
  lastError?: string;
  features: string[];
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
}

export interface TriggerSyncResponse {
  message: string;
  jobId: string;
}

export type IntegrationSyncJobState =
  | "queued"
  | "running"
  | "retrying"
  | "succeeded"
  | "failed";

export interface IntegrationSyncStatsResponse {
  processed: number;
  created: number;
  updated: number;
  unchanged: number;
  deleted: number;
  failed: number;
}

export interface IntegrationSyncSummaryResponse {
  total: IntegrationSyncStatsResponse;
  byType: Record<string, IntegrationSyncStatsResponse>;
}

export interface IntegrationSyncJobResponse {
  jobId: string;
  integrationId: string;
  status: IntegrationSyncJobState;
  attempt: number;
  maxAttempts: number;
  summary: IntegrationSyncSummaryResponse;
  lastError?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationConfigOverviewResponse {
  integrationId: string;
  configured: boolean;
  values: Record<string, unknown>;
  secrets: Record<string, boolean>;
}

export type IntegrationHealthStatus = "healthy" | "degraded" | "unhealthy";

export interface IntegrationHealthDetailsResponse {
  configValid: boolean;
  apiReachable: boolean;
  authValid: boolean;
  lastCheck: string;
  errors?: string[];
  warnings?: string[];
  info?: Record<string, unknown>;
}

export interface IntegrationHealthResponse {
  integration: string;
  status: IntegrationHealthStatus;
  configured: boolean;
  connected: boolean;
  details: IntegrationHealthDetailsResponse;
}

export default class IntegrationsApiService {
  static async list(): Promise<IntegrationStatusResponse[]> {
    const response = await ApiClientService.raw.get("/integrations");
    return response.data as IntegrationStatusResponse[];
  }

  static async get(id: string): Promise<IntegrationStatusResponse> {
    const response = await ApiClientService.raw.get(
      `/integrations/${encodeURIComponent(id)}`,
    );
    return response.data as IntegrationStatusResponse;
  }

  static async configure(
    id: string,
    config: Record<string, unknown>,
  ): Promise<IntegrationStatusResponse> {
    const response = await ApiClientService.raw.post(
      `/integrations/${encodeURIComponent(id)}/configure`,
      config,
    );
    return response.data as IntegrationStatusResponse;
  }

  static async getConfigOverview(
    id: string,
  ): Promise<IntegrationConfigOverviewResponse> {
    const response = await ApiClientService.raw.get(
      `/integrations/${encodeURIComponent(id)}/config`,
    );
    return response.data as IntegrationConfigOverviewResponse;
  }

  static async testConnection(id: string): Promise<TestConnectionResponse> {
    const response = await ApiClientService.raw.post(
      `/integrations/${encodeURIComponent(id)}/test`,
    );
    return response.data as TestConnectionResponse;
  }

  static async triggerSync(id: string): Promise<TriggerSyncResponse> {
    const response = await ApiClientService.raw.post(
      `/integrations/${encodeURIComponent(id)}/sync`,
    );
    return response.data as TriggerSyncResponse;
  }

  static async getSyncJob(jobId: string): Promise<IntegrationSyncJobResponse> {
    const response = await ApiClientService.raw.get(
      `/integrations/sync-jobs/${encodeURIComponent(jobId)}`,
    );
    return response.data as IntegrationSyncJobResponse;
  }

  static async checkHealth(id: string): Promise<IntegrationHealthResponse> {
    const response = await ApiClientService.raw.get(
      `/integrations/${encodeURIComponent(id)}/health`,
    );
    return response.data as IntegrationHealthResponse;
  }
}
