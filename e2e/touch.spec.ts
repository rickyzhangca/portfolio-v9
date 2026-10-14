import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures";

test.skip(
  ({ isMobile }) => !isMobile,
  "Touch layout and gestures are covered on phone-sized projects"
);

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Toggle GitHub", exact: true })
  ).toBeVisible();
});

const readCamera = (page: Page) =>
  page.evaluate(() => {
    const content = document.querySelector(".react-transform-component");
    if (!content) {
      throw new Error("Canvas content is missing");
    }
    const matrix = new DOMMatrix(getComputedStyle(content).transform);
    return { x: Math.round(matrix.e), y: Math.round(matrix.f) };
  });

const centerOf = async (page: Page, name: string) => {
  const bounds = await page
    .getByRole("button", { name, exact: true })
    .boundingBox();
  if (!bounds) {
    throw new Error(`${name} has no rendered bounds`);
  }
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
};

test("the first screen is a single column that fits the phone", async ({
  page,
}) => {
  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error("Phone projects use a fixed viewport");
  }
  const introduction = page.getByRole("button", {
    name: "Toggle keyboard mode",
    exact: true,
  });
  await expect(introduction).toBeVisible();
  for (const name of [
    "Toggle GitHub",
    "Toggle Wealthsimple",
    "Open resume",
    "Open about",
    "Toggle fun projects",
    "Toggle swag collection",
  ]) {
    // biome-ignore lint/performance/noAwaitInLoops: each step depends on the browser state left by the previous one
    const bounds = await page
      .getByRole("button", { name, exact: true })
      .boundingBox();
    expect(bounds, name).not.toBeNull();
    expect(bounds?.x ?? -1, name).toBeGreaterThanOrEqual(0);
    expect((bounds?.x ?? 0) + (bounds?.width ?? 0), name).toBeLessThanOrEqual(
      viewport.width
    );
  }
  // The folders start on the first screen, not behind a desktop-sized scene.
  const github = await page
    .getByRole("button", { name: "Toggle GitHub", exact: true })
    .boundingBox();
  expect(github?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(viewport.height);
});

test("tapping a folder always slides the camera onto its cards", async ({
  page,
}) => {
  const cover = page.getByRole("button", {
    name: "Toggle GitHub",
    exact: true,
  });
  const start = await readCamera(page);
  // Each tap must start the camera move and nothing may interrupt it.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    // biome-ignore lint/performance/noAwaitInLoops: each step depends on the browser state left by the previous one
    const point = await centerOf(page, "Toggle GitHub");
    await page.touchscreen.tap(point.x, point.y);
    await expect(cover).toHaveAttribute("aria-expanded", "true");
    await expect
      .poll(async () => (await readCamera(page)).x, {
        message: `camera did not move on attempt ${attempt}`,
      })
      .toBeLessThan(start.x - 100);
    await page.getByRole("button", { name: "Close", exact: true }).tap();
    await expect(cover).toHaveAttribute("aria-expanded", "false");
    await expect.poll(() => readCamera(page)).toEqual(start);
  }
});

test("a tap does not reach the canvas as a mouse press", async ({ page }) => {
  // Browsers replay a tap as mousedown/mouseup. The pan library treats a
  // mousedown as a new gesture and stops the camera move the tap just began.
  await page.evaluate(() => {
    const presses: string[] = [];
    Object.assign(window, { __mousePresses: presses });
    for (const type of ["mousedown", "mouseup"]) {
      window.addEventListener(type, () => presses.push(type));
    }
  });
  const point = await centerOf(page, "Toggle GitHub");
  await page.touchscreen.tap(point.x, point.y);
  await expect(
    page.getByRole("button", { name: "Toggle GitHub", exact: true })
  ).toHaveAttribute("aria-expanded", "true");
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(
      () => (window as unknown as { __mousePresses: string[] }).__mousePresses
    )
  ).toEqual([]);
});

test("an opened folder keeps its first card on screen", async ({ page }) => {
  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error("Phone projects use a fixed viewport");
  }
  const point = await centerOf(page, "Toggle Wealthsimple").catch(() => null);
  const cover = page.getByRole("button", {
    name: "Toggle Wealthsimple",
    exact: true,
  });
  if (point && point.y < viewport.height) {
    await page.touchscreen.tap(point.x, point.y);
  } else {
    await cover.press("Enter");
  }
  await expect(cover).toHaveAttribute("aria-expanded", "true");
  // The first card after the cover: the compact reveal may slide the cover
  // itself off to the side, and its logo is the first image in the stack.
  await expect
    .poll(() =>
      page.evaluate((width) => {
        const card = Array.from(
          document.querySelectorAll(
            '[data-card-stack-id="wealthsimple-stack"] :is(a, img)'
          )
        ).find(
          (element) => !element.closest('[aria-label="Toggle Wealthsimple"]')
        );
        const bounds = card?.getBoundingClientRect();
        return bounds ? bounds.x >= 0 && bounds.right <= width : false;
      }, viewport.width)
    )
    .toBe(true);
});

