import { defineConfig, devices } from "@playwright/test";

const repetitions = Number(process.env.PERF_REPETITIONS ?? "3");
if (!Number.isInteger(repetitions) || repetitions < 1) {
  throw new Error("PERF_REPETITIONS must be a positive integer");
}

const port = Number(process.env.PERF_PORT ?? "4174");
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PERF_PORT must be a valid TCP port");
}

const requestedCpuThrottle = process.env.PERF_CPU_THROTTLE_RATE;
if (
  requestedCpuThrottle !== undefined &&
  (!Number.isFinite(Number(requestedCpuThrottle)) ||
    Number(requestedCpuThrottle) <= 1)
) {
  throw new Error("PERF_CPU_THROTTLE_RATE must be greater than 1 when set");
}

const baseURL = `http://127.0.0.1:${port}`;
const previewCommand = `pnpm preview --host 127.0.0.1 --port ${port} --strictPort`;
const webServerCommand =
  process.env.PERF_USE_EXISTING_DIST === "1"
    ? previewCommand
    : `pnpm build && ${previewCommand}`;

export default defineConfig({
  testDir: "./perf",
  testMatch: "**/*.perf.spec.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  repeatEach: repetitions,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  reporter: [["./perf/performance-reporter.ts"]],
  outputDir: "test-results/performance-lab",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    browserName: "chromium",
    viewport: { width: 1440, height: 1000 },
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
