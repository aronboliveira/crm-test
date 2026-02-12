/**
 * Integration Types
 *
 * Type definitions for the integrations module.
 */

/** Possible connection states for an integration. */
export type ConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'pending';

/** Configuration for an integration. */
export interface IntegrationConfig {
  /** Base URL of the external API */
  baseUrl?: string;
  /** API URL alias used by some frontend forms */
  apiUrl?: string;
  /** Server URL alias used by Nextcloud forms */
  serverUrl?: string;
  /** API key or token */
  apiKey?: string;
  /** GLPI application token */
  appToken?: string;
  /** GLPI user token */
  userToken?: string;
  /** OAuth2 client ID */
  clientId?: string;
  /** OAuth2 client secret */
  clientSecret?: string;
  /** OAuth2 tenant ID (for Microsoft) */
  tenantId?: string;
  /** SAT company identifier */
  companyId?: string;
  /** SAT sync invoices flag */
  syncInvoices?: boolean;
  /** SAT sync products flag */
  syncProducts?: boolean;
  /** Username for basic auth */
  username?: string;
  /** Password for basic auth */
  password?: string;
  /** Nextcloud app password (recommended over account password) */
  appPassword?: string;
  /** Nextcloud default folder for CRM files */
  defaultFolder?: string;
  /** Nextcloud default folder alias used in legacy forms */
  basePath?: string;
  /** Nextcloud share sync toggle */
  syncShares?: boolean;
  /** Sync interval in minutes */
  syncIntervalMinutes?: number;
  /** Whether sync is enabled */
  syncEnabled?: boolean;
  /** Custom field mappings */
  fieldMappings?: Record<string, string>;
  /** WhatsApp access token */
  accessToken?: string;
  /** WhatsApp business account ID */
  businessAccountId?: string;
  /** WhatsApp phone number ID */
  phoneNumberId?: string;
  /** WhatsApp API version */
  apiVersion?: string;
  /** SMTP host */
  smtpHost?: string;
  /** SMTP port */
  smtpPort?: number;
  /** SMTP username */
  smtpUser?: string;
  /** SMTP password */
  smtpPass?: string;
  /** SMTP secure (TLS/SSL) */
  smtpSecure?: boolean;
  /** SMTP from address */
  smtpFrom?: string;
  /** SMTP profile name */
  smtpProfile?: 'zimbra' | 'outlook' | 'default';
  /** Enable mock notifications */
  mockNotifications?: boolean;
}

/** Status information for an integration. */
export interface IntegrationStatus {
  /** Unique integration ID */
  id: string;
  /** Display name */
  name: string;
  /** Type/category */
  type: string;
  /** Current connection status */
  status: ConnectionStatus;
  /** Whether the integration is configured */
  configured: boolean;
  /** Last successful sync timestamp */
  lastSyncAt?: string;
  /** Last error message if any */
  lastError?: string;
  /** Available features */
  features: string[];
}

/** Masked configuration snapshot for frontend forms. */
export interface IntegrationConfigOverview {
  /** Integration identifier */
  integrationId: string;
  /** Whether integration is currently considered configured */
  configured: boolean;
  /** Non-sensitive values that can be safely shown in UI */
  values: Record<string, unknown>;
  /** Secret presence flags (true means secret exists in storage) */
  secrets: Record<string, boolean>;
}

/** A typed batch of records produced during an integration sync cycle. */
export interface IntegrationSyncDataset {
  /** Logical record type inside an integration (e.g., tickets, files, invoices). */
  recordType: string;
  /** Mapped records to be reconciled in persistence. */
  records: Array<Record<string, unknown>>;
  /** Optional preferred record field used as external identity key. */
  externalIdField?: string;
  /** Optional identities removed in external system since previous sync. */
  deletedExternalIds?: string[];
}

/** Aggregated counters for sync reconciliation outcomes. */
export interface IntegrationSyncStats {
  processed: number;
  created: number;
  updated: number;
  unchanged: number;
  deleted: number;
  failed: number;
}

/** Persisted sync summary grouped by record type and totals. */
export interface IntegrationSyncSummary {
  total: IntegrationSyncStats;
  byType: Record<string, IntegrationSyncStats>;
}

/** Persisted sync job lifecycle states. */
export type IntegrationSyncJobState =
  | 'queued'
  | 'running'
  | 'retrying'
  | 'succeeded'
  | 'failed';

/** Response payload for sync-job status inspection. */
export interface IntegrationSyncJobView {
  jobId: string;
  integrationId: string;
  status: IntegrationSyncJobState;
  attempt: number;
  maxAttempts: number;
  summary: IntegrationSyncSummary;
  lastError?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Interface for integration adapters. */
export interface IntegrationAdapter {
  /** Gets current status of the integration. */
  getStatus(): Promise<IntegrationStatus>;

  /** Tests connection to the external system. */
  testConnection(): Promise<boolean>;

  /** Updates configuration. */
  configure(config: Partial<IntegrationConfig>): Promise<void>;

  /** Performs a data sync. */
  sync?(): Promise<void | { success: boolean; message: string }>;

  /** Collects mapped sync datasets that can be reconciled/persisted centrally. */
  pullSyncSnapshot?(): Promise<IntegrationSyncDataset[]>;

  /** Optional integration-specific health metadata. */
  getHealthInfo?(): Promise<Record<string, unknown>>;
}
