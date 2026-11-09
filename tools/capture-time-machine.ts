/**
 * Captures the time machine's stand-in screenshots of earlier portfolio
 * versions: what each window shows until its live page has loaded.
 *
 *   node tools/capture-time-machine.ts [version...]
 *
 * Earlier portfolios that are no longer online are static copies in the
 * `portfolio-archive` repository, served from archive.rickyzhang.me.
 *
 * Pages are shot at an open window's size on a 1440x900 screen, at 2x,
 * and encoded with cwebp into `src/assets/time-machine/<version>.webp`.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";
import { getTimelineGeometry } from "../src/lib/time-machine.ts";
import { PROJECT_ROOT } from "./articles.ts";

const ARCHIVE_ORIGIN = "https://archive.rickyzhang.me";
const VERSIONS: Record<string, string> = {
  "2018": `${ARCHIVE_ORIGIN}/2018/`,
  "2019": `${ARCHIVE_ORIGIN}/2019/`,
  "2022-05": `${ARCHIVE_ORIGIN}/2022-05/`,
  "2022-12": `${ARCHIVE_ORIGIN}/2022-12/`,
  v8: "https://v8.rickyzhang.me",
};
/**
 * Shoots the archive from another origin, such as a local server over a
 * `portfolio-archive` checkout, before it is deployed:
 * `TIME_MACHINE_ARCHIVE=http://localhost:4199 node tools/capture-time-machine.ts 2018`.
 */
const archiveOverride = process.env.TIME_MACHINE_ARCHIVE;
/** Lets the page's own entrance animation finish before the shot. */
const SETTLE_MS = 2500;
const NETWORK_IDLE_TIMEOUT_MS = 10_000;

const requested = process.argv.slice(2);
const versions = requested.length > 0 ? requested : Object.keys(VERSIONS);
const { height, width } = getTimelineGeometry(
  { height: 900, width: 1440 },
  1
).window;
const scratch = mkdtempSync(path.join(tmpdir(), "time-machine-"));
const browser = await chromium.launch();

try {
  const page = await browser.newPage({
    deviceScaleFactor: 2,
    viewport: { height, width },
  });
  for (const version of versions) {
    const configured = VERSIONS[version];
    if (!configured) {
      throw new Error(`Unknown version ${version}`);
    }
    const url = archiveOverride
      ? configured.replace(ARCHIVE_ORIGIN, archiveOverride)
      : configured;
    // biome-ignore lint/performance/noAwaitInLoops: one page shoots each version in turn
    await page.goto(url, { waitUntil: "load" });
    await page
      .waitForLoadState("networkidle", { timeout: NETWORK_IDLE_TIMEOUT_MS })
      .catch(() => {
        // A live map keeps streaming tiles and never goes idle.
      });
    await page.waitForTimeout(SETTLE_MS);
    const png = path.join(scratch, `${version}.png`);
    await page.screenshot({ path: png });
    const output = path.join(
      PROJECT_ROOT,
      "src/assets/time-machine",
      `${version}.webp`
    );
    execFileSync("cwebp", [
      "-quiet",
      "-q",
      "80",
      "-m",
      "6",
      "-sharp_yuv",
      png,
      "-o",
      output,
    ]);
    console.log(`Captured ${version} → ${path.relative(PROJECT_ROOT, output)}`);
  }
} finally {
  await browser.close();
  rmSync(scratch, { force: true, recursive: true });
}
