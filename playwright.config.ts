import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:4472', headless: true },
  webServer: {
    command: 'PORT=4472 DESIGN_DESK_REVIEW_CODE=test-review-code DESIGN_DESK_SESSION_SECRET=test-session-secret DESIGN_DESK_DATA_FILE=/tmp/design-desk-e2e.json DESIGN_DESK_COMPETITOR_TRACKER_FILE=./tests/fixtures/competitor-tracker.json node tests/fixtures/start-e2e-server.mjs',
    port: 4472,
    reuseExistingServer: false
  }
});
