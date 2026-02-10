# CRM System Architecture

## Overview

This is a full-stack CRM (Customer Relationship Management) application built with:
- **Backend**: NestJS 10 (TypeScript)
- **Frontend**: Vue 3 with Vite (TypeScript)
- **Mobile**: React Native (TypeScript)
- **Shared Packages**: Monorepo structure with shared contracts and foundations

## Directory Structure

```
crm/
├── apps/
│   ├── api/           # NestJS backend
│   │   ├── src/
│   │   │   ├── entities/      # TypeORM entities
│   │   │   ├── modules/       # Feature modules
│   │   │   ├── infrastructure/# Database, auth, etc.
│   │   │   └── utils/         # Shared utilities
│   │   └── test/             # E2E tests
│   ├── web/           # Vue 3 frontend
│   │   ├── src/
│   │   │   ├── components/   # Vue components
│   │   │   ├── composables/  # Vue composables (hooks)
│   │   │   ├── pages/        # Page components
│   │   │   ├── services/     # API services
│   │   │   ├── pinia/        # State management
│   │   │   └── utils/        # Utilities & constants
│   │   └── __tests__/       # Unit tests
│   └── mobile/        # React Native app
├── packages/
│   ├── contracts/     # Shared TypeScript interfaces
│   └── foundations/   # Shared utilities (DeepFreeze, etc.)
└── utils/             # Build scripts
```

## Backend Architecture

### Module Structure

Each backend module follows this pattern:

```
modules/{feature}/
├── {feature}.module.ts      # NestJS module definition
├── {feature}.controller.ts  # HTTP endpoints
├── {feature}.service.ts     # Business logic
├── {feature}.dto.ts         # Data Transfer Objects
├── {feature}.schema.ts      # Zod validation schemas
└── adapters/                # External integrations (optional)
```

### Integration Adapter Pattern

External integrations follow the adapter pattern:

```typescript
interface IntegrationAdapter {
  getStatus(): Promise<IntegrationStatus>;
  testConnection(): Promise<ConnectionTestResult>;
  configure(config: Record<string, unknown>): Promise<void>;
  sync(): Promise<SyncResult>;
}
```

Each adapter has:
- `{name}.types.ts` - TypeScript definitions
- `{name}-api.client.ts` - HTTP client
- `{name}-data.mapper.ts` - Entity mapping
- `{name}.adapter.ts` - IntegrationAdapter implementation
- `index.ts` - Module exports

### Available Integrations

1. **GLPI** - IT Service Management (tickets, assets)
2. **SAT ERP** - Brazilian financial/inventory system
3. **NextCloud** - File storage via WebDAV/OCS APIs
4. **Zimbra** - Email server
5. **Outlook** - Microsoft 365 integration

## Frontend Architecture

### Component Organization

```
components/
├── ui/           # Generic UI components (Button, Modal, etc.)
├── forms/        # Form components
├── tables/       # Table/DataGrid components
├── charts/       # Chart components
├── layout/       # Layout components (Sidebar, Header)
├── integrations/ # Integration-specific components
└── {feature}/    # Feature-specific components
```

### Constants System

The frontend uses deeply frozen dictionaries for:
- CSS classes (`dom-classes.ts`)
- Element IDs (`dom-ids.ts`)
- Title attributes (`dom-titles.ts`)
- Data attributes (`dom-data-attrs.ts`)
- ARIA attributes (`dom-aria.ts`)
- Integration configs (`integration-constants.ts`)

All constants use `ObjectDeep.freeze()` to ensure immutability.

### State Management

- **Pinia** for global state
- **Vue Composables** for shared reactive logic
- **Services** for API communication

## Testing Strategy

### Backend
- **Unit Tests**: Jest with mocked dependencies
- **E2E Tests**: Full integration tests
- **Test Location**: Co-located with source (`*.spec.ts`)

### Frontend
- **Unit Tests**: Vitest
- **Test Location**: `__tests__/` directory

## Key Patterns

### Error Handling
- Use Zod for validation (v4 API)
- Custom exception filters in NestJS
- Structured error responses

### Authentication
- JWT-based authentication
- Role-based access control (RBAC)
- Audit logging for auth events

### Data Mapping
- Static mapper classes with bidirectional methods
- Forward: External → CRM entities
- Reverse: CRM → External payloads

### Type Safety
- Strict TypeScript configuration
- Shared contracts package
- Runtime validation with Zod
