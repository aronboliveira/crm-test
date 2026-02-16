/**
 * WhatsApp Integration Adapter
 *
 * Implements IntegrationAdapter for WhatsApp Business Platform.
 * Focused on READ-ONLY data analysis operations:
 * - Template storage and management (local copy-paste templates)
 * - Analytics data retrieval from Meta API
 * - Message/conversation statistics
 *
 * @remarks
 * This adapter does NOT send messages.
 * Templates are stored locally with WhatsApp formatting for copy-paste use.
 * Analytics are pulled from Meta's Graph API for reporting.
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type {
  IntegrationAdapter,
  IntegrationConfig,
  IntegrationSyncDataset,
  IntegrationStatus,
} from '../../types';
import { IntegrationResilienceService } from '../../integration-resilience.service';
import { IntegrationValueSanitizer } from '../shared/mail-integration.shared';
import { WhatsAppApiClient } from './whatsapp-api.client';
import {
  WhatsAppDataMapper,
  WhatsAppFormatter,
  type CrmMessageTemplate,
  type CrmAnalyticsReport,
  type CrmConversationRecord,
} from './whatsapp-data.mapper';
import type {
  WhatsAppConfig,
  WhatsAppTemplate,
  LocalWhatsAppTemplate,
  WhatsAppAnalyticsSummary,
  WhatsAppTemplateQueryParams,
  WhatsAppAnalyticsQueryParams,
  LocalTemplateQueryParams,
  WhatsAppTemplateCategory,
  WhatsAppHeaderFormat,
  WhatsAppTemplateButton,
  TemplateFolder,
  TemplateUsageLog,
} from './whatsapp.types';

type WhatsAppSetupFieldState = Readonly<{
  key: 'accessToken' | 'businessAccountId' | 'phoneNumberId' | 'apiVersion';
  label: string;
  required: boolean;
  present: boolean;
  note?: string;
}>;

/**
 * WhatsApp Business Platform Integration Adapter
 *
 * Provides:
 * - Local template storage with WhatsApp formatting
 * - Meta API analytics data reading
 * - Template synchronization from Meta
 * - Usage tracking and statistics
 */
@Injectable()
export class WhatsAppAdapter implements IntegrationAdapter {
  private readonly logger = new Logger(WhatsAppAdapter.name);
  private static readonly DEFAULT_API_VERSION = 'v18.0';
  private config: IntegrationConfig = {};
  private client: WhatsAppApiClient | null = null;
  private isConnected = false;
  private lastSyncAt?: string;
  private lastError?: string;

  // Local storage (in production, this would be a database)
  private localTemplates: Map<string, LocalWhatsAppTemplate> = new Map();
  private templateFolders: Map<string, TemplateFolder> = new Map();
  private usageLogs: TemplateUsageLog[] = [];

  constructor(
    private readonly httpService: HttpService,
    private readonly resilience: IntegrationResilienceService,
  ) {}

  // ===========================================================================
  // INTEGRATION ADAPTER INTERFACE
  // ===========================================================================

  async getStatus(): Promise<IntegrationStatus> {
    const isConfigured = this.isConfigured();
    const status = !isConfigured
      ? 'disconnected'
      : this.lastError
        ? 'error'
        : this.isConnected
          ? 'connected'
          : 'disconnected';

    return {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      type: 'Communication/Analytics',
      status,
      configured: isConfigured,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
      features: [
        'Message template storage',
        'WhatsApp formatting preview',
        'Template copy-paste support',
        'Analytics data reading',
        'Conversation statistics',
        'Template performance metrics',
        'Business account status',
        'Phone quality monitoring',
      ],
    };
  }

  async testConnection(): Promise<boolean> {
    this.logger.log('Testing WhatsApp API connection');

    if (!this.isConfigured()) {
      this.lastError = 'Integration not configured';
      this.isConnected = false;
      return false;
    }

    try {
      const success = await this.client!.testConnection();
      if (success) {
        this.isConnected = true;
        this.lastError = undefined;
        this.logger.log('WhatsApp connection test successful');
      } else {
        this.isConnected = false;
        this.lastError = 'Connection test failed';
      }
      return success;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.isConnected = false;
      this.lastError = message;
      this.logger.error('WhatsApp connection test failed:', message);
      return false;
    }
  }

