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
  /** API key or token */
  apiKey?: string;
  /** OAuth2 client ID */
  clientId?: string;
  /** OAuth2 client secret */
  clientSecret?: string;
  /** OAuth2 tenant ID (for Microsoft) */
  tenantId?: string;
  /** Username for basic auth */
  username?: string;
  /** Password for basic auth */
  password?: string;
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
}
