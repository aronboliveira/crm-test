/**
 * @fileoverview LLM Provider Strategy Interface
 * @module assistant/llm/interfaces
 *
 * Core abstraction for Large Language Model providers, enabling
 * interchangeable use of OpenAI, Anthropic, and other LLM APIs.
 *
 * **SOLID Principles:**
 * - **Open/Closed**: New providers can be added without modifying existing code
 * - **Liskov Substitution**: All implementations are substitutable
 * - **Dependency Inversion**: Handler depends on abstraction, not concrete providers
 */

export type LlmProviderType =
  | 'openai'
  | 'anthropic'
  | 'azure-openai'
  | 'gemini';

export type LlmRole = 'system' | 'user' | 'assistant';

/**
 * A single message in the conversation history
 */
export interface LlmMessage {
  role: LlmRole;
  content: string;
}

/**
 * Context provided to LLM for generating response
 */
export interface LlmContext {
  /** User identifier for rate limiting & personalization */
  userId: string;
  /** User email for logging */
  userEmail: string;
  /** User role (admin, user, etc.) */
  userRole: string;
  /** Conversation history (last N messages) */
  conversationHistory?: LlmMessage[];
  /** Additional metadata (e.g., CRM data for context) */
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for LLM provider
 */
export interface LlmProviderConfig {
  /** Provider type (openai, anthropic, etc.) */
  provider: LlmProviderType;
  /** API key (encrypted in storage) */
  apiKey: string;
  /** Model identifier (gpt-4-turbo, claude-3-sonnet, etc.) */
  model: string;
  /** Temperature (0.0-2.0, controls randomness) */
  temperature?: number;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** System prompt defining assistant behavior */
  systemPrompt?: string;
  /** Base URL for API (optional, for Azure/custom endpoints) */
  apiBaseUrl?: string;
}

/**
 * Response from LLM provider
 */
export interface LlmResponse {
  /** Generated text response */
  text: string;
  /** Model used for generation */
  model: string;
  /** Tokens used in prompt */
  promptTokens?: number;
  /** Tokens used in completion */
  completionTokens?: number;
  /** Total tokens used */
  totalTokens?: number;
  /** Finish reason (stop, length, content_filter, etc.) */
  finishReason?: string;
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Error types for LLM operations
 */
export enum LlmErrorType {
  /** Invalid API key or authentication failure */
  AUTH_ERROR = 'auth_error',
  /** Rate limit exceeded */
  RATE_LIMIT = 'rate_limit',
  /** Invalid request parameters */
  INVALID_REQUEST = 'invalid_request',
  /** Network/timeout error */
  NETWORK_ERROR = 'network_error',
  /** Content filtered by safety mechanisms */
  CONTENT_FILTER = 'content_filter',
  /** Unknown/unexpected error */
  UNKNOWN = 'unknown',
}

/**
 * Structured error for LLM operations
 */
export class LlmError extends Error {
  constructor(
    public readonly type: LlmErrorType,
    message: string,
    public readonly cause?: Error,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

/**
 * Strategy interface for LLM providers
 *
 * All LLM provider implementations (OpenAI, Anthropic, etc.)
 * must implement this interface to ensure consistent behavior.
 */
export interface LlmProviderStrategy {
  /**
   * Provider type identifier
   */
  readonly providerType: LlmProviderType;

  /**
   * Generate response from LLM
   *
   * @param prompt - User message/prompt
   * @param context - Contextual information (user, history, etc.)
   * @param config - Provider-specific configuration
   * @returns LLM response with generated text and metadata
   * @throws {LlmError} If generation fails
   */
  generateResponse(
    prompt: string,
    context: LlmContext,
    config: LlmProviderConfig,
  ): Promise<LlmResponse>;

  /**
   * Validate provider configuration
   *
   * @param config - Configuration to validate
   * @returns true if valid, false otherwise
   */
  validateConfig(config: Partial<LlmProviderConfig>): boolean;

  /**
   * Estimate token count for text
   *
   * Useful for preemptive checks before API call
   *
   * @param text - Text to estimate
   * @returns Estimated token count
   */
  estimateTokens(text: string): number;

  /**
   * Check if provider is available/healthy
   *
   * @param config - Configuration to test
   * @returns true if provider can be reached, false otherwise
   */
  testConnection(config: LlmProviderConfig): Promise<boolean>;
}

/**
 * DI token for LLM provider factory
 */
export const LLM_PROVIDER_FACTORY = Symbol('LLM_PROVIDER_FACTORY');

/**
 * Factory interface for creating provider instances
 */
export interface LlmProviderFactory {
  /**
   * Create provider instance based on type
   *
   * @param type - Provider type
   * @returns Provider instance
   * @throws {Error} If provider type is unsupported
   */
  create(type: LlmProviderType): LlmProviderStrategy;
}
