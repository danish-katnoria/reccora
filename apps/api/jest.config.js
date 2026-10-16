module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: true }] },
  testEnvironment: 'node',
  testTimeout: 60000,
  roots: ['<rootDir>/src', '<rootDir>/test'],
};