test("the close button leaves touch users a way out", async ({ page }) => {
  const swag = page.getByRole("button", {
    name: "Toggle swag collection",
    exact: true,
  });
  await expect(
    page.getByRole("button", { name: "Close", exact: true })
  ).toHaveCount(0);
  await swag.press("Enter");
  await expect(swag).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Close", exact: true }).tap();
  await expect(swag).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("button", { name: "Close", exact: true })
  ).toHaveCount(0);
});

test("a tapped swag item names itself and a second tap elsewhere hides it", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Toggle swag collection", exact: true })
    .press("Enter");
  const items = page.locator(
    '[data-swag-stack-id] [data-slot="tooltip-trigger"]'
  );
  await expect(items.first()).toBeVisible();
  // Tap once the camera has landed: on a slow runner it moves hundreds of
  // pixels per frame, and a tap aimed mid-flight lands on empty canvas.
  let previous = "";
  await expect
    .poll(
      async () => {
        const box = await items.first().boundingBox();
        const position = box ? `${Math.round(box.x)},${Math.round(box.y)}` : "";
        const settled = Boolean(box && box.x >= 0) && position === previous;
        previous = position;
        return settled;
      },
      { intervals: [250] }
    )
    .toBe(true);
  const popup = page.locator('[data-slot="tooltip-popup"]');
  await items.first().tap();
  await expect(popup).toHaveCount(1);
  await expect(popup).not.toHaveText("");
  await items.nth(1).tap();
  await expect(popup).toHaveCount(1);
  await page.getByRole("button", { name: "Close", exact: true }).tap();
  await expect(popup).toHaveCount(0);
});

test("resume and about fit inside the phone without sideways scrolling", async ({
  page,
}) => {
  for (const kind of ["resume", "about"]) {
    // biome-ignore lint/performance/noAwaitInLoops: each step depends on the browser state left by the previous one
    await page
      .getByRole("button", { name: `Open ${kind}`, exact: true })
      .press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect
      .poll(() =>
        dialog.evaluate((element) => {
          const viewport = element.querySelector("[data-reader-viewport]");
          const document = element.querySelector("[data-reader-document]");
          return viewport && document
            ? document.scrollWidth <= viewport.clientWidth
            : false;
        })
      )
      .toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  }
});

