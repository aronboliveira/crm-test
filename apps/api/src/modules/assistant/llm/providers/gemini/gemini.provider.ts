/**
 * @fileoverview Google Gemini Provider Implementation
 * @module assistant/llm/providers/gemini
 *
 * Implements LlmProviderStrategy for Google Gemini models.
 * Supports Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 2.0 variants.
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  LlmProviderStrategy,
  LlmProviderConfig,
  LlmContext,
  LlmResponse,
  LlmError,
  LlmErrorType,
  type LlmProviderType,
} from '../../interfaces/llm-provider-strategy.interface';
import type {
  GeminiContent,
  GeminiGenerateContentRequest,
  GeminiGenerateContentResponse,
  GeminiErrorResponse,
} from './gemini.types';

@Injectable()
export class GeminiProvider implements LlmProviderStrategy {
  private readonly logger = new Logger(GeminiProvider.name);
  readonly providerType: LlmProviderType = 'gemini';

  private static readonly DEFAULT_BASE_URL =
    'https://generativelanguage.googleapis.com/v1beta';
  private static readonly DEFAULT_MODEL = 'gemini-1.5-flash';
  private static readonly DEFAULT_TEMPERATURE = 0.7;
  private static readonly DEFAULT_MAX_TOKENS = 4096;
  private static readonly DEFAULT_SYSTEM_PROMPT =
    'You are Gepeto, a helpful CRM assistant powered by Google Gemini. You help users manage their customer relationships, tasks, projects, and business processes efficiently.';

  private static readonly CHARS_PER_TOKEN = 4; // Rough estimate

  constructor(private readonly httpService: HttpService) {}

  /**
   * Generate response from Gemini model
   */
  async generateResponse(
    prompt: string,
    context: LlmContext,
    config: LlmProviderConfig,
  ): Promise<LlmResponse> {
    this.logger.debug(
      'Generating response for user ' +
        context.userId +
        ' with model ' +
        config.model,
    );

    const apiKey = config.apiKey;
    if (!apiKey || apiKey.trim().length === 0) {
      throw new LlmError(
        LlmErrorType.AUTH_ERROR,
        'Gemini API key is missing or empty',
      );
    }

    const model = config.model || GeminiProvider.DEFAULT_MODEL;
    const baseUrl = config.apiBaseUrl || GeminiProvider.DEFAULT_BASE_URL;
    const url =
      baseUrl + '/models/' + model + ':generateContent?key=' + apiKey.trim();

    const contents = this.buildContents(prompt, context);
    const requestBody: GeminiGenerateContentRequest = {
      contents,
      systemInstruction: {
        parts: [
          { text: config.systemPrompt || GeminiProvider.DEFAULT_SYSTEM_PROMPT },
        ],
      },
      generationConfig: {
        temperature: config.temperature ?? GeminiProvider.DEFAULT_TEMPERATURE,
        maxOutputTokens: config.maxTokens ?? GeminiProvider.DEFAULT_MAX_TOKENS,
      },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<GeminiGenerateContentResponse>(url, requestBody, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }),
      );

      return this.mapResponse(response.data, model);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /**
   * Validate Gemini configuration
   */
  validateConfig(config: Partial<LlmProviderConfig>): boolean {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      this.logger.warn('Gemini config validation failed: missing apiKey');
      return false;
    }

    // Gemini API keys typically start with 'AIza'
    if (!config.apiKey.startsWith('AIza')) {
      this.logger.warn(
        'Gemini config validation failed: invalid apiKey format',
      );
      return false;
    }

    if (config.model && !this.isSupportedModel(config.model)) {
      this.logger.warn(
        'Gemini config validation failed: unsupported model ' + config.model,
      );
      return false;
    }

    if (config.temperature !== undefined) {
      if (config.temperature < 0 || config.temperature > 2) {
        this.logger.warn(
          'Gemini config validation failed: temperature must be between 0 and 2',
        );
        return false;
      }
    }

    if (config.maxTokens !== undefined) {
      if (config.maxTokens < 1 || config.maxTokens > 1000000) {
        this.logger.warn(
          'Gemini config validation failed: maxTokens must be between 1 and 1000000',
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / GeminiProvider.CHARS_PER_TOKEN);
  }

  /**
   * Test connection to Gemini API
   */
  async testConnection(config: LlmProviderConfig): Promise<boolean> {
    try {
      const response = await this.generateResponse(
        'Test connection. Respond with OK.',
        {
          userId: 'system',
          userEmail: 'system@test',
          userRole: 'system',
        },
        {
          ...config,
          maxTokens: 10,
        },
      );

      return response.text.length > 0;
    } catch (error) {
      this.logger.error('Gemini connection test failed', error);
      return false;
    }
  }

  /* ────────────────────────────────────────────────────────────────────── */
  /*  Private Helper Methods                                                */
  /* ────────────────────────────────────────────────────────────────────── */

  /**
   * Build contents array for Gemini API
   */
  private buildContents(prompt: string, context: LlmContext): GeminiContent[] {
    const contents: GeminiContent[] = [];

    // Conversation history
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      for (const msg of context.conversationHistory) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Current user message
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    return contents;
  }

  /**
   * Map Gemini response to LlmResponse
   */
  private mapResponse(
    data: GeminiGenerateContentResponse,
    model: string,
  ): LlmResponse {
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
      throw new LlmError(
        LlmErrorType.UNKNOWN,
        'Gemini response missing content',
      );
    }

    const text = candidate.content.parts.map((p) => p.text || '').join('');

    return {
      text,
      model,
      promptTokens: data.usageMetadata?.promptTokenCount,
      completionTokens: data.usageMetadata?.candidatesTokenCount,
      totalTokens: data.usageMetadata?.totalTokenCount,
      finishReason: this.mapFinishReason(candidate.finishReason),
      metadata: {
        safetyRatings: candidate.safetyRatings,
        citationMetadata: candidate.citationMetadata,
      },
    };
  }

  /**
   * Map Gemini finish reason to standard format
   */
  private mapFinishReason(reason?: string): string | undefined {
    if (!reason) return undefined;
    const map: Record<string, string> = {
      STOP: 'stop',
      MAX_TOKENS: 'length',
      SAFETY: 'content_filter',
      RECITATION: 'content_filter',
      OTHER: 'other',
    };
    return map[reason] || reason.toLowerCase();
  }

  /**
   * Map error to LlmError
   */
  private mapError(error: unknown): LlmError {
    if (this.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const data = error.response.data as GeminiErrorResponse;
      const errorMessage = data?.error?.message || error.message;

      if (status === 401 || status === 403) {
        return new LlmError(
          LlmErrorType.AUTH_ERROR,
          'Gemini authentication failed: ' + errorMessage,
          this.toError(error),
        );
      }

      if (status === 429) {
        return new LlmError(
          LlmErrorType.RATE_LIMIT,
          'Gemini rate limit exceeded: ' + errorMessage,
          this.toError(error),
        );
      }

      if (status === 400) {
        // Check for content filter
        if (
          data?.error?.status === 'INVALID_ARGUMENT' &&
          data?.error?.message?.includes('safety')
        ) {
          return new LlmError(
            LlmErrorType.CONTENT_FILTER,
            'Gemini content filtered: ' + errorMessage,
            this.toError(error),
          );
        }
        return new LlmError(
          LlmErrorType.INVALID_REQUEST,
          'Gemini invalid request: ' + errorMessage,
          this.toError(error),
        );
      }

      if (status >= 500) {
        return new LlmError(
          LlmErrorType.NETWORK_ERROR,
          'Gemini server error: ' + errorMessage,
          this.toError(error),
        );
      }
    }

    if (this.isAxiosError(error) && error.code === 'ECONNABORTED') {
      return new LlmError(
        LlmErrorType.NETWORK_ERROR,
        'Gemini request timeout',
        this.toError(error),
      );
    }

    return new LlmError(
      LlmErrorType.UNKNOWN,
      'Gemini error: ' +
        (error instanceof Error ? error.message : String(error)),
      error instanceof Error ? error : undefined,
    );
  }

  private toError(error: unknown): Error | undefined {
    if (error instanceof Error) return error;
    if (this.isAxiosError(error)) return new Error(error.message);
    return undefined;
  }

  /**
   * Check if model is supported
   */
  private isSupportedModel(model: string): boolean {
    const supportedModels = [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro',
      'gemini-2.0-flash',
      'gemini-2.0-pro',
      'gemini-pro',
    ];
    return supportedModels.some((m) => model.startsWith(m));
  }

  /**
   * Type guard for axios errors
   */
  private isAxiosError(error: unknown): error is {
    response?: { status: number; data: unknown };
    message: string;
    code?: string;
  } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as Record<string, unknown>).message === 'string'
    );
  }
}
