import { join } from 'path';
import type { Config } from 'jest';
process.env.TZ = 'UTC';

const cwd = __dirname;

const baseConfig: Config = {
  preset: 'ts-jest',
  rootDir: cwd,
  transform: {
    '^.+\\.[t]sx?$': ['ts-jest', { tsconfig: join(cwd, './tsconfig.lint.json') }],
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleFileExtensions: ['js', 'ts', 'json'],
  testEnvironment: 'node',
};

const globalConfig: Config = {
  coverageDirectory: join(cwd, './test-reports'),
  verbose: true,
  collectCoverageFrom: [
    './packages/*/lib/*.ts',
    '!**/dist/**/*',
    '!**/index.ts',
    '!**/*.test.ts',
    '!**/*.spec.ts',
  ],
  reporters: ['default', 'jest-junit'],
};

export { baseConfig };
export default { ...baseConfig, ...globalConfig };
