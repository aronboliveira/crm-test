import type {
  GlpiTicket,
  GlpiUser,
  GlpiEntity,
  GlpiTicketStatus,
} from './glpi.types';
import { GLPI_TICKET_STATUS_MAP, GLPI_TICKET_TYPE_MAP } from './glpi.types';

export interface CrmLead {
  id?: string;
  title: string;
  description: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source?: string;
  sourceId?: string;
  createdAt: Date;
  updatedAt: Date;
  clientId?: string;
  assignedUserId?: string;
}

export interface CrmContact {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  isActive: boolean;
  sourceId?: string;
  source?: string;
}

export interface CrmClient {
  id?: string;
  name: string;
  fullName: string;
  description?: string;
  sourceId?: string;
  source?: string;
}

/**
 * GLPI Data Mapper
 *
 * Transforms data between GLPI API format and CRM entities.
 * Follows Single Responsibility - only handles data transformation.
 */
export class GlpiDataMapper {
  static ticketToCrmLead(ticket: GlpiTicket): CrmLead {
    return {
      title: ticket.name,
      description: ticket.content,
      status: this.mapTicketStatus(ticket.status),
      priority: this.mapPriority(ticket.priority),
      source: 'glpi',
      sourceId: String(ticket.id),
      createdAt: new Date(ticket.date_creation),
      updatedAt: new Date(ticket.date_mod),
    };
  }

  static crmLeadToTicketPayload(lead: CrmLead): {
    input: {
      name: string;
      content: string;
      urgency?: number;
      impact?: number;
      type?: 1 | 2;
    };
  } {
    return {
      input: {
        name: lead.title,
        content: lead.description,
        urgency: this.mapCrmPriorityToUrgency(lead.priority),
        impact: this.mapCrmPriorityToImpact(lead.priority),
        type: 2,
      },
    };
  }

  static userToCrmContact(user: GlpiUser): CrmContact {
    return {
      firstName: user.firstname || '',
      lastName: user.realname || user.name,
      email: user.email,
      phone: user.phone,
      mobile: user.mobile,
      isActive: user.is_active,
      sourceId: String(user.id),
      source: 'glpi',
    };
  }

  static entityToCrmClient(entity: GlpiEntity): CrmClient {
    return {
      name: entity.name,
      fullName: entity.completename,
      description: entity.comment,
      sourceId: String(entity.id),
      source: 'glpi',
    };
  }

  private static mapTicketStatus(status: GlpiTicketStatus): string {
    const statusMap: Record<number, string> = {
      1: 'new',
      2: 'in_progress',
      3: 'in_progress',
      4: 'pending',
      5: 'resolved',
      6: 'closed',
    };
    return statusMap[status] || 'unknown';
  }

  private static mapPriority(
    priority: number,
  ): 'low' | 'medium' | 'high' | 'urgent' {
    if (priority <= 2) return 'low';
    if (priority <= 3) return 'medium';
    if (priority <= 4) return 'high';
    return 'urgent';
  }

  private static mapCrmPriorityToUrgency(
    priority: 'low' | 'medium' | 'high' | 'urgent',
  ): number {
    const map = { low: 1, medium: 3, high: 4, urgent: 5 };
    return map[priority];
  }

  private static mapCrmPriorityToImpact(
    priority: 'low' | 'medium' | 'high' | 'urgent',
  ): number {
    const map = { low: 1, medium: 3, high: 4, urgent: 5 };
    return map[priority];
  }

  static mapCrmStatusToGlpiStatus(
    status: string,
  ): GlpiTicketStatus | undefined {
    const map: Record<string, GlpiTicketStatus> = {
      new: 1,
      in_progress: 2,
      pending: 4,
      resolved: 5,
      closed: 6,
    };
    return map[status];
  }
}
