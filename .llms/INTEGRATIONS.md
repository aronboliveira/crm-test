# Integration Adapters Documentation

## Overview

The CRM system supports integration with external systems through a standardized adapter pattern. All integrations implement the `IntegrationAdapter` interface and follow consistent patterns for configuration, testing, and data synchronization.

## Adapter Interface

```typescript
interface IntegrationAdapter {
  getStatus(): Promise<IntegrationStatus>;
  testConnection(): Promise<ConnectionTestResult>;
  configure(config: Record<string, unknown>): Promise<void>;
  sync(): Promise<SyncResult>;
}

interface IntegrationStatus {
  connected: boolean;
  lastSync?: Date;
  error?: string;
  features: string[];
}

interface ConnectionTestResult {
  success: boolean;
  latency?: number;
  error?: string;
  serverInfo?: Record<string, unknown>;
}

interface SyncResult {
  success: boolean;
  itemsSynced: number;
  errors: SyncError[];
  duration: number;
}
```

## Directory Structure

Each integration follows this structure:

```
modules/integrations/adapters/{name}/
├── {name}.types.ts        # TypeScript types and constants
├── {name}-api.client.ts   # HTTP client implementation
├── {name}-data.mapper.ts  # Entity mapping utilities
├── {name}.adapter.ts      # IntegrationAdapter implementation
├── {name}-data.mapper.spec.ts  # Unit tests for mapper
└── index.ts               # Module exports
```

## Available Integrations

### 1. GLPI (IT Service Management)

**Purpose**: Helpdesk and IT asset management integration.

**Features**:
- Ticket synchronization (create, update, resolve)
- User mapping between systems
- Computer/asset inventory access
- Software catalog access

**Configuration Fields**:
- `apiUrl` - GLPI REST API URL
- `appToken` - Application token
- `userToken` - User authentication token
- `syncInterval` - Auto-sync interval (minutes)

**API**: GLPI REST API v1

### 2. SAT ERP (Enterprise Resource Planning)

**Purpose**: Brazilian ERP system for financial and inventory management.

**Features**:
- Invoice management (NFe/NFSe)
- Customer synchronization
- Product and inventory tracking
- Order management
- Payment recording

**Configuration Fields**:
- `apiUrl` - SAT API base URL
- `clientId` - OAuth2 client ID
- `clientSecret` - OAuth2 client secret
- `companyId` - Company identifier

**API**: OAuth2 client credentials authentication

**Constants**:
```typescript
// Invoice status codes
SAT_INVOICE_STATUS = { DRAFT: 0, PENDING: 1, APPROVED: 2, ... }

// Order status codes  
SAT_ORDER_STATUS = { PENDING: 0, CONFIRMED: 1, PROCESSING: 2, ... }

// Payment methods
SAT_PAYMENT_METHODS = { CASH: 'cash', CREDIT_CARD: 'credit_card', ... }
```

**Data Mapping**:
- `invoiceToCrmInvoice()` - SAT invoice → CRM invoice
- `customerToCrmClient()` - SAT customer → CRM client
- `productToCrmProduct()` - SAT product → CRM product
- `orderToCrmQuote()` - SAT order → CRM quote
- `crmInvoiceToCreatePayload()` - CRM → SAT create payload

### 3. NextCloud (Cloud Storage)

**Purpose**: File storage and collaboration platform integration.

**Features**:
- File upload/download via WebDAV
- Folder organization by entity (projects, clients)
- Share management (public links, user shares)
- Activity feed access
- User synchronization

**Configuration Fields**:
- `serverUrl` - NextCloud server URL
- `username` - Authentication username
- `password` - Password or app token
- `basePath` - Root folder for CRM files

**APIs**:
- **WebDAV**: File operations (PROPFIND, MKCOL, MOVE, COPY)
- **OCS Share API**: Share management
- **OCS User API**: User information
- **Activity API**: Activity feed

**Constants**:
```typescript
// Share types
NEXTCLOUD_SHARE_TYPES = { USER: 0, GROUP: 1, PUBLIC_LINK: 3, ... }

// Permissions (bitmask)
NEXTCLOUD_PERMISSIONS = { READ: 1, UPDATE: 2, CREATE: 4, DELETE: 8, SHARE: 16 }

// File types
NEXTCLOUD_FILE_TYPES = { FILE: 'file', FOLDER: 'dir' }
```

