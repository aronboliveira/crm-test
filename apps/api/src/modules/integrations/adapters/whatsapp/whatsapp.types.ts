/**
 * WhatsApp Business API Types
 *
 * Type definitions for WhatsApp Business API responses and requests.
 * This integration focuses on:
 * - Message template storage (with WhatsApp formatting)
 * - Analytics data reading from Meta's API
 * - Message statistics aggregation
 *
 * @remarks
 * This is a READ-ONLY integration for data analysis.
 * Templates are stored locally for copy-paste usage.
 * Based on Meta's WhatsApp Business Platform API.
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** WhatsApp message template status */
export const WHATSAPP_TEMPLATE_STATUS = {
  APPROVED: 'APPROVED',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
  PAUSED: 'PAUSED',
  DISABLED: 'DISABLED',
  IN_APPEAL: 'IN_APPEAL',
  PENDING_DELETION: 'PENDING_DELETION',
  DELETED: 'DELETED',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
} as const;

export type WhatsAppTemplateStatus =
  (typeof WHATSAPP_TEMPLATE_STATUS)[keyof typeof WHATSAPP_TEMPLATE_STATUS];

/** WhatsApp template categories */
export const WHATSAPP_TEMPLATE_CATEGORY = {
  UTILITY: 'UTILITY',
  MARKETING: 'MARKETING',
  AUTHENTICATION: 'AUTHENTICATION',
} as const;

export type WhatsAppTemplateCategory =
  (typeof WHATSAPP_TEMPLATE_CATEGORY)[keyof typeof WHATSAPP_TEMPLATE_CATEGORY];

/** WhatsApp template component types */
export const WHATSAPP_COMPONENT_TYPE = {
  HEADER: 'HEADER',
  BODY: 'BODY',
  FOOTER: 'FOOTER',
  BUTTONS: 'BUTTONS',
} as const;

export type WhatsAppComponentType =
  (typeof WHATSAPP_COMPONENT_TYPE)[keyof typeof WHATSAPP_COMPONENT_TYPE];

/** WhatsApp button types */
export const WHATSAPP_BUTTON_TYPE = {
  QUICK_REPLY: 'QUICK_REPLY',
  URL: 'URL',
  PHONE_NUMBER: 'PHONE_NUMBER',
  COPY_CODE: 'COPY_CODE',
  FLOW: 'FLOW',
} as const;

export type WhatsAppButtonType =
  (typeof WHATSAPP_BUTTON_TYPE)[keyof typeof WHATSAPP_BUTTON_TYPE];

/** WhatsApp header format types */
export const WHATSAPP_HEADER_FORMAT = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  DOCUMENT: 'DOCUMENT',
  LOCATION: 'LOCATION',
} as const;

export type WhatsAppHeaderFormat =
  (typeof WHATSAPP_HEADER_FORMAT)[keyof typeof WHATSAPP_HEADER_FORMAT];

/** WhatsApp message types for analytics */
export const WHATSAPP_MESSAGE_TYPE = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  STICKER: 'sticker',
  LOCATION: 'location',
  CONTACTS: 'contacts',
  INTERACTIVE: 'interactive',
  TEMPLATE: 'template',
  REACTION: 'reaction',
  UNKNOWN: 'unknown',
} as const;

export type WhatsAppMessageType =
  (typeof WHATSAPP_MESSAGE_TYPE)[keyof typeof WHATSAPP_MESSAGE_TYPE];

/** WhatsApp conversation types for analytics */
export const WHATSAPP_CONVERSATION_TYPE = {
  UTILITY: 'utility',
  AUTHENTICATION: 'authentication',
  MARKETING: 'marketing',
  SERVICE: 'service',
  REFERRAL_CONVERSION: 'referral_conversion',
} as const;

export type WhatsAppConversationType =
  (typeof WHATSAPP_CONVERSATION_TYPE)[keyof typeof WHATSAPP_CONVERSATION_TYPE];

/** WhatsApp formatting characters for templates */
export const WHATSAPP_FORMAT_CHARS = {
  BOLD: '*',
  ITALIC: '_',
  STRIKETHROUGH: '~',
  MONOSPACE: '```',
  INLINE_CODE: '`',
  QUOTE: '>',
  BULLET: '•',
  NEWLINE: '\n',
  VARIABLE_START: '{{',
  VARIABLE_END: '}}',
} as const;

// =============================================================================
// API INTERFACES - Templates
// =============================================================================

/** WhatsApp template button */
export interface WhatsAppTemplateButton {
  type: WhatsAppButtonType;
  text: string;
  url?: string;
  phone_number?: string;
  example?: string[];
}

/** WhatsApp template component */
export interface WhatsAppTemplateComponent {
  type: WhatsAppComponentType;
  format?: WhatsAppHeaderFormat;
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
    header_handle?: string[];
  };
  buttons?: WhatsAppTemplateButton[];
}

/** WhatsApp message template from Meta API */
export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  status: WhatsAppTemplateStatus;
  category: WhatsAppTemplateCategory;
  components: WhatsAppTemplateComponent[];
  quality_score?: {
    score: string;
    date: number;
  };
  rejected_reason?: string;
  previous_category?: string;
}

