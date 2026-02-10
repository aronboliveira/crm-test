/**
 * WhatsApp Data Mapper Unit Tests
 *
 * Tests for:
 * - Template conversion and formatting
 * - Analytics aggregation
 * - WhatsApp text formatting utilities
 */

import { WhatsAppDataMapper, WhatsAppFormatter } from './whatsapp-data.mapper';
import {
  WHATSAPP_TEMPLATE_STATUS,
  WHATSAPP_TEMPLATE_CATEGORY,
  WHATSAPP_COMPONENT_TYPE,
  WHATSAPP_BUTTON_TYPE,
  WHATSAPP_HEADER_FORMAT,
  type WhatsAppTemplate,
  type WhatsAppConversationAnalytics,
  type WhatsAppMessageAnalytics,
  type WhatsAppTemplateAnalytics,
} from './whatsapp.types';

describe('WhatsAppFormatter', () => {
  describe('text formatting', () => {
    it('should apply bold formatting', () => {
      expect(WhatsAppFormatter.bold('test')).toBe('*test*');
    });

    it('should apply italic formatting', () => {
      expect(WhatsAppFormatter.italic('test')).toBe('_test_');
    });

    it('should apply strikethrough formatting', () => {
      expect(WhatsAppFormatter.strikethrough('test')).toBe('~test~');
    });

    it('should apply monospace formatting', () => {
      expect(WhatsAppFormatter.monospace('test')).toBe('```test```');
    });

    it('should apply inline code formatting', () => {
      expect(WhatsAppFormatter.inlineCode('test')).toBe('`test`');
    });

    it('should apply quote formatting', () => {
      expect(WhatsAppFormatter.quote('line1\nline2')).toBe('> line1\n> line2');
    });
  });

  describe('list formatting', () => {
    it('should create bullet list', () => {
      const items = ['item1', 'item2', 'item3'];
      expect(WhatsAppFormatter.bulletList(items)).toBe(
        '• item1\n• item2\n• item3',
      );
    });

    it('should create numbered list', () => {
      const items = ['first', 'second', 'third'];
      expect(WhatsAppFormatter.numberedList(items)).toBe(
        '1. first\n2. second\n3. third',
      );
    });
  });

  describe('variable handling', () => {
    it('should create variable placeholder', () => {
      expect(WhatsAppFormatter.variable(1)).toBe('{{1}}');
      expect(WhatsAppFormatter.variable(2)).toBe('{{2}}');
    });

    it('should extract variables from template', () => {
      const text =
        'Hello {{1}}, your order {{2}} is ready. Contact us at {{3}}.';
      const variables = WhatsAppFormatter.extractVariables(text);
      expect(variables).toEqual(['var_1', 'var_2', 'var_3']);
    });

    it('should extract variables in correct order', () => {
      const text = 'Value {{3}} and {{1}} with {{2}}';
      const variables = WhatsAppFormatter.extractVariables(text);
      expect(variables).toEqual(['var_1', 'var_2', 'var_3']);
    });

    it('should handle duplicate variables', () => {
      const text = '{{1}} appears twice: {{1}}';
      const variables = WhatsAppFormatter.extractVariables(text);
      expect(variables).toEqual(['var_1']);
    });

    it('should replace variables with values', () => {
      const template = 'Hello {{1}}, your order {{2}} is ready.';
      const values = { var_1: 'João', var_2: '#12345' };
      const result = WhatsAppFormatter.replaceVariables(template, values);
      expect(result).toBe('Hello João, your order #12345 is ready.');
    });
  });

  describe('stripFormatting', () => {
    it('should remove all formatting', () => {
      const formatted = '*bold* _italic_ ~strike~ `code` ```mono```';
      const plain = WhatsAppFormatter.stripFormatting(formatted);
      expect(plain).toBe('bold italic strike code mono');
    });

    it('should remove quote markers', () => {
      const quoted = '> This is a quote\n> Second line';
      const plain = WhatsAppFormatter.stripFormatting(quoted);
      expect(plain).toBe('This is a quote\nSecond line');
    });

    it('should remove bullet markers', () => {
      const bulleted = '• Item 1\n• Item 2';
      const plain = WhatsAppFormatter.stripFormatting(bulleted);
      expect(plain).toBe('Item 1\nItem 2');
    });
  });
});