test.describe("chromium touch gestures", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "CDP touch input is only available in Chromium"
  );

  interface TouchStep {
    type: "touchStart" | "touchMove" | "touchEnd";
    wait?: number;
    x?: number;
    y?: number;
  }
  const touch = async (page: Page, steps: TouchStep[]) => {
    const client = await page.context().newCDPSession(page);
    for (const step of steps) {
      // biome-ignore lint/performance/noAwaitInLoops: touch events must be delivered in order
      await client.send("Input.dispatchTouchEvent", {
        touchPoints:
          step.x === undefined || step.y === undefined
            ? []
            : [{ x: step.x, y: step.y }],
        type: step.type,
      });
      await page.waitForTimeout(step.wait ?? 16);
    }
    await client.detach();
  };

  for (const [pace, stepMs] of [
    ["quick", 16],
    // Slow input must pan just as well: nothing may mistake it for a card drag.
    ["slow", 120],
  ] as const) {
    test(`a ${pace} swipe over a card pans the canvas and leaves the card in place`, async ({
      page,
    }) => {
      const before = await page
        .getByRole("button", { name: "Toggle GitHub", exact: true })
        .boundingBox();
      const start = await readCamera(page);
      if (!before) {
        throw new Error("Cover has no rendered bounds");
      }
      const x = before.x + 100;
      const y = before.y + 260;
      await touch(page, [
        { type: "touchStart", x, y, wait: stepMs },
        ...Array.from(
          { length: 10 },
          (_, index): TouchStep => ({
            type: "touchMove",
            x,
            y: y - (index + 1) * 12,
            wait: stepMs,
          })
        ),
        { type: "touchEnd" },
      ]);
      await expect
        .poll(async () => (await readCamera(page)).y)
        .toBeLessThan(start.y - 60);
      const stack = page.locator('[data-card-stack-id="github-stack"]');
      await expect(stack).toHaveAttribute("data-expanded", "false");
      // Panning moved the whole canvas; the card kept its place on it. Read the
      // camera and the card together so momentum cannot skew the comparison.
      await expect
        .poll(() =>
          page.evaluate(() => {
            const content = document.querySelector(
              ".react-transform-component"
            );
            const card = document.querySelector('[aria-label="Toggle GitHub"]');
            if (!(content && card)) {
              throw new Error("Canvas or card is missing");
            }
            const camera = new DOMMatrix(getComputedStyle(content).transform);
            const bounds = card.getBoundingClientRect();
            return [
              Math.round(bounds.x - camera.e),
              Math.round(bounds.y - camera.f),
            ];
          })
        )
        .toEqual([
          Math.round(before.x - start.x),
          Math.round(before.y - start.y),
        ]);
    });
  }

  test("a diagonal swipe scrolls the column without drifting sideways", async ({
    page,
  }) => {
    const start = await readCamera(page);
    await touch(page, [
      { type: "touchStart", x: 300, y: 400 },
      ...Array.from(
        { length: 10 },
        (_, index): TouchStep => ({
          type: "touchMove",
          x: 300 - (index + 1) * 20,
          y: 400 - (index + 1) * 12,
        })
      ),
      { type: "touchEnd" },
    ]);
    await expect
      .poll(async () => (await readCamera(page)).y)
      .toBeLessThan(start.y - 60);
    expect((await readCamera(page)).x).toBe(start.x);
  });

  const swipe = (
    page: Page,
    from: { x: number; y: number },
    to: { x: number; y: number }
  ) =>
    touch(page, [
      { type: "touchStart", ...from },
      ...Array.from(
        { length: 8 },
        (_, index): TouchStep => ({
          type: "touchMove",
          x: from.x + ((to.x - from.x) * (index + 1)) / 8,
          y: from.y + ((to.y - from.y) * (index + 1)) / 8,
        })
      ),
      { type: "touchEnd" },
    ]);

  test("the column cannot be thrown past its top or its last card", async ({
    page,
  }) => {
    const viewport = page.viewportSize();
    if (!viewport) {
      throw new Error("Phone projects use a fixed viewport");
    }
    for (let attempt = 0; attempt < 6; attempt += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: each flick starts where the last one ended
      await swipe(
        page,
        { x: 200, y: 100 },
        { x: 200, y: viewport.height - 40 }
      );
    }
    await expect.poll(async () => (await readCamera(page)).y).toBe(0);
    for (let attempt = 0; attempt < 12; attempt += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: each flick starts where the last one ended
      await swipe(page, { x: 200, y: viewport.height - 40 }, { x: 200, y: 60 });
    }
    // The last card is still on screen, not scrolled away into empty canvas.
    const swag = page.getByRole("button", {
      name: "Toggle swag collection",
      exact: true,
    });
    await expect
      .poll(async () => {
        const bounds = await swag.boundingBox();
        return bounds ? bounds.y + bounds.height : Number.POSITIVE_INFINITY;
      })
      .toBeLessThan(viewport.height);
    await expect
      .poll(async () => {
        const bounds = await swag.boundingBox();
        return bounds ? bounds.y + bounds.height : 0;
      })
      .toBeGreaterThan(viewport.height / 2);
  });

  test("the focused laptop cannot be dragged out of view sideways", async ({
    page,
  }) => {
    const viewport = page.viewportSize();
    if (!viewport) {
      throw new Error("Phone projects use a fixed viewport");
    }
    const laptop = page.getByRole("button", {
      name: "Open macbook",
      exact: true,
    });
    await laptop.press("Enter");
    await expect
      .poll(async () => (await laptop.boundingBox())?.width)
      .toBeGreaterThan(viewport.width);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: each drag starts where the last one ended
      await swipe(page, { x: 20, y: 300 }, { x: viewport.width - 20, y: 300 });
    }
    // Dragged as far right as it goes: the laptop's left edge is near the screen edge.
    await expect
      .poll(
        async () => (await laptop.boundingBox())?.x ?? Number.NEGATIVE_INFINITY
      )
      .toBeLessThanOrEqual(24);
    await expect
      .poll(
        async () => (await laptop.boundingBox())?.x ?? Number.NEGATIVE_INFINITY
      )
      .toBeGreaterThan(-8);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: each drag starts where the last one ended
      await swipe(page, { x: viewport.width - 20, y: 300 }, { x: 20, y: 300 });
    }
    await expect
      .poll(async () => {
        const bounds = await laptop.boundingBox();
        return bounds ? bounds.x + bounds.width : 0;
      })
      .toBeGreaterThanOrEqual(viewport.width - 24);
  });
});