/** Local template storage format (for copy-paste) */
export interface LocalWhatsAppTemplate {
  id: string;
  externalId?: string;
  name: string;
  language: string;
  category: WhatsAppTemplateCategory;
  status: WhatsAppTemplateStatus;
  headerText?: string;
  headerFormat?: WhatsAppHeaderFormat;
  bodyText: string;
  footerText?: string;
  buttons?: WhatsAppTemplateButton[];
  variables: string[];
  formattedPreview: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  usageCount: number;
  lastUsedAt?: string;
}

// =============================================================================
// API INTERFACES - Analytics
// =============================================================================

/** WhatsApp analytics granularity */
export type WhatsAppAnalyticsGranularity = 'HALF_HOUR' | 'DAY' | 'MONTH';

/** WhatsApp conversation analytics data point */
export interface WhatsAppConversationAnalytics {
  start: number;
  end: number;
  conversation: number;
  conversation_type: WhatsAppConversationType;
  conversation_direction: 'INBOUND' | 'OUTBOUND';
  cost: number;
  country_code?: string;
}

/** WhatsApp message analytics data point */
export interface WhatsAppMessageAnalytics {
  start: number;
  end: number;
  sent: number;
  delivered: number;
  read?: number;
  phone_number?: string;
  country_code?: string;
}

/** WhatsApp template analytics */
export interface WhatsAppTemplateAnalytics {
  template_id: string;
  template_name: string;
  sent: number;
  delivered: number;
  read: number;
  clicked?: number;
  replied?: number;
  start: number;
  end: number;
}

/** WhatsApp business phone number info */
export interface WhatsAppPhoneNumberInfo {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: 'GREEN' | 'YELLOW' | 'RED' | 'NA';
  messaging_limit_tier?: string;
  status:
    | 'CONNECTED'
    | 'DISCONNECTED'
    | 'FLAGGED'
    | 'RATE_LIMITED'
    | 'RESTRICTED';
  code_verification_status?: 'VERIFIED' | 'NOT_VERIFIED' | 'EXPIRED';
  name_status?: 'APPROVED' | 'PENDING' | 'DECLINED' | 'EXPIRED';
  new_name_status?: string;
}

/** WhatsApp Business Account info */
export interface WhatsAppBusinessAccount {
  id: string;
  name: string;
  timezone_id: string;
  message_template_namespace: string;
  account_review_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  business_verification_status?: 'verified' | 'not_verified';
  phone_numbers?: WhatsAppPhoneNumberInfo[];
}

/** Aggregated analytics summary */
export interface WhatsAppAnalyticsSummary {
  period: {
    start: string;
    end: string;
    granularity: WhatsAppAnalyticsGranularity;
  };
  messages: {
    total_sent: number;
    total_delivered: number;
    total_read: number;
    delivery_rate: number;
    read_rate: number;
  };
  conversations: {
    total: number;
    by_type: Record<WhatsAppConversationType, number>;
    total_cost: number;
    cost_by_type: Record<WhatsAppConversationType, number>;
  };
  templates: {
    total_sent: number;
    most_used: { name: string; count: number }[];
    best_performing: { name: string; read_rate: number }[];
  };
}

// =============================================================================
// API INTERFACES - Query Parameters
// =============================================================================

/** Query parameters for template listing */
export interface WhatsAppTemplateQueryParams {
  limit?: number;
  after?: string;
  before?: string;
  status?: WhatsAppTemplateStatus;
  category?: WhatsAppTemplateCategory;
  name_or_content?: string;
  language?: string;
}

/** Query parameters for analytics */
export interface WhatsAppAnalyticsQueryParams {
  start: number; // Unix timestamp
  end: number; // Unix timestamp
  granularity: WhatsAppAnalyticsGranularity;
  phone_numbers?: string[];
  country_codes?: string[];
  template_ids?: string[];
}

/** Query parameters for local templates */
export interface LocalTemplateQueryParams {
  category?: WhatsAppTemplateCategory;
  status?: WhatsAppTemplateStatus;
  language?: string;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'usageCount';
  sortOrder?: 'asc' | 'desc';
}

// =============================================================================
// API INTERFACES - Responses
// =============================================================================

/** Meta API paginated response */
export interface MetaApiPaginatedResponse<T> {
  data: T[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
}

/** Meta API analytics response */
export interface MetaApiAnalyticsResponse {
  data: WhatsAppConversationAnalytics[] | WhatsAppMessageAnalytics[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
  };
}

/** WhatsApp config interface */
export interface WhatsAppConfig {
  accessToken: string;
  businessAccountId: string;
  phoneNumberId?: string;
  apiVersion?: string; // e.g., 'v18.0'
}

// =============================================================================
// LOCAL STORAGE INTERFACES
// =============================================================================

/** Template folder/organization */
export interface TemplateFolder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  templateIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** Template usage log */
export interface TemplateUsageLog {
  id: string;
  templateId: string;
  usedAt: string;
  usedBy?: string;
  context?: string;
  variables?: Record<string, string>;
}