  async configure(config: IntegrationConfig): Promise<void> {
    this.logger.log('Configuring WhatsApp integration');

    this.config = this.normalizeConfig(config);

    if (this.isConfigured()) {
      this.client = new WhatsAppApiClient(
        this.httpService,
        this.resilience,
        'whatsapp',
      );
      this.client.configure({
        accessToken: this.config.accessToken!,
        businessAccountId: this.config.businessAccountId!,
        phoneNumberId: this.config.phoneNumberId,
        apiVersion: this.config.apiVersion!,
      });
    } else {
      this.client = null;
    }

    this.isConnected = false;
    this.lastError = undefined;
  }

  async sync(): Promise<{ success: boolean; message: string }> {
    this.logger.log('Syncing templates from WhatsApp Business API');

    if (!this.isConfigured()) {
      return { success: false, message: 'Integration not configured' };
    }

    try {
      const result = await this.syncTemplates();
      this.isConnected = true;
      this.lastSyncAt = new Date().toISOString();
      this.lastError = undefined;
      return {
        success: true,
        message: `Synced ${result.synced} templates from Meta API`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.isConnected = false;
      this.lastError = message;
      this.logger.error('Template sync failed:', message);
      return { success: false, message };
    }
  }

  async pullSyncSnapshot(): Promise<IntegrationSyncDataset[]> {
    this.ensureConfigured();
    try {
      const result = await this.syncTemplates();
      const templates = this.getLocalTemplates().map((template) => ({
        sourceId: template.externalId ?? template.id,
        templateId: template.id,
        name: template.name,
        language: template.language,
        category: template.category,
        status: template.status,
        usageCount: template.usageCount,
        lastUsedAt: template.lastUsedAt,
        updatedAt: template.updatedAt,
      }));

      const usage = this.getUsageStatistics();
      const usageRecords = usage.mostUsed.map((item) => ({
        sourceId: item.name,
        name: item.name,
        usageCount: item.count,
        totalTemplates: usage.totalTemplates,
        totalUsage: usage.totalUsage,
      }));

      this.isConnected = true;
      this.lastError = undefined;
      this.lastSyncAt = new Date().toISOString();
      this.logger.log(
        `Prepared WhatsApp sync snapshot: ${result.synced} templates, ${usageRecords.length} usage rows`,
      );

      return [
        {
          recordType: 'whatsapp_templates',
          externalIdField: 'sourceId',
          records: templates,
        },
        {
          recordType: 'whatsapp_template_usage',
          externalIdField: 'sourceId',
          records: usageRecords,
        },
      ];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.isConnected = false;
      this.lastError = message;
      throw error;
    }
  }

  async getHealthInfo(): Promise<Record<string, unknown>> {
    const setup = this.buildSetupChecklist();
    const missingRequired = setup
      .filter((item) => item.required && !item.present)
      .map((item) => item.label);
    const setupReady = missingRequired.length === 0;
    const configState = {
      configured: this.isConfigured(),
      hasAccessToken: IntegrationValueSanitizer.hasString(
        this.config.accessToken,
      ),
      hasBusinessAccountId: IntegrationValueSanitizer.hasString(
        this.config.businessAccountId,
      ),
      hasPhoneNumberId: IntegrationValueSanitizer.hasString(
        this.config.phoneNumberId,
      ),
      apiVersion:
        IntegrationValueSanitizer.normalizeString(this.config.apiVersion) ??
        WhatsAppAdapter.DEFAULT_API_VERSION,
      localTemplates: this.localTemplates.size,
      connected: this.isConnected,
      lastSyncAt: this.lastSyncAt,
      setup,
      setupReady,
      missingRequired,
    };

    if (!setupReady) {
      return {
        ...configState,
        healthy: false,
        issues: ['Integration not configured', ...missingRequired],
        nextStep:
          'Provide required Meta credentials (Access Token + Business Account ID) and retest the connection.',
      };
    }

    try {
      const business = await this.getBusinessInfo();
      return {
        ...configState,
        healthy: business.healthy,
        accountName: business.accountName,
        phoneNumbers: business.phoneNumbers.length,
        issues: business.issues,
        nextStep: business.healthy
          ? 'Connection is healthy. Run sync jobs to refresh templates and analytics datasets.'
          : 'Fix account issues reported by Meta and retest connectivity.',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Health metadata fetch failed: ${message}`);
      return {
        ...configState,
        healthy: false,
        issues: [message],
        nextStep:
          'Connection test failed. Confirm Access Token scopes and Business Account ID, then retry.',
      };
    }
  }

  // ===========================================================================
  // CONFIGURATION HELPERS
  // ===========================================================================

  private isConfigured(): boolean {
    return (
      IntegrationValueSanitizer.hasString(this.config.accessToken) &&
      IntegrationValueSanitizer.hasString(this.config.businessAccountId)
    );
  }

  private normalizeConfig(config: IntegrationConfig): IntegrationConfig {
    return {
      ...config,
      accessToken: IntegrationValueSanitizer.normalizeString(
        config.accessToken,
      ),
      businessAccountId: IntegrationValueSanitizer.normalizeString(
        config.businessAccountId,
      ),
      phoneNumberId: IntegrationValueSanitizer.normalizeString(
        config.phoneNumberId,
      ),
      apiVersion:
        IntegrationValueSanitizer.normalizeString(config.apiVersion) ??
        WhatsAppAdapter.DEFAULT_API_VERSION,
    };
  }

  private buildSetupChecklist(): WhatsAppSetupFieldState[] {
    return [
      {
        key: 'accessToken',
        label: 'Access Token (Meta Graph API)',
        required: true,
        present: IntegrationValueSanitizer.hasString(this.config.accessToken),
      },
      {
        key: 'businessAccountId',
        label: 'WhatsApp Business Account ID',
        required: true,
        present: IntegrationValueSanitizer.hasString(
          this.config.businessAccountId,
        ),
      },
      {
        key: 'phoneNumberId',
        label: 'Phone Number ID',
        required: false,
        present: IntegrationValueSanitizer.hasString(this.config.phoneNumberId),
        note: 'Needed for detailed message analytics.',
      },
      {
        key: 'apiVersion',
        label: 'Meta Graph API version',
        required: false,
        present: IntegrationValueSanitizer.hasString(this.config.apiVersion),
        note: `Defaults to ${WhatsAppAdapter.DEFAULT_API_VERSION} when omitted.`,
      },
    ];
  }

  // ===========================================================================
  // TEMPLATE OPERATIONS (LOCAL STORAGE)
  // ===========================================================================

  /**
   * Sync templates from Meta API to local storage
   */
  async syncTemplates(
    params?: WhatsAppTemplateQueryParams,
  ): Promise<{ synced: number; total: number }> {
    this.logger.log('Fetching templates from Meta API');

    const templates = await this.client!.getAllTemplates();
    const localTemplates =
      WhatsAppDataMapper.templatesToLocalTemplates(templates);

    let synced = 0;
    for (const template of localTemplates) {
      const existing = this.localTemplates.get(template.externalId!);
      if (existing) {
        // Preserve local data when updating
        template.usageCount = existing.usageCount;
        template.lastUsedAt = existing.lastUsedAt;
        template.tags = existing.tags;
      }
      this.localTemplates.set(template.externalId!, template);
      synced++;
    }

    return { synced, total: this.localTemplates.size };
  }

  /**
   * Get all local templates
   */
  getLocalTemplates(
    params?: LocalTemplateQueryParams,
  ): LocalWhatsAppTemplate[] {
    let templates = Array.from(this.localTemplates.values());

    // Apply filters
    if (params?.category) {
      templates = templates.filter((t) => t.category === params.category);
    }
    if (params?.status) {
      templates = templates.filter((t) => t.status === params.status);
    }
    if (params?.language) {
      templates = templates.filter((t) => t.language === params.language);
    }
    if (params?.tags?.length) {
      templates = templates.filter((t) =>
        params.tags!.some((tag) => t.tags?.includes(tag)),
      );
    }
    if (params?.search) {
      const search = params.search.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(search) ||
          t.bodyText.toLowerCase().includes(search),
      );
    }

    // Sort
    const sortBy = params?.sortBy || 'name';
    const sortOrder = params?.sortOrder || 'asc';
    templates.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'usageCount':
          comparison = a.usageCount - b.usageCount;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Paginate
    const offset = params?.offset || 0;
    const limit = params?.limit || 50;
    return templates.slice(offset, offset + limit);
  }

  /**
   * Get a single local template by ID
   */
  getLocalTemplate(id: string): LocalWhatsAppTemplate | undefined {
    return this.localTemplates.get(id);
  }

  /**
   * Create a new local template (for copy-paste use)
   */
  createLocalTemplate(input: {
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
    const template = WhatsAppDataMapper.createLocalTemplate(input);
    this.localTemplates.set(template.id, template);
    this.logger.log(`Created local template: ${template.name}`);
    return template;
  }

  /**
   * Update a local template
   */
  updateLocalTemplate(
    id: string,
    updates: Partial<
      Pick<
        LocalWhatsAppTemplate,
        'name' | 'headerText' | 'bodyText' | 'footerText' | 'buttons' | 'tags'
      >
    >,
  ): LocalWhatsAppTemplate | undefined {
    const template = this.localTemplates.get(id);
    if (!template) {
      return undefined;
    }

    const updated: LocalWhatsAppTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date().toISOString(),
      variables: updates.bodyText
        ? WhatsAppFormatter.extractVariables(updates.bodyText)
        : template.variables,
    };

    // Rebuild preview if content changed
    if (updates.headerText || updates.bodyText || updates.footerText) {
      const previewParts: string[] = [];
      if (updated.headerText) {
        previewParts.push(WhatsAppFormatter.bold(updated.headerText));
        previewParts.push('');
      }
      previewParts.push(updated.bodyText);
      if (updated.footerText) {
        previewParts.push('');
        previewParts.push(WhatsAppFormatter.italic(updated.footerText));
      }
      updated.formattedPreview = previewParts.join('\n');
    }

    this.localTemplates.set(id, updated);
    return updated;
  }

  /**
   * Delete a local template
   */
  deleteLocalTemplate(id: string): boolean {
    return this.localTemplates.delete(id);
  }

  /**
   * Record template usage (for analytics)
   */
  recordTemplateUsage(
    templateId: string,
    usedBy?: string,
    context?: string,
    variables?: Record<string, string>,
  ): void {
    const template = this.localTemplates.get(templateId);
    if (template) {
      template.usageCount++;
      template.lastUsedAt = new Date().toISOString();
      this.localTemplates.set(templateId, template);

      this.usageLogs.push({
        id: `usage_${Date.now()}`,
        templateId,
        usedAt: new Date().toISOString(),
        usedBy,
        context,
        variables,
      });
    }
  }

  /**
   * Get formatted template ready for copy-paste
   */
  getFormattedTemplate(
    templateId: string,
    variables?: Record<string, string>,
  ): string | undefined {
    const template = this.localTemplates.get(templateId);
    if (!template) {
      return undefined;
    }

    let formatted = template.formattedPreview;
    if (variables) {
      formatted = WhatsAppFormatter.replaceVariables(formatted, variables);
    }

    return formatted;
  }

  /**
   * Convert local templates to CRM format
   */
  getTemplatesAsCrm(): CrmMessageTemplate[] {
    const locals = Array.from(this.localTemplates.values());
    return WhatsAppDataMapper.localTemplatesToCrmTemplates(locals);
  }

  // ===========================================================================
  // TEMPLATE FOLDER OPERATIONS
  // ===========================================================================

  /**
   * Create a folder for organizing templates
   */
  createFolder(input: {
    name: string;
    description?: string;
    color?: string;
  }): TemplateFolder {
    const folder: TemplateFolder = {
      id: `folder_${Date.now()}`,
      name: input.name,
      description: input.description,
      color: input.color,
      templateIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.templateFolders.set(folder.id, folder);
    return folder;
  }

  /**
   * Add template to folder
   */
  addTemplateToFolder(templateId: string, folderId: string): boolean {
    const folder = this.templateFolders.get(folderId);
    if (!folder || !this.localTemplates.has(templateId)) {
      return false;
    }
    if (!folder.templateIds.includes(templateId)) {
      folder.templateIds.push(templateId);
      folder.updatedAt = new Date().toISOString();
    }
    return true;
  }

  /**
   * Get all folders
   */
  getFolders(): TemplateFolder[] {
    return Array.from(this.templateFolders.values());
  }

  // ===========================================================================
  // ANALYTICS OPERATIONS (READ-ONLY)
  // ===========================================================================

  /**
   * Get conversation analytics from Meta API
   */
  async getConversationAnalytics(
    params: WhatsAppAnalyticsQueryParams,
  ): Promise<CrmConversationRecord[]> {
    this.ensureConfigured();

    const analytics = await this.client!.getConversationAnalytics(params);
    return WhatsAppDataMapper.conversationAnalyticsToCrmRecords(analytics);
  }

  /**
   * Get aggregated analytics summary
   */
  async getAnalyticsSummary(
    params: WhatsAppAnalyticsQueryParams,
  ): Promise<WhatsAppAnalyticsSummary> {
    this.ensureConfigured();

    const [conversations, templates] = await Promise.all([
      this.client!.getConversationAnalytics(params),
      this.client!.getTemplateAnalytics(params),
    ]);

    // Message analytics requires phone number ID
    let messages: Array<{
      sent: number;
      delivered: number;
      read?: number;
      start: number;
      end: number;
    }> = [];
    if (this.config.phoneNumberId) {
      try {
        messages = await this.client!.getMessageAnalytics(params);
      } catch {
        this.logger.warn('Message analytics not available');
      }
    }

    return WhatsAppDataMapper.aggregateAnalytics(
      messages,
      conversations,
      templates,
      params.granularity,
    );
  }

  /**
   * Get analytics as CRM report
   */
  async getAnalyticsReport(
    params: WhatsAppAnalyticsQueryParams,
  ): Promise<CrmAnalyticsReport> {
    const summary = await this.getAnalyticsSummary(params);
    return WhatsAppDataMapper.summaryToCrmReport(summary, 'whatsapp_summary');
  }

  /**
   * Get template performance analytics
   */
  async getTemplatePerformance(params: WhatsAppAnalyticsQueryParams): Promise<
    Array<{
      name: string;
      sent: number;
      delivered: number;
      read: number;
      readRate: number;
    }>
  > {
    this.ensureConfigured();

    const analytics = await this.client!.getTemplateAnalytics(params);

    return analytics.map((t) => ({
      name: t.template_name,
      sent: t.sent,
      delivered: t.delivered,
      read: t.read,
      readRate: t.delivered > 0 ? t.read / t.delivered : 0,
    }));
  }

  // ===========================================================================
  // BUSINESS ACCOUNT INFO
  // ===========================================================================

  /**
   * Get business account details
   */
  async getBusinessInfo(): Promise<{
    accountId: string;
    accountName: string;
    phoneNumbers: Array<{
      id: string;
      number: string;
      name: string;
      quality: string;
      status: string;
    }>;
    healthy: boolean;
    issues: string[];
  }> {
    this.ensureConfigured();

    const health = await this.client!.getHealthStatus();

    return {
      accountId: health.account.id,
      accountName: health.account.name,
      phoneNumbers: health.phoneNumbers.map((p) => ({
        id: p.id,
        number: p.display_phone_number,
        name: p.verified_name,
        quality: p.quality_rating,
        status: p.status,
      })),
      healthy: health.healthy,
      issues: health.issues,
    };
  }

  // ===========================================================================
  // FORMATTING HELPERS (EXPOSED)
  // ===========================================================================

  /**
   * Get formatter utility for external use
   */
  get formatter(): typeof WhatsAppFormatter {
    return WhatsAppFormatter;
  }

  /**
   * Format text with WhatsApp styling
   */
  formatText(
    text: string,
    style: 'bold' | 'italic' | 'strike' | 'mono' | 'code' | 'quote',
  ): string {
    switch (style) {
      case 'bold':
        return WhatsAppFormatter.bold(text);
      case 'italic':
        return WhatsAppFormatter.italic(text);
      case 'strike':
        return WhatsAppFormatter.strikethrough(text);
      case 'mono':
        return WhatsAppFormatter.monospace(text);
      case 'code':
        return WhatsAppFormatter.inlineCode(text);
      case 'quote':
        return WhatsAppFormatter.quote(text);
      default:
        return text;
    }
  }

  /**
   * Create a bullet list
   */
  createBulletList(items: string[]): string {
    return WhatsAppFormatter.bulletList(items);
  }

  /**
   * Create a numbered list
   */
  createNumberedList(items: string[]): string {
    return WhatsAppFormatter.numberedList(items);
  }

  // ===========================================================================
  // LOCAL USAGE STATISTICS
  // ===========================================================================

  /**
   * Get local usage statistics
   */
  getUsageStatistics(): {
    totalTemplates: number;
    totalUsage: number;
    mostUsed: Array<{ name: string; count: number }>;
    recentUsage: TemplateUsageLog[];
  } {
    const templates = Array.from(this.localTemplates.values());
    const totalUsage = templates.reduce((sum, t) => sum + t.usageCount, 0);

    const mostUsed = [...templates]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map((t) => ({ name: t.name, count: t.usageCount }));

    const recentUsage = [...this.usageLogs]
      .sort(
        (a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime(),
      )
      .slice(0, 20);

    return {
      totalTemplates: templates.length,
      totalUsage,
      mostUsed,
      recentUsage,
    };
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private ensureConfigured(): void {
    if (!this.isConfigured() || !this.client) {
      throw new Error('WhatsApp integration not configured');
    }
  }
}
