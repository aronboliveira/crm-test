/**
 * WhatsApp Data Mapper
 *
 * Maps between WhatsApp/Meta API data structures and CRM entities.
 * Handles:
 * - Template conversion and formatting
 * - Analytics data aggregation
 * - WhatsApp special character formatting
 *
 * @remarks
 * WhatsApp uses special formatting characters:
 * - *bold*
 * - _italic_
 * - ~strikethrough~
 * - ```monospace```
 * - `inline code`
 * - > quote (at line start)
 * - • bullet point
 * - {{1}} variable placeholders
 */

import {
  WHATSAPP_FORMAT_CHARS,
  WHATSAPP_TEMPLATE_STATUS,
  WHATSAPP_COMPONENT_TYPE,
  type WhatsAppTemplate,
  type WhatsAppTemplateComponent,
  type WhatsAppTemplateButton,
  type LocalWhatsAppTemplate,
  type WhatsAppConversationAnalytics,
  type WhatsAppMessageAnalytics,
  type WhatsAppTemplateAnalytics,
  type WhatsAppAnalyticsSummary,
  type WhatsAppAnalyticsGranularity,
  type WhatsAppConversationType,
  type WhatsAppHeaderFormat,
  type WhatsAppTemplateCategory,
  type WhatsAppTemplateStatus,
} from './whatsapp.types';

// =============================================================================
// CRM TYPES (Local definitions for this mapper)
// =============================================================================

/** CRM message template representation */
export interface CrmMessageTemplate {
  id: string;
  externalId?: string;
  name: string;
  channel: 'whatsapp' | 'sms' | 'email';
  language: string;
  category: string;
  status: string;
  subject?: string;
  content: string;
  preview: string;
  variables: string[];
  metadata: {
    headerFormat?: string;
    headerText?: string;
    footerText?: string;
    buttons?: Array<{
      type: string;
      text: string;
      action?: string;
    }>;
  };
  tags: string[];
  usageStats: {
    timesUsed: number;
    lastUsedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/** CRM analytics report */
export interface CrmAnalyticsReport {
  id: string;
  reportType:
    | 'whatsapp_summary'
    | 'whatsapp_messages'
    | 'whatsapp_conversations';
  period: {
    start: string;
    end: string;
  };
  generatedAt: string;
  data: Record<string, unknown>;
  summary: {
    totalMessages?: number;
    deliveryRate?: number;
    readRate?: number;
    totalConversations?: number;
    totalCost?: number;
  };
}

/** CRM conversation record */
export interface CrmConversationRecord {
  id: string;
  channel: 'whatsapp';
  type: string;
  direction: 'inbound' | 'outbound';
  startedAt: string;
  endedAt: string;
  cost?: number;
  countryCode?: string;
}

// =============================================================================
// TEXT FORMATTING UTILITIES
// =============================================================================

export class WhatsAppFormatter {
  /**
   * Apply bold formatting to text
   */
  static bold(text: string): string {
    return `${WHATSAPP_FORMAT_CHARS.BOLD}${text}${WHATSAPP_FORMAT_CHARS.BOLD}`;
  }

  /**
   * Apply italic formatting to text
   */
  static italic(text: string): string {
    return `${WHATSAPP_FORMAT_CHARS.ITALIC}${text}${WHATSAPP_FORMAT_CHARS.ITALIC}`;
  }

  /**
   * Apply strikethrough formatting to text
   */
  static strikethrough(text: string): string {
    return `${WHATSAPP_FORMAT_CHARS.STRIKETHROUGH}${text}${WHATSAPP_FORMAT_CHARS.STRIKETHROUGH}`;
  }

  /**
   * Apply monospace (code block) formatting to text
   */
  static monospace(text: string): string {
    return `${WHATSAPP_FORMAT_CHARS.MONOSPACE}${text}${WHATSAPP_FORMAT_CHARS.MONOSPACE}`;
  }

  /**
   * Apply inline code formatting to text
   */
  static inlineCode(text: string): string {
    return `${WHATSAPP_FORMAT_CHARS.INLINE_CODE}${text}${WHATSAPP_FORMAT_CHARS.INLINE_CODE}`;
  }

  /**
   * Apply quote formatting to text (each line)
   */
  static quote(text: string): string {
    return text
      .split('\n')
      .map((line) => `${WHATSAPP_FORMAT_CHARS.QUOTE} ${line}`)
      .join('\n');
  }

  /**
   * Create a bullet point list
   */
  static bulletList(items: string[]): string {
    return items
      .map((item) => `${WHATSAPP_FORMAT_CHARS.BULLET} ${item}`)
      .join('\n');
  }

  /**
   * Create a numbered list
   */
  static numberedList(items: string[]): string {
    return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
  }

  /**
   * Create a variable placeholder
   */
  static variable(index: number): string {
    return `${WHATSAPP_FORMAT_CHARS.VARIABLE_START}${index}${WHATSAPP_FORMAT_CHARS.VARIABLE_END}`;
  }

  /**
   * Extract variables from template text
   */
  static extractVariables(text: string): string[] {
    const regex = /\{\{(\d+)\}\}/g;
    const variables: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const varName = `var_${match[1]}`;
      if (!variables.includes(varName)) {
        variables.push(varName);
      }
    }

    return variables.sort((a, b) => {
      const numA = parseInt(a.split('_')[1], 10);
      const numB = parseInt(b.split('_')[1], 10);
      return numA - numB;
    });
  }

  /**
   * Replace variables in template with actual values
   */
  static replaceVariables(
    template: string,
    values: Record<string, string>,
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(values)) {
      const index = key.replace('var_', '');
      result = result.replace(`{{${index}}}`, value);
    }

    return result;
  }

