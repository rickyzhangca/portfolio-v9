import { expect } from "@playwright/test";
import { test } from "./fixtures";

const NONEMPTY_NAME = /.+/;
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("keyboard expansion and Escape preserve a usable canvas", async ({
  page,
}) => {
  const cover = page.getByRole("button", {
    name: "Toggle GitHub",
    exact: true,
  });
  await cover.focus();
  await cover.press("Enter");
  await expect(cover).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(cover).toHaveAttribute("aria-expanded", "false");
});

test("keyboard activation keeps an oversized collection at its reading anchor", async ({
  page,
}) => {
  const cover = page.getByRole("button", {
    name: "Toggle swag collection",
    exact: true,
  });
  await cover.press("Enter");
  await expect(cover).toHaveAttribute("aria-expanded", "true");
  await expect
    .poll(async () => {
      const bounds = await cover.boundingBox();
      return bounds
        ? Math.max(Math.abs(bounds.x - 40), Math.abs(bounds.y - 40))
        : Number.POSITIVE_INFINITY;
    })
    .toBeLessThan(1);
});

test("wheel pan and reset synchronize the reset control", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName === "webkit" && isMobile,
    "Playwright mobile WebKit does not support mouse wheel input"
  );
  const reset = page.getByRole("button", { name: "Reset canvas", exact: true });
  await expect(reset).toBeDisabled();
  await page.mouse.move(10, 10);
  await page.mouse.wheel(200, 100);
  await expect(reset).toBeEnabled();
  await reset.click();
  await expect(reset).toBeDisabled();
});

test("project videos stay unloaded offscreen and activate when panned into view", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName === "webkit" && isMobile,
    "This pan scenario requires wheel input, which mobile WebKit does not support"
  );
  await expect(page.locator("video")).toHaveCount(0);
  const projects = page.getByRole("button", {
    name: "Toggle fun projects",
    exact: true,
  });
  await projects.focus();
  await projects.press("Enter");
  const video = page.locator("video").first();
  await expect(video).toBeAttached();
  await expect(page.locator('[data-fun-content-card-index="0"]')).toBeVisible();
  let lastBounds = "";
  await expect
    .poll(async () => {
      const bounds = await video.boundingBox();
      const current = JSON.stringify(
        bounds && {
          x: Math.round(bounds.x),
          y: Math.round(bounds.y),
          width: Math.round(bounds.width),
          height: Math.round(bounds.height),
        }
      );
      const stable = current === lastBounds && bounds !== null;
      lastBounds = current;
      return stable;
    })
    .toBe(true);
  const center = await video.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  });
  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error("Browser regression requires a fixed viewport");
  }
  await page.mouse.move(5, 5);
  await page.mouse.wheel(
    center.x - viewport.width / 2,
    center.y - viewport.height / 2
  );
  await expect
    .poll(() =>
      video.evaluate(
        (element) =>
          !!element.getAttribute("src") ||
          !!element.querySelector("source[src]")
      )
    )
    .toBe(true);
  await page.mouse.wheel(0, 10_000);
  await expect
    .poll(() =>
      video.evaluate(
        (element) =>
          !!element.getAttribute("src") ||
          !!element.querySelector("source[src]")
      )
    )
    .toBe(false);
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).paused)
    )
    .toBe(true);
});

test("document dialogs contain focus, close with Escape and restore the opener", async ({
  page,
}) => {
  for (const kind of ["about", "resume"]) {
    const opener = page.getByRole("button", {
      name: `Open ${kind}`,
      exact: true,
    });
    await opener.focus();
    await opener.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleName(NONEMPTY_NAME);
    await expect
      .poll(() =>
        dialog.evaluate((element) => {
          const event = new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            ctrlKey: true,
            deltaY: 10,
          });
          element.dispatchEvent(event);
          return event.defaultPrevented;
        })
      )
      .toBe(true);
    const focusable = dialog.locator(
      'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, object, embed, [contenteditable="true"], [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusable.first();
    const lastFocusable = focusable.last();
    await expect(focusable).not.toHaveCount(0);
    await lastFocusable.focus();
    await page.keyboard.press("Tab");
    await expect(firstFocusable).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(lastFocusable).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
});

test("cancelled touch drag releases the card without expanding it", async ({
  page,
  isMobile,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium" || !isMobile,
    "CDP touch cancellation is only supported in Chromium mobile emulation"
  );
  const cover = page.getByRole("button", {
    name: "Toggle GitHub",
    exact: true,
  });
  await expect(cover).toBeVisible();
  await expect
    .poll(async () => (await cover.boundingBox())?.width ?? 0)
    .toBeGreaterThan(200);
  const bounds = await cover.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) {
    throw new Error("Cover has no rendered bounds");
  }
  const client = await page.context().newCDPSession(page);
  const point = { x: bounds.x + 50, y: bounds.y + 50 };
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: point.x + 40, y: point.y + 40 }],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect(page.locator(".cursor-grabbing")).toHaveCount(0);
  await expect(cover).toHaveAttribute("aria-expanded", "false");
  await client.detach();
});

test("repeated open-close-reset cycles stay synchronized across resizes", async ({
  page,
  browserName,
  isMobile,
}) => {
  const cover = page.getByRole("button", {
    name: "Toggle GitHub",
    exact: true,
  });
  const reset = page.getByRole("button", { name: "Reset canvas", exact: true });
  const viewports = [
    { width: 1440, height: 1000 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
    { width: 1440, height: 1000 },
  ];
  const expectResetWithinViewport = async (viewport: {
    width: number;
    height: number;
  }) => {
    const bounds = await reset.boundingBox();
    expect(bounds).not.toBeNull();
    if (!bounds) {
      throw new Error("Reset control has no rendered bounds");
    }
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
  };

  if (browserName === "webkit" && isMobile) {
    const swagCollection = page.getByRole("button", {
      name: "Toggle swag collection",
      exact: true,
    });
    await swagCollection.click();
    await expect(swagCollection).toHaveAttribute("aria-expanded", "true");
    await expect(reset).toBeEnabled();
    await reset.click();
    await expect(reset).toBeDisabled();
    await expect(swagCollection).toHaveAttribute("aria-expanded", "false");
  } else {
    for (let iteration = 0; iteration < 3; iteration++) {
      await page.mouse.move(10, 10);
      await page.mouse.wheel(200, 100);
      await expect(reset).toBeEnabled();
      await reset.click();
      await expect(reset).toBeDisabled();
    }
  }

  for (let iteration = 0; iteration < 3; iteration++) {
    await cover.click();
    await expect(cover).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(cover).toHaveAttribute("aria-expanded", "false");
  }

  for (let index = 0; index < viewports.length; index++) {
    const viewport = viewports[index];
    const resizedViewport = viewports[(index + 1) % viewports.length];
    if (!(viewport && resizedViewport)) {
      throw new Error("Resize scenario is missing a viewport");
    }
    await page.setViewportSize(viewport);
    await expect(cover).toBeVisible();
    await expectResetWithinViewport(viewport);

    await cover.click();
    await expect(cover).toHaveAttribute("aria-expanded", "true");
    await page.setViewportSize(resizedViewport);
    await expectResetWithinViewport(resizedViewport);
    await page.keyboard.press("Escape");
    await expect(cover).toHaveAttribute("aria-expanded", "false");
  }
});
