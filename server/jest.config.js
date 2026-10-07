module.exports = {
  testEnvironment: 'node',
  globalSetup: './tests/setup/globalSetup.js',
  setupFiles: ['./tests/setup/env.js'],
  testMatch: ['**/tests/**/*.test.js'],
};