  /**
   * Strip all WhatsApp formatting from text (for plain text preview)
   */
  static stripFormatting(text: string): string {
    return text
      .replace(/\*([^*]+)\*/g, '$1') // bold
      .replace(/_([^_]+)_/g, '$1') // italic
      .replace(/~([^~]+)~/g, '$1') // strikethrough
      .replace(/```([^`]+)```/g, '$1') // monospace
      .replace(/`([^`]+)`/g, '$1') // inline code
      .replace(/^> /gm, '') // quote
      .replace(/^• /gm, ''); // bullet
  }
}

// =============================================================================
// DATA MAPPER
// =============================================================================

export class WhatsAppDataMapper {
  // ===========================================================================
  // TEMPLATE MAPPING
  // ===========================================================================

  /**
   * Convert Meta API template to local storage format
   */
  static templateToLocalTemplate(
    template: WhatsAppTemplate,
  ): LocalWhatsAppTemplate {
    const headerComponent = template.components.find(
      (c) => c.type === WHATSAPP_COMPONENT_TYPE.HEADER,
    );
    const bodyComponent = template.components.find(
      (c) => c.type === WHATSAPP_COMPONENT_TYPE.BODY,
    );
    const footerComponent = template.components.find(
      (c) => c.type === WHATSAPP_COMPONENT_TYPE.FOOTER,
    );
    const buttonsComponent = template.components.find(
      (c) => c.type === WHATSAPP_COMPONENT_TYPE.BUTTONS,
    );

    const bodyText = bodyComponent?.text || '';
    const variables = WhatsAppFormatter.extractVariables(bodyText);

    // Build formatted preview
    const previewParts: string[] = [];
    if (headerComponent?.text) {
      previewParts.push(WhatsAppFormatter.bold(headerComponent.text));
      previewParts.push('');
    }
    previewParts.push(bodyText);
    if (footerComponent?.text) {
      previewParts.push('');
      previewParts.push(WhatsAppFormatter.italic(footerComponent.text));
    }

    const now = new Date().toISOString();

    return {
      id: `local_${template.id}`,
      externalId: template.id,
      name: template.name,
      language: template.language,
      category: template.category,
      status: template.status,
      headerText: headerComponent?.text,
      headerFormat: headerComponent?.format,
      bodyText,
      footerText: footerComponent?.text,
      buttons: buttonsComponent?.buttons,
      variables,
      formattedPreview: previewParts.join('\n'),
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    };
  }

  /**
   * Convert local template to CRM message template
   */
  static localTemplateToCrmTemplate(
    local: LocalWhatsAppTemplate,
  ): CrmMessageTemplate {
    return {
      id: local.id,
      externalId: local.externalId,
      name: local.name,
      channel: 'whatsapp',
      language: local.language,
      category: local.category,
      status: this.mapTemplateStatusToCrm(local.status),
      content: local.bodyText,
      preview: local.formattedPreview,
      variables: local.variables,
      metadata: {
        headerFormat: local.headerFormat,
        headerText: local.headerText,
        footerText: local.footerText,
        buttons: local.buttons?.map((btn) => ({
          type: btn.type,
          text: btn.text,
          action: btn.url || btn.phone_number,
        })),
      },
      tags: local.tags || [],
      usageStats: {
        timesUsed: local.usageCount,
        lastUsedAt: local.lastUsedAt,
      },
      createdAt: local.createdAt,
      updatedAt: local.updatedAt,
      createdBy: local.createdBy,
    };
  }

