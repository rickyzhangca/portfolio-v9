import { expect, test } from "@playwright/test";

const NONEMPTY_NAME = /.+/;
test.beforeEach(async ({ page }) => {
  // External analytics/fonts must not make interaction tests network-dependent.
  await page.route(
    "https://portfolio-umami.haoyuzhangca2973.workers.dev/**",
    (route) => route.abort()
  );
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
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

test("wheel pan and reset synchronize the reset control", async ({ page }) => {
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
}) => {
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
    .poll(() => video.evaluate((element) => element.paused))
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
    for (let index = 0; index < 8; index++) {
      await page.keyboard.press("Tab");
      await expect
        .poll(() =>
          dialog.evaluate((el) => el.contains(document.activeElement))
        )
        .toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
});

test("cancelled touch drag releases the card without expanding it", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Native touch cancellation contract");
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
