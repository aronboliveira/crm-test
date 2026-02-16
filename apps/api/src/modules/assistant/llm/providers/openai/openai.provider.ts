/**
 * @fileoverview OpenAI Provider Implementation
 * @module assistant/llm/providers/openai
 *
 * Implements LlmProviderStrategy for OpenAI GPT models.
 * Supports GPT-4, GPT-4 Turbo, GPT-3.5 Turbo.
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
  LlmMessage,
  type LlmProviderType,
} from '../../interfaces/llm-provider-strategy.interface';
import type {
  OpenAiChatCompletionRequest,
  OpenAiChatCompletionResponse,
  OpenAiErrorResponse,
} from './openai.types';

@Injectable()
export class OpenAiProvider implements LlmProviderStrategy {
  private readonly logger = new Logger(OpenAiProvider.name);
  readonly providerType: LlmProviderType = 'openai';

  private static readonly DEFAULT_BASE_URL = 'https://api.openai.com/v1';
  private static readonly DEFAULT_MODEL = 'gpt-4-turbo-preview';
  private static readonly DEFAULT_TEMPERATURE = 0.7;
  private static readonly DEFAULT_MAX_TOKENS = 1000;
  private static readonly DEFAULT_SYSTEM_PROMPT =
    'You are Gepeto, a helpful CRM assistant powered by OpenAI. You help users manage their customer relationships, tasks, projects, and business processes efficiently.';

  private static readonly CHARS_PER_TOKEN = 4; // Rough estimate for English text

  constructor(private readonly httpService: HttpService) {}

  /**
   * Generate response from OpenAI GPT model
   */
  async generateResponse(
    prompt: string,
    context: LlmContext,
    config: LlmProviderConfig,
  ): Promise<LlmResponse> {
    this.logger.debug(
      `Generating response for user ${context.userId} with model ${config.model}`,
    );

    const apiKey = config.apiKey;
    if (!apiKey || apiKey.trim().length === 0) {
      throw new LlmError(
        LlmErrorType.AUTH_ERROR,
        'OpenAI API key is missing or empty',
      );
    }

    const baseUrl = config.apiBaseUrl || OpenAiProvider.DEFAULT_BASE_URL;
    const url = `${baseUrl}/chat/completions`;

    const messages = this.buildMessages(prompt, context, config);
    const requestBody: OpenAiChatCompletionRequest = {
      model: config.model || OpenAiProvider.DEFAULT_MODEL,
      messages,
      temperature: config.temperature ?? OpenAiProvider.DEFAULT_TEMPERATURE,
      max_tokens: config.maxTokens ?? OpenAiProvider.DEFAULT_MAX_TOKENS,
      user: context.userId, // For OpenAI abuse monitoring
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<OpenAiChatCompletionResponse>(url, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 30000, // 30s timeout
        }),
      );

      return this.mapResponse(response.data);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /**
   * Validate OpenAI configuration
   */
  validateConfig(config: Partial<LlmProviderConfig>): boolean {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      this.logger.warn('OpenAI config validation failed: missing apiKey');
      return false;
    }

    // API key should start with 'sk-'
    if (!config.apiKey.startsWith('sk-')) {
      this.logger.warn(
        'OpenAI config validation failed: invalid apiKey format',
      );
      return false;
    }

    if (config.model && !this.isSupportedModel(config.model)) {
      this.logger.warn(
        `OpenAI config validation failed: unsupported model ${config.model}`,
      );
      return false;
    }

    if (config.temperature !== undefined) {
      if (config.temperature < 0 || config.temperature > 2) {
        this.logger.warn(
          `OpenAI config validation failed: temperature must be between 0 and 2`,
        );
        return false;
      }
    }

    if (config.maxTokens !== undefined) {
      if (config.maxTokens < 1 || config.maxTokens > 128000) {
        this.logger.warn(
          `OpenAI config validation failed: maxTokens must be between 1 and 128000`,
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
    // Rough estimate: ~4 chars per token for English
    return Math.ceil(text.length / OpenAiProvider.CHARS_PER_TOKEN);
  }

  /**
   * Test connection to OpenAI API
   */
  async testConnection(config: LlmProviderConfig): Promise<boolean> {
    try {
      // Send a minimal test request
      const response = await this.generateResponse(
        'Test connection. Respond with OK.',
        {
          userId: 'system',
          userEmail: 'system@test',
          userRole: 'system',
        },
        {
          ...config,
          maxTokens: 10, // Minimal tokens for test
        },
      );

      return response.text.length > 0;
    } catch (error) {
      this.logger.error('OpenAI connection test failed', error);
      return false;
    }
  }

  /* ────────────────────────────────────────────────────────────────────── */
  /*  Private Helper Methods                                                */
  /* ────────────────────────────────────────────────────────────────────── */

  /**
   * Build message array for OpenAI API
   */
  private buildMessages(
    prompt: string,
    context: LlmContext,
    config: LlmProviderConfig,
  ): LlmMessage[] {
    const messages: LlmMessage[] = [];

    // System message
    const systemPrompt =
      config.systemPrompt || OpenAiProvider.DEFAULT_SYSTEM_PROMPT;
    messages.push({ role: 'system', content: systemPrompt });

    // Conversation history
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      messages.push(...context.conversationHistory);
    }

    // Current user message
    messages.push({ role: 'user', content: prompt });

    return messages;
  }

  /**
   * Map OpenAI response to LlmResponse
   */
  private mapResponse(data: OpenAiChatCompletionResponse): LlmResponse {
    const choice = data.choices[0];
    if (!choice || !choice.message) {
      throw new LlmError(
        LlmErrorType.UNKNOWN,
        'OpenAI response missing message content',
      );
    }

    return {
      text: choice.message.content || '',
      model: data.model,
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
      finishReason: choice.finish_reason ?? undefined,
      metadata: {
        id: data.id,
        created: data.created,
        systemFingerprint: data.system_fingerprint,
      },
    };
  }

  /**
   * Map axios error to LlmError
   */
  private mapError(error: unknown): LlmError {
    // Axios error with response
    if (this.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const data = error.response.data as OpenAiErrorResponse;
      const errorMessage = data?.error?.message || error.message;

      if (status === 401 || status === 403) {
        return new LlmError(
          LlmErrorType.AUTH_ERROR,
          `OpenAI authentication failed: ${errorMessage}`,
          this.toError(error),
        );
      }

      if (status === 429) {
        return new LlmError(
          LlmErrorType.RATE_LIMIT,
          `OpenAI rate limit exceeded: ${errorMessage}`,
          this.toError(error),
        );
      }

      if (status === 400) {
        return new LlmError(
          LlmErrorType.INVALID_REQUEST,
          `OpenAI invalid request: ${errorMessage}`,
          this.toError(error),
        );
      }

      if (status >= 500) {
        return new LlmError(
          LlmErrorType.NETWORK_ERROR,
          `OpenAI server error: ${errorMessage}`,
          this.toError(error),
        );
      }
    }

    // Network/timeout error
    if (this.isAxiosError(error) && error.code === 'ECONNABORTED') {
      return new LlmError(
        LlmErrorType.NETWORK_ERROR,
        'OpenAI request timeout',
        this.toError(error),
      );
    }

    // Generic error
    return new LlmError(
      LlmErrorType.UNKNOWN,
      `OpenAI error: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined,
    );
  }

  private toError(error: unknown): Error | undefined {
    if (error instanceof Error) {
      return error;
    }
    if (this.isAxiosError(error)) {
      return new Error(error.message);
    }
    return undefined;
  }

  /**
   * Check if model is supported
   */
  private isSupportedModel(model: string): boolean {
    const supportedModels = [
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-4',
      'gpt-4-0613',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'gpt-4o',
      'gpt-4o-mini',
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
      typeof (error as any).message === 'string'
    );
  }
}