  /**
   * Convert multiple templates
   */
  static templatesToLocalTemplates(
    templates: WhatsAppTemplate[],
  ): LocalWhatsAppTemplate[] {
    return templates.map((t) => this.templateToLocalTemplate(t));
  }

  /**
   * Convert multiple local templates to CRM format
   */
  static localTemplatesToCrmTemplates(
    locals: LocalWhatsAppTemplate[],
  ): CrmMessageTemplate[] {
    return locals.map((l) => this.localTemplateToCrmTemplate(l));
  }

  /**
   * Create a new local template from scratch
   */
  static createLocalTemplate(input: {
    name: string;
    language: string;
    category: WhatsAppTemplateCategory;
    headerText?: string;
    headerFormat?: WhatsAppHeaderFormat;
    bodyText: string;
    footerText?: string;
    buttons?: WhatsAppTemplateButton[];
    tags?: string[];
    createdBy?: string;
  }): LocalWhatsAppTemplate {
    const now = new Date().toISOString();
    const variables = WhatsAppFormatter.extractVariables(input.bodyText);

    // Build formatted preview
    const previewParts: string[] = [];
    if (input.headerText) {
      previewParts.push(WhatsAppFormatter.bold(input.headerText));
      previewParts.push('');
    }
    previewParts.push(input.bodyText);
    if (input.footerText) {
      previewParts.push('');
      previewParts.push(WhatsAppFormatter.italic(input.footerText));
    }

    return {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: input.name,
      language: input.language,
      category: input.category,
      status: WHATSAPP_TEMPLATE_STATUS.APPROVED, // Local templates are always "approved"
      headerText: input.headerText,
      headerFormat: input.headerFormat,
      bodyText: input.bodyText,
      footerText: input.footerText,
      buttons: input.buttons,
      variables,
      formattedPreview: previewParts.join('\n'),
      tags: input.tags,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
      usageCount: 0,
    };
  }

  // ===========================================================================
  // ANALYTICS MAPPING
  // ===========================================================================

  /**
   * Convert conversation analytics to CRM records
   */
  static conversationAnalyticsToCrmRecords(
    analytics: WhatsAppConversationAnalytics[],
  ): CrmConversationRecord[] {
    return analytics.map((item, index) => ({
      id: `wa_conv_${item.start}_${index}`,
      channel: 'whatsapp' as const,
      type: item.conversation_type,
      direction: item.conversation_direction.toLowerCase() as
        | 'inbound'
        | 'outbound',
      startedAt: new Date(item.start * 1000).toISOString(),
      endedAt: new Date(item.end * 1000).toISOString(),
      cost: item.cost,
      countryCode: item.country_code,
    }));
  }

  /**
   * Aggregate analytics into summary report
   */
  static aggregateAnalytics(
    messages: WhatsAppMessageAnalytics[],
    conversations: WhatsAppConversationAnalytics[],
    templates: WhatsAppTemplateAnalytics[],
    granularity: WhatsAppAnalyticsGranularity,
  ): WhatsAppAnalyticsSummary {
    // Message totals
    const totalSent = messages.reduce((sum, m) => sum + m.sent, 0);
    const totalDelivered = messages.reduce((sum, m) => sum + m.delivered, 0);
    const totalRead = messages.reduce((sum, m) => sum + (m.read || 0), 0);

    // Conversation totals
    const totalConversations = conversations.reduce(
      (sum, c) => sum + c.conversation,
      0,
    );
    const totalCost = conversations.reduce((sum, c) => sum + c.cost, 0);

    // Conversations by type
    const byType: Record<WhatsAppConversationType, number> = {
      utility: 0,
      authentication: 0,
      marketing: 0,
      service: 0,
      referral_conversion: 0,
    };
    const costByType: Record<WhatsAppConversationType, number> = {
      utility: 0,
      authentication: 0,
      marketing: 0,
      service: 0,
      referral_conversion: 0,
    };

    for (const conv of conversations) {
      byType[conv.conversation_type] += conv.conversation;
      costByType[conv.conversation_type] += conv.cost;
    }

    // Template stats
    const templateSent = templates.reduce((sum, t) => sum + t.sent, 0);
    const templatesByUsage = [...templates]
      .sort((a, b) => b.sent - a.sent)
      .slice(0, 5)
      .map((t) => ({ name: t.template_name, count: t.sent }));

    const templatesByReadRate = [...templates]
      .filter((t) => t.delivered > 0)
      .map((t) => ({
        name: t.template_name,
        read_rate: t.read / t.delivered,
      }))
      .sort((a, b) => b.read_rate - a.read_rate)
      .slice(0, 5);

    // Determine period
    const allStarts = [
      ...messages.map((m) => m.start),
      ...conversations.map((c) => c.start),
      ...templates.map((t) => t.start),
    ];
    const allEnds = [
      ...messages.map((m) => m.end),
      ...conversations.map((c) => c.end),
      ...templates.map((t) => t.end),
    ];

    const periodStart = Math.min(...allStarts);
    const periodEnd = Math.max(...allEnds);

    return {
      period: {
        start: new Date(periodStart * 1000).toISOString(),
        end: new Date(periodEnd * 1000).toISOString(),
        granularity,
      },
      messages: {
        total_sent: totalSent,
        total_delivered: totalDelivered,
        total_read: totalRead,
        delivery_rate: totalSent > 0 ? totalDelivered / totalSent : 0,
        read_rate: totalDelivered > 0 ? totalRead / totalDelivered : 0,
      },
      conversations: {
        total: totalConversations,
        by_type: byType,
        total_cost: totalCost,
        cost_by_type: costByType,
      },
      templates: {
        total_sent: templateSent,
        most_used: templatesByUsage,
        best_performing: templatesByReadRate,
      },
    };
  }

