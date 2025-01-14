/*eslint-env node*/
const path = require('path'); // eslint-disable-line

module.exports = {
  verbose: false,
  collectCoverageFrom: [
    'tests/js/spec/**/*.{js,jsx,tsx}',
    'static/app/**/*.{js,jsx,ts,tsx}',
  ],
  coverageReporters: ['html', 'cobertura'],
  coverageDirectory: '.artifacts/coverage',
  snapshotSerializers: ['enzyme-to-json/serializer'],
  moduleNameMapper: {
    '^sentry-test/(.*)': '<rootDir>/tests/js/sentry-test/$1',
    '\\.(css|less|png|jpg|mp4)$': '<rootDir>/tests/js/sentry-test/importStyleMock.js',
    '\\.(svg)$': '<rootDir>/tests/js/sentry-test/svgMock.js',
    'integration-docs-platforms':
      '<rootDir>/tests/fixtures/integration-docs/_platforms.json',
  },
  modulePaths: ['<rootDir>/static'],
  setupFiles: [
    '<rootDir>/static/app/utils/silence-react-unsafe-warnings.ts',
    '<rootDir>/tests/js/throw-on-react-error.js',
    '<rootDir>/tests/js/setup.js',
    'jest-canvas-mock',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/js/setupFramework.ts'],
  testMatch: ['<rootDir>/tests/js/**/*(*.)@(spec|test).(js|ts)?(x)'],
  testPathIgnorePatterns: ['<rootDir>/tests/sentry/lang/javascript/'],

  unmockedModulePathPatterns: [
    '<rootDir>/node_modules/react',
    '<rootDir>/node_modules/reflux',
  ],
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
    '^.+\\.tsx?$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'ts', 'jsx', 'tsx'],
  globals: {},

  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '.artifacts',
        outputName: 'jest.junit.xml',
      },
    ],
  ],

  testRunner: 'jest-circus/runner',

  testEnvironment: '<rootDir>/tests/js/instrumentedEnv',
  testEnvironmentOptions: {
    output: path.resolve(__dirname, '.artifacts', 'visual-snapshots', 'jest'),
    SENTRY_DSN: 'https://3fe1dce93e3a4267979ebad67f3de327@sentry.io/4857230',
  },
};
