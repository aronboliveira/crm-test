# LLM Provider Strategy Architecture

## Overview

This module implements the **Strategy Pattern** for multiple Large Language Model (LLM) providers, enabling the CRM assistant to use OpenAI, Anthropic, or other LLM APIs interchangeably.

## SOLID Principles Applied

### Single Responsibility Principle (SRP)

- `LlmProviderStrategy`: Interface defining contract for LLM communication
- `OpenAiProvider`: Handles OpenAI API specifics only
- `AnthropicProvider`: Handles Anthropic API specifics only
- `LlmMessageHandler`: Orchestrates LLM provider selection and message handling

### Open/Closed Principle (OCP)

- New LLM providers can be added by implementing `LlmProviderStrategy` without modifying existing code
- Provider selection via configuration, not code changes

### Liskov Substitution Principle (LSP)

- All `LlmProviderStrategy` implementations are substitutable
- Consistent interface contracts across providers

### Interface Segregation Principle (ISP)

- `LlmProviderStrategy`: Core message generation interface
- `LlmProvider Config Validator`: Separate validation interface
- `LlmUsageTracker`: Separate usage tracking interface

### Dependency Inversion Principle (DIP)

- `LlmMessageHandler` depends on `LlmProviderStrategy` abstraction, not concrete providers
- Providers injected via DI based on configuration

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    AssistantWsService                        │
│  (Receives user messages via WebSocket)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            ASSISTANT_MESSAGE_HANDLER (DI Token)              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           LlmMessageHandler                           │  │
│  │  - Selects provider based on config                  │  │
│  │  - Orchestrates request/response                     │  │
│  │  - Handles errors & fallbacks                        │  │
│  └────────────────────┬──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                        │
          ┌─────────────┴──────────────┐
          ▼                            ▼
┌──────────────────────┐    ┌──────────────────────┐
│ LlmProviderStrategy  │    │ LlmProviderStrategy  │
│   (Interface)        │    │   (Interface)        │
└──────┬───────────────┘    └───────┬──────────────┘
       │                            │
       ▼                            ▼
┌──────────────────────┐    ┌──────────────────────┐
│  OpenAiProvider      │    │ AnthropicProvider    │
│  - GPT-4 Turbo       │    │  - Claude 3.5        │
│  - Token counting    │    │  - Token counting    │
│  - Streaming         │    │  - Streaming         │
└──────────────────────┘    └──────────────────────┘
```

## File Structure

```
apps/api/src/modules/assistant/llm/
├── README.md                           # This file
├── interfaces/
│   ├── llm-provider-strategy.interface.ts   # Core strategy interface
│   ├── llm-config.interface.ts              # Config types
│   └── llm-response.interface.ts            # Response types
├── providers/
│   ├── openai/
│   │   ├── openai.provider.ts          # OpenAI implementation
│   │   ├── openai.types.ts             # OpenAI-specific types
│   │   └── openai.provider.spec.ts     # Unit tests
│   └── anthropic/
│       ├── anthropic.provider.ts       # Anthropic implementation (future)
│       ├── anthropic.types.ts
│       └── anthropic.provider.spec.ts
├── llm-message.handler.ts              # Main handler (replaces EchoHandler)
├── llm-message.handler.spec.ts         # Handler tests
└── llm.module.ts                       # NestJS module (optional sub-module)
```

## Usage Flow

1. User sends message via WebSocket → `AssistantWsService`
2. `AssistantWsService` calls `ASSISTANT_MESSAGE_HANDLER.handleUserMessage()`
3. `LlmMessageHandler`:
   - Reads active LLM provider from `IntegrationConfigsService`
   - Selects appropriate `LlmProviderStrategy` (OpenAI/Anthropic/etc.)
   - Calls `provider.generateResponse(prompt, context)`
   - Returns result to WebSocket client
4. User receives AI-generated response

## Configuration

LLM provider configuration stored via `IntegrationsModule`:

```typescript
// Example: OpenAI config via IntegrationConfigEntity
{
  integrationId: "openai",
  encryptedSecrets: { apiKey: "sk-..." },
  publicConfig: {
    model: "gpt-4-turbo-preview",
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: "You are a helpful CRM assistant..."
  }
}
```

## Provider Selection Logic

```typescript
// Pseudo-code
const configuredProvider = await integrationConfigs.getConfig('llm-provider');

let provider: LlmProviderStrategy;
switch (configuredProvider?.activeProvider) {
  case 'openai':
    provider = this.openAiProvider;
    break;
  case 'anthropic':
    provider = this.anthropicProvider;
    break;
  default:
    throw new Error('No LLM provider configured');
}

const response = await provider.generateResponse(userMessage, context);
```

## Error Handling & UX

- **Config missing**: Alert user "Please configure an AI provider in Integrations"
- **API error**: Alert "AI service temporarily unavailable. Try again later."
- **Rate limit**: Alert "AI request limit reached. Please wait 60 seconds."
- **Invalid API key**: Alert "AI configuration error. Please check your API key."

## Testing Strategy

- **Unit tests**: Mock each provider independently
- **Integration tests**: Test handler→provider flow with mocked HTTP
- **E2E tests**: Cypress tests for full UI→WebSocket→LLM→Response flow

## Security

- API keys encrypted via `IntegrationConfigCryptoService`
- Never log full API keys (only last 4 chars for debugging)
- Rate limiting per user/session
- Input sanitization before sending to LLM APIs

## Future Enhancements

- [ ] Add support for Azure OpenAI
- [ ] Add support for Google Gemini
- [ ] Add support for local LLMs (Ollama)
- [ ] Implement streaming responses
- [ ] Add conversation history context
- [ ] Add RAG (Retrieval Augmented Generation) with CRM data
- [ ] Add function calling for CRM actions (create lead, etc.)