  /**
   * Create a CRM analytics report from aggregated data
   */
  static summaryToCrmReport(
    summary: WhatsAppAnalyticsSummary,
    reportType:
      | 'whatsapp_summary'
      | 'whatsapp_messages'
      | 'whatsapp_conversations',
  ): CrmAnalyticsReport {
    return {
      id: `wa_report_${Date.now()}`,
      reportType,
      period: {
        start: summary.period.start,
        end: summary.period.end,
      },
      generatedAt: new Date().toISOString(),
      data: summary as unknown as Record<string, unknown>,
      summary: {
        totalMessages: summary.messages.total_sent,
        deliveryRate: summary.messages.delivery_rate,
        readRate: summary.messages.read_rate,
        totalConversations: summary.conversations.total,
        totalCost: summary.conversations.total_cost,
      },
    };
  }

  // ===========================================================================
  // STATUS MAPPING HELPERS
  // ===========================================================================

  /**
   * Map WhatsApp template status to CRM status
   */
  static mapTemplateStatusToCrm(status: WhatsAppTemplateStatus): string {
    const statusMap: Record<WhatsAppTemplateStatus, string> = {
      [WHATSAPP_TEMPLATE_STATUS.APPROVED]: 'active',
      [WHATSAPP_TEMPLATE_STATUS.PENDING]: 'pending',
      [WHATSAPP_TEMPLATE_STATUS.REJECTED]: 'rejected',
      [WHATSAPP_TEMPLATE_STATUS.PAUSED]: 'paused',
      [WHATSAPP_TEMPLATE_STATUS.DISABLED]: 'disabled',
      [WHATSAPP_TEMPLATE_STATUS.IN_APPEAL]: 'in_review',
      [WHATSAPP_TEMPLATE_STATUS.PENDING_DELETION]: 'deleting',
      [WHATSAPP_TEMPLATE_STATUS.DELETED]: 'deleted',
      [WHATSAPP_TEMPLATE_STATUS.LIMIT_EXCEEDED]: 'limited',
    };

    return statusMap[status] || 'unknown';
  }

  /**
   * Get human-readable status description
   */
  static getStatusDescription(status: WhatsAppTemplateStatus): string {
    const descriptions: Record<WhatsAppTemplateStatus, string> = {
      [WHATSAPP_TEMPLATE_STATUS.APPROVED]:
        'Template aprovado e pronto para uso',
      [WHATSAPP_TEMPLATE_STATUS.PENDING]:
        'Template aguardando aprovação do Meta',
      [WHATSAPP_TEMPLATE_STATUS.REJECTED]:
        'Template rejeitado - verifique as políticas',
      [WHATSAPP_TEMPLATE_STATUS.PAUSED]: 'Template pausado temporariamente',
      [WHATSAPP_TEMPLATE_STATUS.DISABLED]: 'Template desabilitado',
      [WHATSAPP_TEMPLATE_STATUS.IN_APPEAL]: 'Template em processo de apelação',
      [WHATSAPP_TEMPLATE_STATUS.PENDING_DELETION]:
        'Template pendente de exclusão',
      [WHATSAPP_TEMPLATE_STATUS.DELETED]: 'Template excluído',
      [WHATSAPP_TEMPLATE_STATUS.LIMIT_EXCEEDED]: 'Limite de uso excedido',
    };

    return descriptions[status] || 'Status desconhecido';
  }
}
