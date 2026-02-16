module.exports = {
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],

  // Test file patterns
  testMatch: [
    "**/__tests__/**/*.(test|spec).(ts|tsx|js)",
    "**/*.(test|spec).(ts|tsx|js)",
  ],

  // Transform with babel-jest for all files
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "<rootDir>/jest.babel.transformer.cjs",
  },

  // Module name mapper for absolute imports and mocks
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@components/(.*)$": "<rootDir>/src/components/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@hooks/(.*)$": "<rootDir>/src/hooks/$1",
    "^@types/(.*)$": "<rootDir>/src/types/$1",
    "^@constants/(.*)$": "<rootDir>/src/constants/$1",
    // Mock @crm/foundations package
    "^@crm/foundations/(.*)$": "<rootDir>/__mocks__/@crm/foundations/$1",
  },

  // Setup files
  setupFiles: ["<rootDir>/__tests__/jest.setup.ts"],
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],

  // Coverage
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/index.ts",
    "!src/**/*.types.ts",
    "!**/__tests__/**",
  ],

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Mock static assets - transform react-native and testing library packages
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|@testing-library|react-native-mmkv|@react-native-clipboard)/)",
  ],

  // Test environment
  testEnvironment: "node",
};
