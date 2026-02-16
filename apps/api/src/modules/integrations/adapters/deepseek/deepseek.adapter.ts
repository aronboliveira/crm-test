import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IntegrationValueSanitizer } from '../shared/mail-integration.shared';
import type {
  IntegrationStatus,
  IntegrationAdapter,
  IntegrationConfig,
} from '../../types';

const DEEPSEEK_MODELS = [
  'deepseek-chat',
  'deepseek-coder',
  'deepseek-v3',
  'deepseek-reasoner',
] as const;

interface DeepSeekConfig extends Partial<IntegrationConfig> {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  apiBaseUrl?: string;
}

interface DeepSeekChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

@Injectable()
export class DeepSeekAdapter implements IntegrationAdapter {
  private readonly logger = new Logger(DeepSeekAdapter.name);
  private config: DeepSeekConfig = {};
  private isConnected = false;
  private lastError?: string;

  private static readonly DEFAULT_API_BASE = 'https://api.deepseek.com/v1';
  private static readonly DEFAULT_MODEL = 'deepseek-chat';
  private static readonly DEFAULT_TEMPERATURE = 0.7;
  private static readonly DEFAULT_MAX_TOKENS = 4096;
  private static readonly DEFAULT_SYSTEM_PROMPT =
    'You are Gepeto, a helpful CRM assistant powered by DeepSeek.';

  constructor(private readonly httpService: HttpService) {}

  async getStatus(): Promise<IntegrationStatus> {
    return {
      id: 'deepseek',
      name: 'DeepSeek',
      type: 'LLM/Chatbot',
      configured: this.isConfigured(),
      status: this.isConnected ? 'connected' : 'disconnected',
      lastSyncAt: undefined,
      lastError: this.lastError,
      features: [
        'DeepSeek Chat & Coder models',
        'DeepSeek V3 support',
        'DeepSeek Reasoner (R1) support',
        'OpenAI-compatible API',
        'Context-aware conversations',
        'Code generation',
        'Chain-of-thought reasoning',
      ],
    };
  }

  async configure(config: Partial<IntegrationConfig>): Promise<void> {
    const merged = { ...this.config, ...config };
    this.config = {
      apiKey: IntegrationValueSanitizer.normalizeString(merged.apiKey),
      model: this.normalizeModel(merged.model),
      temperature: this.normalizeTemperature(merged.temperature),
      maxTokens: this.normalizeMaxTokens(merged.maxTokens),
      systemPrompt: IntegrationValueSanitizer.normalizeString(
        merged.systemPrompt,
      ),
      apiBaseUrl: IntegrationValueSanitizer.normalizeString(merged.apiBaseUrl),
    };
    this.isConnected = false;
    this.lastError = undefined;
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      this.lastError = 'DeepSeek not configured';
      return false;
    }

    const apiKey = this.config.apiKey!.trim();
    const baseUrl = this.config.apiBaseUrl || DeepSeekAdapter.DEFAULT_API_BASE;
    const model = this.config.model || DeepSeekAdapter.DEFAULT_MODEL;
    const systemPrompt =
      this.config.systemPrompt || DeepSeekAdapter.DEFAULT_SYSTEM_PROMPT;

    try {
      const url = baseUrl + '/chat/completions';
      const response = await firstValueFrom(
        this.httpService.post<DeepSeekChatResponse>(
          url,
          {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: 'Test. Reply with OK.' },
            ],
            max_tokens: 10,
            temperature: 0.1,
          },
          {
            headers: {
              Authorization: 'Bearer ' + apiKey,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          },
        ),
      );

      const content = response.data?.choices?.[0]?.message?.content ?? '';
      if (!content || content.trim().length === 0) {
        this.lastError = 'DeepSeek returned empty response';
        this.isConnected = false;
        return false;
      }

      this.isConnected = true;
      this.lastError = undefined;
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('DeepSeek connection test failed: ' + message);
      this.lastError = message;
      this.isConnected = false;
      return false;
    }
  }

  isConfigured(): boolean {
    return IntegrationValueSanitizer.hasString(this.config.apiKey);
  }

  resolveConfig(): DeepSeekConfig {
    return {
      ...this.config,
      model: this.config.model || DeepSeekAdapter.DEFAULT_MODEL,
      temperature:
        this.config.temperature ?? DeepSeekAdapter.DEFAULT_TEMPERATURE,
      maxTokens: this.config.maxTokens ?? DeepSeekAdapter.DEFAULT_MAX_TOKENS,
      systemPrompt:
        this.config.systemPrompt || DeepSeekAdapter.DEFAULT_SYSTEM_PROMPT,
      apiBaseUrl: this.config.apiBaseUrl || DeepSeekAdapter.DEFAULT_API_BASE,
    };
  }

  private normalizeModel(model?: string): string {
    const sanitized = IntegrationValueSanitizer.normalizeString(model);
    if (!sanitized) return DeepSeekAdapter.DEFAULT_MODEL;
    const found = DEEPSEEK_MODELS.find((m) => sanitized.startsWith(m));
    return found ?? DeepSeekAdapter.DEFAULT_MODEL;
  }

  private normalizeTemperature(value?: unknown): number {
    if (typeof value !== 'number' || isNaN(value)) {
      return DeepSeekAdapter.DEFAULT_TEMPERATURE;
    }
    return Math.max(0, Math.min(2, value));
  }

  private normalizeMaxTokens(value?: unknown): number {
    if (typeof value !== 'number' || isNaN(value) || value < 1) {
      return DeepSeekAdapter.DEFAULT_MAX_TOKENS;
    }
    return Math.min(128000, Math.max(1, Math.floor(value)));
  }
}
