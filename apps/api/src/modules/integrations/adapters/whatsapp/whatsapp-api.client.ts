/**
 * WhatsApp Business API Client
 *
 * HTTP client for Meta's WhatsApp Business Platform API.
 * Focused on READ-ONLY operations for data analysis:
 * - Template listing and status checking
 * - Analytics data retrieval
 * - Business account information
 *
 * @remarks
 * Does NOT send messages - only retrieves data for analysis.
 * Uses Meta Graph API v18.0+
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import axios from 'axios';
import SafeJsonUtil from '../../../../common/json/safe-json.util';
type AxiosResponse<T = any> = Awaited<ReturnType<typeof axios.get<T>>>;
import type {
  WhatsAppConfig,
  WhatsAppTemplate,
  WhatsAppBusinessAccount,
  WhatsAppPhoneNumberInfo,
  WhatsAppConversationAnalytics,
  WhatsAppMessageAnalytics,
  WhatsAppTemplateAnalytics,
  WhatsAppTemplateQueryParams,
  WhatsAppAnalyticsQueryParams,
  MetaApiPaginatedResponse,
} from './whatsapp.types';
import type { IntegrationResilienceService } from '../../integration-resilience.service';

/** Default API version for Meta Graph API */
const DEFAULT_API_VERSION = 'v18.0';
const META_GRAPH_API_BASE = 'https://graph.facebook.com';

@Injectable()
export class WhatsAppApiClient {
  private readonly logger = new Logger(WhatsAppApiClient.name);
  private config: WhatsAppConfig | null = null;
  private readonly resilience?: IntegrationResilienceService;
  private readonly integrationId: string;

  constructor(
    private readonly httpService: HttpService,
    resilience?: IntegrationResilienceService,
    integrationId = 'whatsapp',
  ) {
    this.resilience = resilience;
    this.integrationId = integrationId;
  }

  private async executeResilient<T>(
    operation: string,
    action: () => Promise<T>,
  ): Promise<T> {
    if (!this.resilience) {
      return action();
    }

    return this.resilience.execute(
      {
        integrationId: this.integrationId,
        operation,
        timeoutMs: 20_000,
        maxRetries: 2,
        baseDelayMs: 350,
        maxDelayMs: 7_000,
      },
      action,
    );
  }

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  configure(config: WhatsAppConfig): void {
    this.config = {
      ...config,
      apiVersion: config.apiVersion || DEFAULT_API_VERSION,
    };
    this.logger.log(
      `WhatsApp API client configured for WABA: ${config.businessAccountId}`,
    );
  }

  isConfigured(): boolean {
    return !!(this.config?.accessToken && this.config?.businessAccountId);
  }

