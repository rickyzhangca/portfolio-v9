import { expect } from "@playwright/test";
import { test } from "../fixtures";
import {
  expectVisualSnapshot,
  freezeVisibleVideosAtStart,
  waitForPinnedFonts,
  waitForVisualStability,
} from "./helpers";

const EXPLORING_AI = /Exploring AI/;

test.use({ pinVisualFonts: true });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await waitForPinnedFonts(page);
});

test("captures the initial canvas", async ({ page }) => {
  const welcomeNote = page
    .locator('[data-card-stack-id="github-stack"]')
    .getByText(EXPLORING_AI);
  await expect
    .poll(() =>
      welcomeNote.evaluate((element) => {
        let current: HTMLElement | null = element as HTMLElement;
        while (current) {
          if (
            Number.parseFloat(window.getComputedStyle(current).opacity) <= 0
          ) {
            return false;
          }
          current = current.parentElement;
        }
        return true;
      })
    )
    .toBe(true);
  await expectVisualSnapshot(page, "canvas-initial.png");
});

test("captures the expanded GitHub stack", async ({ page }) => {
  const github = page.getByRole("button", {
    name: "Toggle GitHub",
    exact: true,
  });
  await github.press("Enter");
  await github.evaluate((element) => element.blur());
  await expect(github).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.locator('[data-card-stack-id="github-stack"]').getByText(EXPLORING_AI)
  ).toBeVisible();
  await expectVisualSnapshot(page, "canvas-github-expanded.png");
});

test("captures expanded fun projects with stable media", async ({ page }) => {
  const funProjects = page.getByRole("button", {
    name: "Toggle fun projects",
    exact: true,
  });
  await funProjects.press("Enter");
  await funProjects.evaluate((element) => element.blur());
  await expect(funProjects).toHaveAttribute("aria-expanded", "true");
  const firstContentCard = page.locator('[data-fun-content-card-index="0"]');
  await expect(firstContentCard).toBeVisible();
  await waitForVisualStability(page);
  await freezeVisibleVideosAtStart(firstContentCard.locator("video"));
  await expectVisualSnapshot(page, "canvas-fun-expanded.png");
});

test("captures the expanded swag collection", async ({ page }) => {
  const swagCollection = page.getByRole("button", {
    name: "Toggle swag collection",
    exact: true,
  });
  await swagCollection.press("Enter");
  await swagCollection.evaluate((element) => element.blur());
  await expect(swagCollection).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.locator('[data-swag-stack-id="swag-stack"] img').first()
  ).toBeVisible();
  await expectVisualSnapshot(page, "canvas-swag-expanded.png");
});

test("captures the about dialog", async ({ page }) => {
  await page.getByRole("button", { name: "Open about", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "About" })).toBeVisible();
  await expectVisualSnapshot(page, "canvas-dialog.png");
});

test("captures the canvas after reset", async ({ page }) => {
  const reset = page.getByRole("button", { name: "Reset canvas", exact: true });
  await page.mouse.move(10, 10);
  await page.mouse.wheel(240, 160);
  await expect(reset).toBeEnabled();
  await reset.click();
  await expect(reset).toBeDisabled();
  await expect(
    page.locator('[data-card-stack-id="github-stack"]')
  ).toHaveAttribute("data-expanded", "false");
  await expectVisualSnapshot(page, "canvas-reset.png");
});
