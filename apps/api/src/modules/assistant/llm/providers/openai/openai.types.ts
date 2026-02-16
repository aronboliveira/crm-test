/**
 * @fileoverview OpenAI API Types
 * @module assistant/llm/providers/openai/types
 *
 * Type definitions for OpenAI Chat Completions API v1.
 * Based on: https://platform.openai.com/docs/api-reference/chat/create
 */

export interface OpenAiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface OpenAiChatCompletionRequest {
  /** Model identifier (e.g., gpt-4-turbo-preview) */
  model: string;
  /** Conversation messages */
  messages: OpenAiChatMessage[];
  /** Sampling temperature (0-2) */
  temperature?: number;
  /** Maximum tokens in completion */
  max_tokens?: number;
  /** Nucleus sampling parameter */
  top_p?: number;
  /** Frequency penalty (-2.0 to 2.0) */
  frequency_penalty?: number;
  /** Presence penalty (-2.0 to 2.0) */
  presence_penalty?: number;
  /** Stop sequences */
  stop?: string | string[];
  /** User identifier for abuse monitoring */
  user?: string;
  /** Number of completions to generate */
  n?: number;
  /** Whether to stream responses */
  stream?: boolean;
}

export interface OpenAiChatCompletionChoice {
  index: number;
  message: OpenAiChatMessage;
  finish_reason: 'stop' | 'length' | 'content_filter' | 'function_call' | null;
}

export interface OpenAiUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenAiChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: OpenAiChatCompletionChoice[];
  usage?: OpenAiUsage;
  system_fingerprint?: string;
}

export interface OpenAiError {
  message: string;
  type: string;
  param?: string;
  code?: string;
}

export interface OpenAiErrorResponse {
  error: OpenAiError;
}