**Data Mapping**:
- `fileToCrmAttachment()` - NextCloud file → CRM attachment
- `shareToCrmShare()` - NextCloud share → CRM share
- `userToCrmUser()` - NextCloud user → CRM user
- `activityToCrmActivity()` - NextCloud activity → CRM activity log
- `crmShareToCreatePayload()` - CRM → NextCloud share payload

**Entity Folder Structure**:
```
/{basePath}/
├── projects/
│   └── {projectId}/
│       └── files...
├── clients/
│   └── {clientId}/
│       └── files...
└── leads/
    └── {leadId}/
        └── files...
```

### 4. Zimbra (Email Server)

**Purpose**: Email and calendar integration.

**Features**:
- Email synchronization
- Calendar event sync
- Contact synchronization
- Task management

**Configuration Fields**:
- `serverUrl` - Zimbra server URL
- `email` - User email address
- `password` - Account password

**API**: Zimbra SOAP/REST APIs

### 5. Outlook (Microsoft 365)

**Purpose**: Microsoft 365 email and calendar integration.

**Features**:
- Email synchronization
- Calendar events
- Contact management
- Microsoft To Do integration

**Configuration Fields**:
- `clientId` - Azure AD application ID
- `tenantId` - Azure AD tenant ID
- `clientSecret` - Application secret

**API**: Microsoft Graph API

## Adding a New Integration

1. **Create Directory Structure**:
```bash
mkdir -p apps/api/src/modules/integrations/adapters/{name}
```

2. **Create Types File** (`{name}.types.ts`):
```typescript
// Define API response types
// Define request payload types
// Define constants (status codes, etc.)
```

3. **Create API Client** (`{name}-api.client.ts`):
```typescript
@Injectable()
export class {Name}ApiClient {
  constructor(private readonly httpService: HttpService) {}
  
  // Authentication methods
  // API endpoint methods
}
```

4. **Create Data Mapper** (`{name}-data.mapper.ts`):
```typescript
export class {Name}DataMapper {
  // Forward mapping: External → CRM
  static entityToCrm(external: ExternalType): CrmType { ... }
  
  // Reverse mapping: CRM → External
  static crmToPayload(crm: CrmType): CreatePayload { ... }
}
```

5. **Create Adapter** (`{name}.adapter.ts`):
```typescript
@Injectable()
export class {Name}Adapter implements IntegrationAdapter {
  async getStatus(): Promise<IntegrationStatus> { ... }
  async testConnection(): Promise<ConnectionTestResult> { ... }
  async configure(config: Record<string, unknown>): Promise<void> { ... }
  async sync(): Promise<SyncResult> { ... }
}
```

6. **Create Index** (`index.ts`):
```typescript
export * from './{name}.types';
export { {Name}Adapter } from './{name}.adapter';
```

7. **Register in Module** (`integrations.module.ts`):
```typescript
providers: [..., {Name}Adapter],
```

8. **Register in Service** (`integrations.service.ts`):
```typescript
this.adapters.set('{name}', this.{name}Adapter);
```

9. **Add Frontend Constants** (`integration-constants.ts`):
- Add integration definition
- Add configuration fields
- Add feature list

10. **Update Integrations Page** (`IntegrationsPage.vue`):
- Add integration to the list

## Testing Integrations

### Unit Tests (Mappers)

```typescript
describe('{Name}DataMapper', () => {
  describe('entityToCrm', () => {
    it('should map external entity to CRM format', () => {
      const external = { /* mock data */ };
      const result = {Name}DataMapper.entityToCrm(external);
      expect(result).toEqual({ /* expected */ });
    });
  });
});
```

### Integration Tests (API)

Use curl to test endpoints:

```bash
# Test connection
curl -X POST http://localhost:3000/integrations/{name}/test

# Configure integration
curl -X POST http://localhost:3000/integrations/{name}/configure \
  -H "Content-Type: application/json" \
  -d '{"apiUrl": "...", "token": "..."}'

# Trigger sync
curl -X POST http://localhost:3000/integrations/{name}/sync
```

## Best Practices

1. **Error Handling**: Wrap external API calls in try-catch, return structured errors
2. **Rate Limiting**: Respect external API rate limits
3. **Pagination**: Handle paginated responses properly
4. **Caching**: Cache frequently accessed data
5. **Logging**: Log all external API interactions
6. **Secrets**: Never log credentials or tokens
7. **Retries**: Implement retry logic for transient failures
8. **Timeouts**: Set appropriate timeouts for external calls
