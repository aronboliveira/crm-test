module.exports = {
  rootDir: ".",
  testMatch: ["<rootDir>/**/*.e2e.ts"],
  testRunner: "jest-circus/runner",
  testTimeout: 120000,
  maxWorkers: 1,
  reporters: ["detox/runners/jest/reporter"],
  setupFilesAfterEnv: ["detox/runners/jest/setup"],
};
