module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/setup/test-env.setup.ts'],
  globalTeardown: '<rootDir>/tests/setup/global-teardown.ts',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'src/services/*.ts',
    'src/controllers/*.ts',
    'src/realtime/*.ts',
    'src/utils/*.ts'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  clearMocks: true,
  restoreMocks: true,
  detectOpenHandles: true,
  testTimeout: 30000,
};
