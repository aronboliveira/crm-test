/**
 * GLPI API Types
 *
 * Type definitions for GLPI REST API responses and requests.
 * Based on GLPI REST API documentation.
 *
 * @see https://glpi-project.org/documentation/
 */

export interface GlpiSessionResponse {
  session_token: string;
}

export interface GlpiTicket {
  id: number;
  name: string;
  content: string;
  status: GlpiTicketStatus;
  urgency: number;
  impact: number;
  priority: number;
  date_creation: string;
  date_mod: string;
  solvedate?: string;
  closedate?: string;
  entities_id: number;
  users_id_recipient: number;
  users_id_lastupdater: number;
  type: GlpiTicketType;
}

export type GlpiTicketStatus =
  | 1 // New
  | 2 // Processing (assigned)
  | 3 // Processing (planned)
  | 4 // Pending
  | 5 // Solved
  | 6; // Closed

export type GlpiTicketType =
  | 1 // Incident
  | 2; // Request

export interface GlpiUser {
  id: number;
  name: string;
  realname: string;
  firstname: string;
  email?: string;
  phone?: string;
  mobile?: string;
  is_active: boolean;
  entities_id: number;
}

export interface GlpiEntity {
  id: number;
  name: string;
  completename: string;
  entities_id: number;
  comment?: string;
  level: number;
}

export interface GlpiComputer {
  id: number;
  name: string;
  serial: string;
  otherserial?: string;
  contact?: string;
  contact_num?: string;
  entities_id: number;
  is_deleted: boolean;
  is_template: boolean;
}

export interface GlpiApiError {
  error: string;
  message?: string;
}

export interface GlpiPaginatedResponse<T> {
  data: T[];
  totalcount: number;
  count: number;
}

export interface GlpiSearchCriteria {
  field: number;
  searchtype: 'contains' | 'equals' | 'notequals' | 'lessthan' | 'morethan';
  value: string | number;
}

export interface GlpiCreateTicketPayload {
  input: {
    name: string;
    content: string;
    type?: GlpiTicketType;
    urgency?: number;
    impact?: number;
    entities_id?: number;
    users_id_recipient?: number;
    _users_id_assign?: number[];
    _users_id_observer?: number[];
  };
}

export interface GlpiUpdateTicketPayload {
  input: {
    name?: string;
    content?: string;
    status?: GlpiTicketStatus;
    urgency?: number;
    impact?: number;
    solvedate?: string;
  };
}

export const GLPI_TICKET_STATUS_MAP: Record<GlpiTicketStatus, string> = {
  1: 'new',
  2: 'processing_assigned',
  3: 'processing_planned',
  4: 'pending',
  5: 'solved',
  6: 'closed',
};

export const GLPI_TICKET_TYPE_MAP: Record<GlpiTicketType, string> = {
  1: 'incident',
  2: 'request',
};
