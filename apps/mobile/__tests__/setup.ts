/**
 * Test setup for React Native mobile app - runs after test framework initialization
 * Configures global test utilities and environment
 */

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Set up global test timeout
jest.setTimeout(10000);
