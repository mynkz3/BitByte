import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "web/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:5173/BitByte/",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5173/BitByte/",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
