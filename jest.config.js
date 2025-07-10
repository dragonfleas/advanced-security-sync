module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
  moduleFileExtensions: ['ts', 'js'],
  moduleNameMapper: {
    '^@/usecases/(.*)$': '<rootDir>/src/core/usecases/$1',
    '^@/domain/(.*)$': '<rootDir>/src/core/domain/$1',
    '^@/api/(.*)$': '<rootDir>/src/api/$1',
    '^@/core/(.*)$': '<rootDir>/src/core/$1',
    '^@/infra/(.*)$': '<rootDir>/src/infra/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
}
