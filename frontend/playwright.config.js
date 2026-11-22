import { defineConfig } from '@playwright/test';

const port = 3340;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL, browserName: 'chromium', locale: 'pt-BR', trace: 'retain-on-failure' },
  webServer: {
    command: 'node tests/e2e/server.js',
    env: { PORT: String(port) },
    url: `${baseURL}/api/health`,
    timeout: 60_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
  },
});