describe('WhatsAppDataMapper', () => {
  describe('templateToLocalTemplate', () => {
    it('should convert Meta API template to local format', () => {
      const apiTemplate: WhatsAppTemplate = {
        id: 'template_123',
        name: 'order_confirmation',
        language: 'pt_BR',
        status: WHATSAPP_TEMPLATE_STATUS.APPROVED,
        category: WHATSAPP_TEMPLATE_CATEGORY.UTILITY,
        components: [
          {
            type: WHATSAPP_COMPONENT_TYPE.HEADER,
            format: WHATSAPP_HEADER_FORMAT.TEXT,
            text: 'Pedido Confirmado',
          },
          {
            type: WHATSAPP_COMPONENT_TYPE.BODY,
            text: 'Olá {{1}}, seu pedido {{2}} foi confirmado!',
          },
          {
            type: WHATSAPP_COMPONENT_TYPE.FOOTER,
            text: 'Obrigado pela preferência',
          },
        ],
      };

      const local = WhatsAppDataMapper.templateToLocalTemplate(apiTemplate);

      expect(local.externalId).toBe('template_123');
      expect(local.name).toBe('order_confirmation');
      expect(local.language).toBe('pt_BR');
      expect(local.status).toBe(WHATSAPP_TEMPLATE_STATUS.APPROVED);
      expect(local.category).toBe(WHATSAPP_TEMPLATE_CATEGORY.UTILITY);
      expect(local.headerText).toBe('Pedido Confirmado');
      expect(local.bodyText).toBe(
        'Olá {{1}}, seu pedido {{2}} foi confirmado!',
      );
      expect(local.footerText).toBe('Obrigado pela preferência');
      expect(local.variables).toEqual(['var_1', 'var_2']);
      expect(local.usageCount).toBe(0);
    });

    it('should handle template with buttons', () => {
      const apiTemplate: WhatsAppTemplate = {
        id: 'template_456',
        name: 'support_contact',
        language: 'pt_BR',
        status: WHATSAPP_TEMPLATE_STATUS.APPROVED,
        category: WHATSAPP_TEMPLATE_CATEGORY.UTILITY,
        components: [
          {
            type: WHATSAPP_COMPONENT_TYPE.BODY,
            text: 'Precisa de ajuda?',
          },
          {
            type: WHATSAPP_COMPONENT_TYPE.BUTTONS,
            buttons: [
              {
                type: WHATSAPP_BUTTON_TYPE.PHONE_NUMBER,
                text: 'Ligar',
                phone_number: '+5511999999999',
              },
              {
                type: WHATSAPP_BUTTON_TYPE.URL,
                text: 'Site',
                url: 'https://example.com',
              },
            ],
          },
        ],
      };

      const local = WhatsAppDataMapper.templateToLocalTemplate(apiTemplate);

      expect(local.buttons).toHaveLength(2);
      expect(local.buttons![0].type).toBe(WHATSAPP_BUTTON_TYPE.PHONE_NUMBER);
      expect(local.buttons![1].type).toBe(WHATSAPP_BUTTON_TYPE.URL);
    });
  });

  describe('localTemplateToCrmTemplate', () => {
    it('should convert local template to CRM format', () => {
      const local = WhatsAppDataMapper.createLocalTemplate({
        name: 'welcome_message',
        language: 'pt_BR',
        category: WHATSAPP_TEMPLATE_CATEGORY.MARKETING,
        headerText: 'Bem-vindo!',
        bodyText: 'Olá {{1}}, seja bem-vindo à nossa empresa!',
        footerText: 'Equipe CRM',
        tags: ['onboarding', 'welcome'],
        createdBy: 'user_1',
      });

      const crm = WhatsAppDataMapper.localTemplateToCrmTemplate(local);

      expect(crm.channel).toBe('whatsapp');
      expect(crm.name).toBe('welcome_message');
      expect(crm.language).toBe('pt_BR');
      expect(crm.category).toBe(WHATSAPP_TEMPLATE_CATEGORY.MARKETING);
      expect(crm.content).toBe('Olá {{1}}, seja bem-vindo à nossa empresa!');
      expect(crm.variables).toEqual(['var_1']);
      expect(crm.metadata.headerText).toBe('Bem-vindo!');
      expect(crm.metadata.footerText).toBe('Equipe CRM');
      expect(crm.tags).toEqual(['onboarding', 'welcome']);
      expect(crm.createdBy).toBe('user_1');
    });
  });

  describe('createLocalTemplate', () => {
    it('should create a new local template', () => {
      const template = WhatsAppDataMapper.createLocalTemplate({
        name: 'test_template',
        language: 'en_US',
        category: WHATSAPP_TEMPLATE_CATEGORY.UTILITY,
        bodyText: 'Hello {{1}}!',
      });

      expect(template.id).toMatch(/^local_/);
      expect(template.name).toBe('test_template');
      expect(template.language).toBe('en_US');
      expect(template.variables).toEqual(['var_1']);
      expect(template.status).toBe(WHATSAPP_TEMPLATE_STATUS.APPROVED);
      expect(template.usageCount).toBe(0);
    });

    it('should build formatted preview correctly', () => {
      const template = WhatsAppDataMapper.createLocalTemplate({
        name: 'full_template',
        language: 'pt_BR',
        category: WHATSAPP_TEMPLATE_CATEGORY.UTILITY,
        headerText: 'Header',
        bodyText: 'Body text',
        footerText: 'Footer',
      });

      expect(template.formattedPreview).toContain('*Header*');
      expect(template.formattedPreview).toContain('Body text');
      expect(template.formattedPreview).toContain('_Footer_');
    });
  });

  describe('conversationAnalyticsToCrmRecords', () => {
    it('should convert conversation analytics to CRM records', () => {
      const analytics: WhatsAppConversationAnalytics[] = [
        {
          start: 1700000000,
          end: 1700003600,
          conversation: 5,
          conversation_type: 'utility',
          conversation_direction: 'OUTBOUND',
          cost: 0.05,
          country_code: 'BR',
        },
        {
          start: 1700003600,
          end: 1700007200,
          conversation: 3,
          conversation_type: 'service',
          conversation_direction: 'INBOUND',
          cost: 0,
        },
      ];

      const records =
        WhatsAppDataMapper.conversationAnalyticsToCrmRecords(analytics);

      expect(records).toHaveLength(2);
      expect(records[0].channel).toBe('whatsapp');
      expect(records[0].type).toBe('utility');
      expect(records[0].direction).toBe('outbound');
      expect(records[0].cost).toBe(0.05);
      expect(records[0].countryCode).toBe('BR');
      expect(records[1].direction).toBe('inbound');
    });
  });

  describe('aggregateAnalytics', () => {
    it('should aggregate analytics data correctly', () => {
      const messages: WhatsAppMessageAnalytics[] = [
        {
          start: 1700000000,
          end: 1700086400,
          sent: 100,
          delivered: 95,
          read: 80,
        },
        {
          start: 1700086400,
          end: 1700172800,
          sent: 150,
          delivered: 140,
          read: 100,
        },
      ];

      const conversations: WhatsAppConversationAnalytics[] = [
        {
          start: 1700000000,
          end: 1700086400,
          conversation: 50,
          conversation_type: 'utility',
          conversation_direction: 'OUTBOUND',
          cost: 2.5,
        },
        {
          start: 1700000000,
          end: 1700086400,
          conversation: 30,
          conversation_type: 'marketing',
          conversation_direction: 'OUTBOUND',
          cost: 5.0,
        },
      ];

      const templates: WhatsAppTemplateAnalytics[] = [
        {
          template_id: 't1',
          template_name: 'template_1',
          sent: 80,
          delivered: 75,
          read: 60,
          start: 1700000000,
          end: 1700172800,
        },
        {
          template_id: 't2',
          template_name: 'template_2',
          sent: 50,
          delivered: 48,
          read: 45,
          start: 1700000000,
          end: 1700172800,
        },
      ];

      const summary = WhatsAppDataMapper.aggregateAnalytics(
        messages,
        conversations,
        templates,
        'DAY',
      );

      expect(summary.messages.total_sent).toBe(250);
      expect(summary.messages.total_delivered).toBe(235);
      expect(summary.messages.total_read).toBe(180);
      expect(summary.messages.delivery_rate).toBeCloseTo(0.94, 2);

      expect(summary.conversations.total).toBe(80);
      expect(summary.conversations.by_type.utility).toBe(50);
      expect(summary.conversations.by_type.marketing).toBe(30);
      expect(summary.conversations.total_cost).toBe(7.5);

      expect(summary.templates.total_sent).toBe(130);
      expect(summary.templates.most_used[0].name).toBe('template_1');
      expect(summary.templates.most_used[0].count).toBe(80);
    });
  });

  describe('mapTemplateStatusToCrm', () => {
    it('should map WhatsApp status to CRM status', () => {
      expect(
        WhatsAppDataMapper.mapTemplateStatusToCrm(
          WHATSAPP_TEMPLATE_STATUS.APPROVED,
        ),
      ).toBe('active');
      expect(
        WhatsAppDataMapper.mapTemplateStatusToCrm(
          WHATSAPP_TEMPLATE_STATUS.PENDING,
        ),
      ).toBe('pending');
      expect(
        WhatsAppDataMapper.mapTemplateStatusToCrm(
          WHATSAPP_TEMPLATE_STATUS.REJECTED,
        ),
      ).toBe('rejected');
      expect(
        WhatsAppDataMapper.mapTemplateStatusToCrm(
          WHATSAPP_TEMPLATE_STATUS.PAUSED,
        ),
      ).toBe('paused');
    });
  });

  describe('getStatusDescription', () => {
    it('should return Portuguese descriptions', () => {
      const desc = WhatsAppDataMapper.getStatusDescription(
        WHATSAPP_TEMPLATE_STATUS.APPROVED,
      );
      expect(desc).toBe('Template aprovado e pronto para uso');

      const rejectedDesc = WhatsAppDataMapper.getStatusDescription(
        WHATSAPP_TEMPLATE_STATUS.REJECTED,
      );
      expect(rejectedDesc).toContain('rejeitado');
    });
  });

  describe('templatesToLocalTemplates', () => {
    it('should convert array of templates', () => {
      const apiTemplates: WhatsAppTemplate[] = [
        {
          id: 't1',
          name: 'template_1',
          language: 'pt_BR',
          status: WHATSAPP_TEMPLATE_STATUS.APPROVED,
          category: WHATSAPP_TEMPLATE_CATEGORY.UTILITY,
          components: [{ type: WHATSAPP_COMPONENT_TYPE.BODY, text: 'Body 1' }],
        },
        {
          id: 't2',
          name: 'template_2',
          language: 'en_US',
          status: WHATSAPP_TEMPLATE_STATUS.PENDING,
          category: WHATSAPP_TEMPLATE_CATEGORY.MARKETING,
          components: [{ type: WHATSAPP_COMPONENT_TYPE.BODY, text: 'Body 2' }],
        },
      ];

      const locals = WhatsAppDataMapper.templatesToLocalTemplates(apiTemplates);

      expect(locals).toHaveLength(2);
      expect(locals[0].name).toBe('template_1');
      expect(locals[1].name).toBe('template_2');
    });
  });

  describe('summaryToCrmReport', () => {
    it('should convert summary to CRM report format', () => {
      const summary: any = {
        period: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-31T23:59:59.999Z',
          granularity: 'DAY',
        },
        messages: {
          total_sent: 1000,
          total_delivered: 950,
          total_read: 800,
          delivery_rate: 0.95,
          read_rate: 0.84,
        },
        conversations: {
          total: 500,
          by_type: { utility: 300, marketing: 200 },
          total_cost: 50.0,
          cost_by_type: { utility: 20, marketing: 30 },
        },
        templates: {
          total_sent: 800,
          most_used: [],
          best_performing: [],
        },
      };

      const report = WhatsAppDataMapper.summaryToCrmReport(
        summary,
        'whatsapp_summary',
      );

      expect(report.reportType).toBe('whatsapp_summary');
      expect(report.period.start).toBe('2024-01-01T00:00:00.000Z');
      expect(report.summary.totalMessages).toBe(1000);
      expect(report.summary.deliveryRate).toBe(0.95);
      expect(report.summary.totalConversations).toBe(500);
      expect(report.summary.totalCost).toBe(50.0);
    });
  });
});
