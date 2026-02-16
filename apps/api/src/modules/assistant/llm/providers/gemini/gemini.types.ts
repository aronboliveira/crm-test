/**
 * @fileoverview Google Gemini API Types
 * @module assistant/llm/providers/gemini/types
 *
 * Type definitions for Google Gemini Generative Language API.
 * Based on: https://ai.google.dev/api/generate-content
 */

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface GeminiPart {
  text: string;
}

export interface GeminiSystemInstruction {
  parts: GeminiPart[];
}

export interface GeminiGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  responseMimeType?: string;
}

export interface GeminiSafetySettings {
  category: string;
  threshold: string;
}

export interface GeminiGenerateContentRequest {
  contents: GeminiContent[];
  systemInstruction?: GeminiSystemInstruction;
  generationConfig?: GeminiGenerationConfig;
  safetySettings?: GeminiSafetySettings[];
}

export interface GeminiCandidate {
  content: {
    parts: GeminiPart[];
    role: 'model';
  };
  finishReason?:
    | 'FINISH_REASON_UNSPECIFIED'
    | 'STOP'
    | 'MAX_TOKENS'
    | 'SAFETY'
    | 'RECITATION'
    | 'OTHER';
  safetyRatings?: Array<{
    category: string;
    probability: string;
  }>;
  citationMetadata?: {
    citationSources?: Array<{
      startIndex?: number;
      endIndex?: number;
      uri?: string;
      license?: string;
    }>;
  };
}

export interface GeminiUsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

export interface GeminiGenerateContentResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: {
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
    blockReason?: string;
  };
  usageMetadata?: GeminiUsageMetadata;
}

export interface GeminiErrorResponse {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<{
      '@type'?: string;
      reason?: string;
      domain?: string;
    }>;
  };
}
