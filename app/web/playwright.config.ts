import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/playwright-report' }]],
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: 'on',
    video: 'off',
    trace: 'off',
  },
  outputDir: 'tests/test-results',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
