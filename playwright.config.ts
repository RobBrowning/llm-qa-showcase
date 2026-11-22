import { defineConfig, devices } from '@playwright/test';

/**
 * Two projects, two servers (ADR 0001):
 * - ui:   the chat page and API contract, app in stub mode (no models), port 3100
 * - eval: the model evals, app with real Hugging Face models, port 3200
 * Models load lazily on the first chat request, so starting the eval server
 * costs nothing when only the ui project runs.
 */

const isCI = !!process.env.CI;
const UI_PORT = 3100;
const EVAL_PORT = 3200;
// Defect matrix runs must start a fresh server with the defect switched on.
const reuse = !isCI && !process.env.DEFECT;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: isCI,
  reporter: isCI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'on-failure' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    testIdAttribute: 'data-test',
  },
  webServer: [
    {
      command: 'npx tsx src/app/server.ts',
      port: UI_PORT,
      reuseExistingServer: reuse,
      env: { PORT: String(UI_PORT), MODEL_MODE: 'stub', DEFECT: '' },
    },
    {
      command: 'npx tsx src/app/server.ts',
      port: EVAL_PORT,
      reuseExistingServer: reuse,
      env: { PORT: String(EVAL_PORT), MODEL_MODE: 'hf', DEFECT: process.env.DEFECT ?? '' },
    },
  ],
  projects: [
    {
      name: 'ui',
      testDir: './tests/ui',
      retries: isCI ? 1 : 0,
      timeout: 30_000,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${UI_PORT}`,
        // Local runs can use an installed Chrome: PW_CHANNEL=chrome
        channel: process.env.PW_CHANNEL,
      },
    },
    {
      name: 'eval',
      testDir: './tests/eval',
      // No retries: a model eval that passes on retry is a flaky eval, not a pass.
      retries: 0,
      workers: 1,
      // First test in a run waits for model download and load.
      timeout: 10 * 60_000,
      use: { baseURL: `http://localhost:${EVAL_PORT}` },
    },
  ],
});
