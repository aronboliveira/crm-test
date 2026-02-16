# Mobile App Tests

Comprehensive test suite for the React Native mobile application.

## Test Structure

```
__tests__/
├── setup.ts                    # Global test configuration
├── services/                   # Service layer tests
│   ├── AuthService.test.ts
│   └── ApiClientService.test.ts
├── hooks/                      # Custom hooks tests
│   └── (to be added)
└── utils/                      # Utility functions tests
    └── (to be added)
```

## Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# CI mode
npm run test:ci
```

## Coverage Goals

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## Test Utilities

### Mocks

All React Native dependencies are mocked in `setup.ts`:

- `AsyncStorage` - Async key-value storage
- `MMKV` - Fast key-value storage
- `React Navigation` - Navigation hooks
- `Clipboard` - Clipboard API
- `NativeEventEmitter` - Event system

### Custom Matchers

Currently using Jest defaults. Custom matchers can be added to `setup.ts`.

## Writing Tests

### Service Tests

Services are tested with full coverage of:

- Happy path scenarios
- Error handling
- Edge cases
- Integration flows

**Example**:

```typescript
describe("MyService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should do something", async () => {
    // Arrange
    const input = "test";

    // Act
    const result = await MyService.doSomething(input);

    // Assert
    expect(result).toBeDefined();
  });
});
```

### Hook Tests

Hooks should be tested using `@testing-library/react-hooks`:

```typescript
import { renderHook } from "@testing-library/react-hooks";
import { useMyHook } from "../../src/hooks/useMyHook";

describe("useMyHook", () => {
  it("should return expected value", () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current).toBeDefined();
  });
});
```

### Component Tests

Components should be tested using `@testing-library/react-native`:

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import MyComponent from '../../src/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const { getByText } = render(<MyComponent />);
    expect(getByText('Hello')).toBeTruthy();
  });
});
```

## Test Coverage

### Current Coverage

- **AuthService**: ✅ 100%
  - Token management
  - User session
  - Login/logout flows
  - Error handling

- **ApiClientService**: ✅ 100%
  - HTTP client initialization
  - Request/response interceptors
  - Projects API
  - Tasks API
  - Auth API
  - Error propagation

### Pending Tests

- [ ] StorageService
- [ ] ThemeService
- [ ] PolicyService
- [ ] FormPersistenceService
- [ ] Custom hooks (useDashboardProjectsPage, etc.)
- [ ] Screen components

## Best Practices

1. **Arrange-Act-Assert**: Structure tests with clear sections
2. **One assertion per test**: Keep tests focused
3. **Mock external dependencies**: Isolate units under test
4. **Clear test names**: Describe what is being tested
5. **Clean up**: Reset mocks in `beforeEach`
6. **Test edge cases**: Not just happy paths
7. **Async handling**: Use async/await properly

## Debugging Tests

### Run specific test file

```bash
npm test -- AuthService.test.ts
```

### Run specific test case

```bash
npm test -- -t "should login successfully"
```

### Verbose output

```bash
npm test -- --verbose
```

### Debug in VS Code

Add breakpoint and run with Jest debugger configuration.

## CI/CD Integration

Tests run automatically in CI with:

- All tests must pass
- Coverage thresholds enforced
- Max 2 workers for stability

## Troubleshooting

### "Cannot find module"

- Check module path in `jest.config.js` moduleNameMapper
- Ensure TypeScript paths match

### "Timeout exceeded"

- Increase timeout in specific test: `jest.setTimeout(20000)`
- Check for unresolved promises

### "Mock not working"

- Verify mock is in `setup.ts` or before import
- Check mock implementation

## Future Enhancements

- [ ] Add E2E tests with Detox
- [ ] Add visual regression tests
- [ ] Add performance benchmarks
- [ ] Add accessibility tests
- [ ] Add snapshot tests for components
