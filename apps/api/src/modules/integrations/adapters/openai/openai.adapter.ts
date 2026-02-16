import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type {
  IntegrationAdapter,
  IntegrationConfig,
  IntegrationStatus,
} from '../../types';

type OpenAiResolvedConfig = Readonly<{
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  apiBaseUrl: string;
}>;

@Injectable()
export class OpenAiAdapter implements IntegrationAdapter {
  private readonly logger = new Logger(OpenAiAdapter.name);
  private config: IntegrationConfig = {};
  private connected = false;
  private lastError?: string;

  constructor(private readonly httpService: HttpService) {}

  getStatus(): Promise<IntegrationStatus> {
    const configured = this.isConfigured();
    return Promise.resolve({
      id: 'openai',
      name: 'OpenAI',
      type: 'LLM/Chatbot',
      status: !configured
        ? 'disconnected'
        : this.lastError
          ? 'error'
          : this.connected
            ? 'connected'
            : 'disconnected',
      configured,
      lastError: this.lastError,
      features: [
        'Assistant chat responses',
        'GPT model selection',
        'Custom system prompt',
        'Token and temperature tuning',
      ],
    });
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      this.connected = false;
      this.lastError = 'OpenAI not configured';
      return false;
    }

    const resolved = this.resolveConfig();
    if (!resolved) {
      this.connected = false;
      this.lastError = 'Invalid OpenAI configuration';
      return false;
    }

    try {
      const payload = {
        model: resolved.model,
        messages: [
          {
            role: 'system',
            content:
              resolved.systemPrompt ||
              'You are a CRM assistant. Reply with OK.',
          },
          { role: 'user', content: 'Health check. Reply with OK.' },
        ],
        temperature: resolved.temperature,
        max_tokens: Math.min(resolved.maxTokens, 32),
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${resolved.apiBaseUrl}/chat/completions`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${resolved.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 20_000,
          },
        ),
      );

      const text =
        response?.data?.choices?.[0]?.message?.content?.toString()?.trim() ||
        '';

      this.connected = text.length > 0;
      this.lastError = this.connected
        ? undefined
        : 'OpenAI returned empty response';
      return this.connected;
    } catch (error) {
      this.connected = false;
      this.lastError = error instanceof Error ? error.message : String(error);
      this.logger.warn(`OpenAI connection test failed: ${this.lastError}`);
      return false;
    }
  }

  configure(config: Partial<IntegrationConfig>): Promise<void> {
    const merged: IntegrationConfig = {
      ...this.config,
      ...config,
    };

    this.config = {
      ...merged,
      model: this.normalizeModel(merged.model),
      temperature: this.normalizeTemperature(merged.temperature),
      maxTokens: this.normalizeMaxTokens(merged.maxTokens),
      apiBaseUrl: this.normalizeApiBaseUrl(merged.apiBaseUrl),
    };

    this.connected = false;
    this.lastError = undefined;

    return Promise.resolve();
  }

  private isConfigured(): boolean {
    return (
      typeof this.config.apiKey === 'string' &&
      this.config.apiKey.trim().length > 0
    );
  }

  private resolveConfig(): OpenAiResolvedConfig | null {
    if (!this.isConfigured()) return null;

    const apiKey = this.config.apiKey;
    if (typeof apiKey !== 'string') {
      return null;
    }

    return {
      apiKey: apiKey.trim(),
      model: this.normalizeModel(this.config.model),
      temperature: this.normalizeTemperature(this.config.temperature),
      maxTokens: this.normalizeMaxTokens(this.config.maxTokens),
      systemPrompt:
        typeof this.config.systemPrompt === 'string' &&
        this.config.systemPrompt.trim()
          ? this.config.systemPrompt.trim()
          : undefined,
      apiBaseUrl: this.normalizeApiBaseUrl(this.config.apiBaseUrl),
    };
  }

  private normalizeModel(value: unknown): string {
    const model = typeof value === 'string' ? value.trim() : '';
    return model || 'gpt-4-turbo-preview';
  }

  private normalizeTemperature(value: unknown): number {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return 0.7;
    if (n < 0) return 0;
    if (n > 2) return 2;
    return n;
  }

  private normalizeMaxTokens(value: unknown): number {
    const n = Math.trunc(typeof value === 'number' ? value : Number(value));
    if (!Number.isFinite(n) || n < 1) return 1000;
    if (n > 128000) return 128000;
    return n;
  }

  private normalizeApiBaseUrl(value: unknown): string {
    const v = typeof value === 'string' ? value.trim() : '';
    return v || 'https://api.openai.com/v1';
  }
}
