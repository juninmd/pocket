module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleNameMapper: {
    '\\.(css|less)$': '<rootDir>/__mocks__/styleMock.js',
    '^webextension-polyfill$': '<rootDir>/__mocks__/webextension-polyfill.ts',
  },
  // @juninmd/sonido ships ESM only; let ts-jest compile it to CommonJS for jsdom.
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {}],
    '^.+\\.jsx?$': ['ts-jest', { tsconfig: { allowJs: true, module: 'commonjs' } }],
  },
  transformIgnorePatterns: ['/node_modules/(?!(\\.pnpm/@juninmd\\+sonido|@juninmd/sonido))'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};
