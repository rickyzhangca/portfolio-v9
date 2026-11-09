import { expect, type Page } from "@playwright/test";
import { test, waitForCanvasEntrance } from "./fixtures";

interface LampWork {
  bounds: number;
  styles: number;
}

declare global {
  interface Window {
    __lampWork: LampWork;
  }
}

const sampleWork = (page: Page) =>
  page.evaluate(async () => {
    window.__lampWork = { bounds: 0, styles: 0 };
    await new Promise((resolve) => setTimeout(resolve, 500));
    return window.__lampWork;
  });

const expectSleeping = async (page: Page) => {
  await expect
    .poll(() => sampleWork(page), { timeout: 10_000 })
    .toEqual({
      bounds: 0,
      styles: 0,
    });
};

test.use({
  deviceScaleFactor: 2,
  enableLamp: true,
  viewport: { height: 900, width: 1440 },
});

test("the lamp sleeps, wakes for interaction and sleeps with a reader open", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName !== "chromium" || isMobile,
    "requires desktop Chromium WebGPU"
  );
  await page.addInitScript(() => {
    window.__lampWork = { bounds: 0, styles: 0 };
    const readStyle = window.getComputedStyle;
    window.getComputedStyle = function (...args) {
      window.__lampWork.styles += 1;
      return readStyle.apply(this, args);
    };
    const readBounds = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      if (this.matches("[data-lamp-shadow], .react-transform-component")) {
        window.__lampWork.bounds += 1;
      }
      return readBounds.call(this);
    };
  });
  await page.goto("/");
  await waitForCanvasEntrance(page);
  const lamp = page.getByRole("button", {
    exact: true,
    name: "Realistic lighting",
  });
  test.skip(
    (await lamp.count()) === 0 ||
      (await lamp.getAttribute("aria-pressed")) !== "true",
    "WebGPU adapter unavailable"
  );
  await expectSleeping(page);
  await page.mouse.move(1100, 100);
  expect((await sampleWork(page)).bounds).toBeGreaterThan(0);
  await expectSleeping(page);

  const wealthsimple = page.getByRole("button", {
    exact: true,
    name: "Toggle Wealthsimple",
  });
  await wealthsimple.click();
  await expect(wealthsimple).toHaveAttribute("aria-expanded", "true");
  await page.mouse.move(5, 5);
  await expectSleeping(page);
  await page.keyboard.press("Escape");
  await expectSleeping(page);

  const swag = page.getByRole("button", {
    exact: true,
    name: "Toggle swag collection",
  });
  await swag.press("Enter");
  await expect(swag).toHaveAttribute("aria-expanded", "true");
  await page.mouse.move(5, 5);
  await expectSleeping(page);
  await page.keyboard.press("Escape");
  await expectSleeping(page);

  const about = page.getByRole("button", { exact: true, name: "Open about" });
  await about.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectSleeping(page);
  await page.mouse.move(500, 300);
  await expectSleeping(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.mouse.move(1200, 400);
  expect((await sampleWork(page)).bounds).toBeGreaterThan(0);
  await expectSleeping(page);
});
