/**
 * WhatsApp Integration Module Exports
 *
 * @module integrations/adapters/whatsapp
 */

// Types
export * from './whatsapp.types';

// API Client
export { WhatsAppApiClient } from './whatsapp-api.client';

// Data Mapper
export {
  WhatsAppDataMapper,
  WhatsAppFormatter,
  type CrmMessageTemplate,
  type CrmAnalyticsReport,
  type CrmConversationRecord,
} from './whatsapp-data.mapper';

// Adapter
export { WhatsAppAdapter } from './whatsapp.adapter';
