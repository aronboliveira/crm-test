import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IntegrationValueSanitizer } from '../shared/mail-integration.shared';
import type {
  IntegrationStatus,
  IntegrationAdapter,
  IntegrationConfig,
} from '../../types';

const GEMINI_MODELS = [
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.0-pro',
  'gemini-2.0-flash',
  'gemini-2.0-pro',
] as const;

interface GeminiConfig extends Partial<IntegrationConfig> {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

@Injectable()
export class GeminiAdapter implements IntegrationAdapter {
  private readonly logger = new Logger(GeminiAdapter.name);
  private config: GeminiConfig = {};
  private isConnected = false;
  private lastError?: string;

  private static readonly DEFAULT_API_BASE =
    'https://generativelanguage.googleapis.com/v1beta';
  private static readonly DEFAULT_MODEL = 'gemini-1.5-flash';
  private static readonly DEFAULT_TEMPERATURE = 0.7;
  private static readonly DEFAULT_MAX_TOKENS = 4096;
  private static readonly DEFAULT_SYSTEM_INSTRUCTION =
    'You are Gepeto, a helpful CRM assistant powered by Google Gemini.';

  constructor(private readonly httpService: HttpService) {}

  async getStatus(): Promise<IntegrationStatus> {
    return {
      id: 'gemini',
      name: 'Google Gemini',
      type: 'LLM/Chatbot',
      configured: this.isConfigured(),
      status: this.isConnected ? 'connected' : 'disconnected',
      lastSyncAt: undefined,
      lastError: this.lastError,
      features: [
        'Gemini 1.5 Pro & Flash models',
        'Gemini 2.0 models support',
        'Multimodal capabilities',
        'Long context window (1M+ tokens)',
        'Context-aware conversations',
        'Code generation & analysis',
        'Google AI integration',
      ],
    };
  }

  async configure(config: Partial<IntegrationConfig>): Promise<void> {
    const merged = { ...this.config, ...config };
    this.config = {
      apiKey: IntegrationValueSanitizer.normalizeString(merged.apiKey),
      model: this.normalizeModel(merged.model),
      temperature: this.normalizeTemperature(merged.temperature),
      maxOutputTokens: this.normalizeMaxTokens(merged.maxOutputTokens),
      systemInstruction: IntegrationValueSanitizer.normalizeString(
        merged.systemInstruction,
      ),
    };
    this.isConnected = false;
    this.lastError = undefined;
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      this.lastError = 'Gemini not configured';
      return false;
    }

    const apiKey = this.config.apiKey!.trim();
    const model = this.config.model || GeminiAdapter.DEFAULT_MODEL;

    try {
      const url =
        GeminiAdapter.DEFAULT_API_BASE +
        '/models/' +
        model +
        ':generateContent?key=' +
        apiKey;

      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Test. Reply with OK.' }],
          },
        ],
        systemInstruction: {
          parts: [
            {
              text:
                this.config.systemInstruction ||
                GeminiAdapter.DEFAULT_SYSTEM_INSTRUCTION,
            },
          ],
        },
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 10,
        },
      };

      const response = await firstValueFrom(
        this.httpService.post<GeminiGenerateResponse>(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        }),
      );

      const content =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!content || content.trim().length === 0) {
        this.lastError = 'Gemini returned empty response';
        this.isConnected = false;
        return false;
      }

      this.isConnected = true;
      this.lastError = undefined;
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Gemini connection test failed: ' + message);
      this.lastError = message;
      this.isConnected = false;
      return false;
    }
  }

  isConfigured(): boolean {
    return IntegrationValueSanitizer.hasString(this.config.apiKey);
  }

  resolveConfig(): GeminiConfig {
    return {
      ...this.config,
      model: this.config.model || GeminiAdapter.DEFAULT_MODEL,
      temperature: this.config.temperature ?? GeminiAdapter.DEFAULT_TEMPERATURE,
      maxOutputTokens:
        this.config.maxOutputTokens ?? GeminiAdapter.DEFAULT_MAX_TOKENS,
      systemInstruction:
        this.config.systemInstruction ||
        GeminiAdapter.DEFAULT_SYSTEM_INSTRUCTION,
    };
  }

  private normalizeModel(model?: string): string {
    const sanitized = IntegrationValueSanitizer.normalizeString(model);
    if (!sanitized) return GeminiAdapter.DEFAULT_MODEL;
    const found = GEMINI_MODELS.find((m) => sanitized.startsWith(m));
    return found ?? GeminiAdapter.DEFAULT_MODEL;
  }

  private normalizeTemperature(value?: unknown): number {
    if (typeof value !== 'number' || isNaN(value)) {
      return GeminiAdapter.DEFAULT_TEMPERATURE;
    }
    return Math.max(0, Math.min(2, value));
  }

  private normalizeMaxTokens(value?: unknown): number {
    if (typeof value !== 'number' || isNaN(value) || value < 1) {
      return GeminiAdapter.DEFAULT_MAX_TOKENS;
    }
    return Math.min(1000000, Math.max(1, Math.floor(value)));
  }
}
