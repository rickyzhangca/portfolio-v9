import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures";

const FOLDER = "Toggle Thoughts folder";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: FOLDER, exact: true })
  ).toBeVisible();
});

const openFolder = async (page: Page) => {
  const cover = page.getByRole("button", { name: FOLDER, exact: true });
  await cover.focus();
  await cover.press("Enter");
  await expect(cover).toHaveAttribute("aria-expanded", "true");
  // Let the cards and the camera come to rest before recording the close.
  await page.waitForTimeout(1500);
  return cover;
};

/** Records every frame of the folder's cards until `durationMs` has passed. */
const startRecording = (page: Page, durationMs: number) =>
  page.evaluate((duration) => {
    const stack = document.querySelector(
      '[data-card-stack-id="writing-stack"]'
    );
    if (!stack) {
      throw new Error("Writing folder is missing");
    }
    const frames: Array<{ cardX: number; paperOffset: number }> = [];
    Object.assign(window, { __folderFrames: frames });
    const start = performance.now();
    const record = () => {
      const cover = stack.querySelector("[data-repulsion-card-id]");
      const [, card] = stack.querySelectorAll("[data-repulsion-card-id]");
      const paper = card?.querySelector("[data-paper-surface]");
      const paperFrame = card?.querySelector("[data-paper-frame]");
      if (cover && card && paper && paperFrame) {
        const coverBox = cover.getBoundingClientRect();
        const paperBox = paper.getBoundingClientRect();
        const frameBox = paperFrame.getBoundingClientRect();
        frames.push({
          cardX: frameBox.x - coverBox.x,
          // The paper fills its frame, so any offset is a layout glitch.
          paperOffset: Math.hypot(
            paperBox.x - frameBox.x,
            paperBox.y - frameBox.y
          ),
        });
      }
      if (performance.now() - start < duration) {
        requestAnimationFrame(record);
      }
    };
    requestAnimationFrame(record);
  }, durationMs);

const readRecording = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as {
          __folderFrames: Array<{ cardX: number; paperOffset: number }>;
        }
      ).__folderFrames
  );

test("closing the folder never shifts a paper inside its tucked card", async ({
  page,
}) => {
  await openFolder(page);
  await startRecording(page, 1600);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1900);
  const frames = await readRecording(page);
  expect(frames.length).toBeGreaterThan(20);
  // Motion re-measured the tucked papers against the open pose and sprang them
  // back, twice, as the folder closed.
  expect(Math.max(...frames.map((frame) => frame.paperOffset))).toBeLessThan(2);
});