  private getBaseUrl(): string {
    return `${META_GRAPH_API_BASE}/${this.config?.apiVersion}`;
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config?.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  // ===========================================================================
  // BUSINESS ACCOUNT INFO
  // ===========================================================================

  /**
   * Get WhatsApp Business Account details
   */
  async getBusinessAccount(): Promise<WhatsAppBusinessAccount> {
    this.ensureConfigured();

    const url = `${this.getBaseUrl()}/${this.config!.businessAccountId}`;
    const params = {
      fields:
        'id,name,timezone_id,message_template_namespace,account_review_status,business_verification_status',
    };

    const response: AxiosResponse<WhatsAppBusinessAccount> =
      await this.executeResilient('getBusinessAccount', () =>
        firstValueFrom(
          this.httpService.get(url, {
            headers: this.getHeaders(),
            params,
          }),
        ),
      );

    return response.data;
  }

  /**
   * Get phone numbers associated with the business account
   */
  async getPhoneNumbers(): Promise<WhatsAppPhoneNumberInfo[]> {
    this.ensureConfigured();

    const url = `${this.getBaseUrl()}/${this.config!.businessAccountId}/phone_numbers`;
    const params = {
      fields:
        'id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status,code_verification_status,name_status',
    };

    const response: AxiosResponse<
      MetaApiPaginatedResponse<WhatsAppPhoneNumberInfo>
    > = await this.executeResilient('getPhoneNumbers', () =>
      firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          params,
        }),
      ),
    );

    return response.data.data;
  }

  // ===========================================================================
  // TEMPLATES (READ-ONLY)
  // ===========================================================================

  /**
   * List all message templates from Meta's API
   */
  async listTemplates(
    queryParams?: WhatsAppTemplateQueryParams,
  ): Promise<MetaApiPaginatedResponse<WhatsAppTemplate>> {
    this.ensureConfigured();

    const url = `${this.getBaseUrl()}/${this.config!.businessAccountId}/message_templates`;
    const params: Record<string, string | number> = {
      fields:
        'id,name,language,status,category,components,quality_score,rejected_reason,previous_category',
      limit: queryParams?.limit || 50,
    };

    if (queryParams?.status) params.status = queryParams.status;
    if (queryParams?.category) params.category = queryParams.category;
    if (queryParams?.name_or_content)
      params.name_or_content = queryParams.name_or_content;
    if (queryParams?.language) params.language = queryParams.language;
    if (queryParams?.after) params.after = queryParams.after;
    if (queryParams?.before) params.before = queryParams.before;

    const response: AxiosResponse<MetaApiPaginatedResponse<WhatsAppTemplate>> =
      await this.executeResilient('listTemplates', () =>
        firstValueFrom(
          this.httpService.get(url, {
            headers: this.getHeaders(),
            params,
          }),
        ),
      );

    return response.data;
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: string): Promise<WhatsAppTemplate> {
    this.ensureConfigured();

    const url = `${this.getBaseUrl()}/${templateId}`;
    const params = {
      fields:
        'id,name,language,status,category,components,quality_score,rejected_reason,previous_category',
    };

    const response: AxiosResponse<WhatsAppTemplate> =
      await this.executeResilient('getTemplate', () =>
        firstValueFrom(
          this.httpService.get(url, {
            headers: this.getHeaders(),
            params,
          }),
        ),
      );

    return response.data;
  }

  /**
   * Get all templates with pagination handling
   */
  async getAllTemplates(): Promise<WhatsAppTemplate[]> {
    const allTemplates: WhatsAppTemplate[] = [];
    let after: string | undefined;

    do {
      const response = await this.listTemplates({ limit: 100, after });
      allTemplates.push(...response.data);
      after = response.paging?.cursors?.after;
    } while (after);

    return allTemplates;
  }

  // ===========================================================================
  // ANALYTICS (READ-ONLY)
  // ===========================================================================

  /**
   * Get conversation analytics
   */
  async getConversationAnalytics(
    params: WhatsAppAnalyticsQueryParams,
  ): Promise<WhatsAppConversationAnalytics[]> {
    this.ensureConfigured();

    const url = `${this.getBaseUrl()}/${this.config!.businessAccountId}/analytics`;
    const queryParams: Record<string, string | number> = {
      analytics_types: '["conversation_analytics"]',
      start: params.start,
      end: params.end,
      granularity: params.granularity,
    };

    this.setJsonArrayParam(queryParams, 'phone_numbers', params.phone_numbers);
    this.setJsonArrayParam(queryParams, 'country_codes', params.country_codes);

    const response: AxiosResponse<{
      data: { data_points: WhatsAppConversationAnalytics[] }[];
    }> = await this.executeResilient('getConversationAnalytics', () =>
      firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          params: queryParams,
        }),
      ),
    );

    return response.data.data[0]?.data_points || [];
  }

  /**
   * Get message analytics
   */
  async getMessageAnalytics(
    params: WhatsAppAnalyticsQueryParams,
  ): Promise<WhatsAppMessageAnalytics[]> {
    this.ensureConfigured();

    const phoneNumberId = this.config!.phoneNumberId;
    if (!phoneNumberId) {
      throw new Error('Phone number ID is required for message analytics');
    }

    const url = `${this.getBaseUrl()}/${phoneNumberId}`;
    const queryParams: Record<string, string | number> = {
      fields:
        'analytics.start(' +
        params.start +
        ').end(' +
        params.end +
        ').granularity(' +
        params.granularity +
        ')',
    };

    const response: AxiosResponse<{
      analytics: { data_points: WhatsAppMessageAnalytics[] };
    }> = await this.executeResilient('getMessageAnalytics', () =>
      firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          params: queryParams,
        }),
      ),
    );

    return (response.data as any).analytics?.data_points || [];
  }

  /**
   * Get template performance analytics
   */
  async getTemplateAnalytics(
    params: WhatsAppAnalyticsQueryParams,
  ): Promise<WhatsAppTemplateAnalytics[]> {
    this.ensureConfigured();

    const url = `${this.getBaseUrl()}/${this.config!.businessAccountId}/template_analytics`;
    const queryParams: Record<string, string | number> = {
      start: params.start,
      end: params.end,
      granularity: params.granularity,
    };

    this.setJsonArrayParam(queryParams, 'template_ids', params.template_ids);

    const response: AxiosResponse<{
      data: WhatsAppTemplateAnalytics[];
    }> = await this.executeResilient('getTemplateAnalytics', () =>
      firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          params: queryParams,
        }),
      ),
    );

    return response.data.data || [];
  }

  // ===========================================================================
  // HEALTH CHECK
  // ===========================================================================

  /**
   * Test connection to Meta Graph API
   */
  async testConnection(): Promise<boolean> {
    try {
      this.ensureConfigured();
      const account = await this.getBusinessAccount();
      return !!account?.id;
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get API health status including phone quality
   */
  async getHealthStatus(): Promise<{
    account: WhatsAppBusinessAccount;
    phoneNumbers: WhatsAppPhoneNumberInfo[];
    healthy: boolean;
    issues: string[];
  }> {
    this.ensureConfigured();

    const [account, phoneNumbers] = await Promise.all([
      this.getBusinessAccount(),
      this.getPhoneNumbers(),
    ]);

    const issues: string[] = [];

    // Check account status
    if (account.account_review_status === 'REJECTED') {
      issues.push('Business account review rejected');
    }
    if (account.business_verification_status !== 'verified') {
      issues.push('Business not verified');
    }

    // Check phone numbers
    for (const phone of phoneNumbers) {
      if (phone.quality_rating === 'RED') {
        issues.push(
          `Phone ${phone.display_phone_number} has RED quality rating`,
        );
      }
      if (phone.status !== 'CONNECTED') {
        issues.push(
          `Phone ${phone.display_phone_number} status: ${phone.status}`,
        );
      }
    }

    return {
      account,
      phoneNumbers,
      healthy: issues.length === 0,
      issues,
    };
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp API client not configured');
    }
  }

  private setJsonArrayParam(
    target: Record<string, string | number>,
    key: string,
    values: readonly unknown[] | undefined,
  ): void {
    if (!values?.length) {
      return;
    }
    const serialized = SafeJsonUtil.tryStringify(values);
    if (!serialized) {
      this.logger.warn(`Failed to serialize "${key}" query param; skipping`);
      return;
    }
    target[key] = serialized;
  }
}
