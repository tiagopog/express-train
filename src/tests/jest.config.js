/** @type {import('ts-jest').JestConfigWithTsJest} **/

export default {
  preset: 'ts-jest/presets/default-esm',
  rootDir: './',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  setupFiles: ['<rootDir>/jest.envs.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/**/*.test.{ts,tsx}'],
  reporters: [['summary', { summaryThreshold: 0 }]],
  collectCoverage: false,
  coverageReporters: ['text', 'html'],
  coverageDirectory: '<rootDir>/coverage',
  coveragePathIgnorePatterns: ['/node_modules/'],
}
