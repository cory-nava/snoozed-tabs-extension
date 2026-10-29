// End-to-end tests that load the unpacked extension into Chromium. Run: npm run test:e2e
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  workers: 1,
  reporter: 'list'
});
