import { defineConfig, devices } from "@playwright/test";

const visualTestMatch = "**/visual/**/*.spec.ts";
const includeVisualProject = process.env.PW_VISUAL === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  failOnFlakyTests: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: visualTestMatch,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "touch",
      testIgnore: visualTestMatch,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "webkit-desktop",
      testIgnore: visualTestMatch,
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "webkit-iphone",
      testIgnore: visualTestMatch,
      use: { ...devices["iPhone 13"] },
    },
    {
      name: "firefox-desktop",
      testIgnore: visualTestMatch,
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    ...(includeVisualProject
      ? [
          {
            name: "visual-chromium",
            testMatch: visualTestMatch,
            workers: 1,
            use: {
              ...devices["Desktop Chrome"],
              viewport: { width: 1440, height: 1000 },
            },
          },
        ]
      : []),
  ],
  webServer: {
    command: "pnpm preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
