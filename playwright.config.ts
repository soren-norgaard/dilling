import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? "4000";
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "html",
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: BASE_URL.startsWith("http://localhost")
    ? {
        command: `npx next dev --port ${PORT}`,
        port: Number(PORT),
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
