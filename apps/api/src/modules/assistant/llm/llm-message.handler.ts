/**
 * @fileoverview LLM Message Handler
 * @module assistant/llm
 *
 * Main message handler implementing AssistantMessageHandler port.
 * Orchestrates LLM provider selection and request/response flow.
 *
 * **SOLID Principles:**
 * - **Single Responsibility**: Orchestrates LLM communication only
 * - **Dependency Inversion**: Depends on LlmProviderStrategy abstraction
 * - **Open/Closed**: New providers can be added without modification
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  AssistantMessageHandler,
  AssistantMessageHandlerInput,
  AssistantMessageHandlerResult,
} from '../assistant-message-handler.port';
import { IntegrationConfigsService } from '../../integrations/integration-configs.service';
import {
  LlmProviderStrategy,
  LlmProviderConfig,
  LlmError,
  LlmErrorType,
  type LlmProviderType,
} from './interfaces/llm-provider-strategy.interface';
import { OpenAiProvider } from './providers/openai/openai.provider';

@Injectable()
export class LlmMessageHandler implements AssistantMessageHandler {
  private readonly logger = new Logger(LlmMessageHandler.name);

  private static readonly LLM_INTEGRATION_ID = 'openai'; // For now, hardcoded; can be dynamic later
  private static readonly FALLBACK_RESPONSE =
    'Sorry, the AI assistant is currently unavailable. Please configure an LLM provider in the Integrations page.';
  private static readonly ERROR_RESPONSE_PREFIX = 'AI Error: ';

  constructor(
    private readonly integrationConfigs: IntegrationConfigsService,
    private readonly openAiProvider: OpenAiProvider,
    // Add other providers here as they're implemented:
    // private readonly anthropicProvider: AnthropicProvider,
  ) {}

  /**
   * Handle user message and generate LLM response
   */
  async handleUserMessage(
    input: AssistantMessageHandlerInput,
  ): Promise<AssistantMessageHandlerResult> {
    const userMessage = String(input.text ?? '').trim();
    if (!userMessage) {
      return {
        text: 'Please provide a message.',
        meta: { handler: 'llm', error: 'empty_message' },
      };
    }

    this.logger.debug(
      `Handling message for user ${input.context.userId}: "${userMessage.substring(0, 50)}..."`,
    );

    try {
      // Load LLM provider configuration
      const config = await this.loadLlmConfig();
      if (!config) {
        this.logger.warn('No LLM provider configured');
        return {
          text: LlmMessageHandler.FALLBACK_RESPONSE,
          meta: { handler: 'llm', error: 'not_configured' },
        };
      }

      // Select provider based on config
      const provider = this.selectProvider(config.provider);
      if (!provider) {
        this.logger.error(`Unsupported provider: ${config.provider}`);
        return {
          text: `${LlmMessageHandler.ERROR_RESPONSE_PREFIX}Provider ${config.provider} is not supported.`,
          meta: { handler: 'llm', error: 'unsupported_provider' },
        };
      }

      // Generate response
      const response = await provider.generateResponse(
        userMessage,
        {
          userId: input.context.userId,
          userEmail: input.context.email,
          userRole: input.context.role,
          conversationHistory: [],
        },
        config,
      );

      this.logger.debug(
        `Generated response for user ${input.context.userId}: ${response.totalTokens} tokens`,
      );

      return {
        text: response.text,
        meta: {
          handler: 'llm',
          provider: config.provider,
          model: response.model,
          tokens: response.totalTokens,
          messageId: input.context.messageId,
        },
      };
    } catch (error) {
      return this.handleError(error, input.context.userId);
    }
  }

  /* ────────────────────────────────────────────────────────────────────── */
  /*  Private Helper Methods                                                */
  /* ────────────────────────────────────────────────────────────────────── */

  /**
   * Load LLM provider configuration from IntegrationConfigsService
   */
  private async loadLlmConfig(): Promise<LlmProviderConfig | null> {
    try {
      const rawConfig = await this.integrationConfigs.getConfig(
        LlmMessageHandler.LLM_INTEGRATION_ID,
      );

      if (!rawConfig) {
        return null;
      }

      // Map integration config to LLM provider config
      const provider: LlmProviderType =
        rawConfig.provider === 'openai' ? 'openai' : 'openai'; // Default to openai for now

      return {
        provider,
        apiKey: rawConfig.apiKey || '',
        model: rawConfig.model || 'gpt-4-turbo-preview',
        temperature: rawConfig.temperature,
        maxTokens: rawConfig.maxTokens,
        systemPrompt: rawConfig.systemPrompt,
        apiBaseUrl: rawConfig.apiBaseUrl,
      };
    } catch (error) {
      this.logger.error('Failed to load LLM config', error);
      return null;
    }
  }

  /**
   * Select provider instance based on type
   */
  private selectProvider(type: LlmProviderType): LlmProviderStrategy | null {
    switch (type) {
      case 'openai':
        return this.openAiProvider;
      // case 'anthropic':
      //   return this.anthropicProvider;
      default:
        this.logger.warn(`Unsupported LLM provider type: ${type}`);
        return null;
    }
  }

  /**
   * Handle errors and return user-friendly messages
   */
  private handleError(
    error: unknown,
    userId: string,
  ): AssistantMessageHandlerResult {
    // Structured LLM error
    if (error instanceof LlmError) {
      this.logger.error(
        `LLM error for user ${userId}: ${error.type} - ${error.message}`,
        error.cause,
      );

      const userMessage = this.getUserFriendlyMessage(error);
      return {
        text: `${LlmMessageHandler.ERROR_RESPONSE_PREFIX}${userMessage}`,
        meta: {
          handler: 'llm',
          error: error.type,
          errorMessage: error.message,
        },
      };
    }

    // Generic error
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`Unexpected error for user ${userId}: ${message}`, error);

    return {
      text: `${LlmMessageHandler.ERROR_RESPONSE_PREFIX}An unexpected error occurred. Please try again later.`,
      meta: {
        handler: 'llm',
        error: 'unknown',
        errorMessage: message,
      },
    };
  }

  /**
   * Map LlmError to user-friendly message
   */
  private getUserFriendlyMessage(error: LlmError): string {
    switch (error.type) {
      case LlmErrorType.AUTH_ERROR:
        return 'Authentication failed. Please check your AI provider configuration.';

      case LlmErrorType.RATE_LIMIT:
        return 'Request limit reached. Please wait a moment and try again.';

      case LlmErrorType.INVALID_REQUEST:
        return 'Invalid request. Please rephrase your message.';

      case LlmErrorType.NETWORK_ERROR:
        return 'Network error. The AI service may be temporarily unavailable.';

      case LlmErrorType.CONTENT_FILTER:
        return 'Your message was filtered for safety reasons. Please rephrase.';

      case LlmErrorType.UNKNOWN:
      default:
        return 'An error occurred while processing your message. Please try again.';
    }
  }
}
