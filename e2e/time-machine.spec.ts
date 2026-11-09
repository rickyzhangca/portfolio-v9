import { expect, type Page } from "@playwright/test";
import { test, waitForCanvasEntrance } from "./fixtures";

const SCALE_PATTERN = /scale\(([\d.]+)\)/;
const TRANSFORM_STYLE = /transform/;
const DATE_LABEL = /^[A-Z][a-z]{2} \d{4}$/;

// The toy car on the desk is the way in. It parks below the first view, so
// the desk is wheeled until it is in view and then clicked, as a person
// would: script focus without a real press first counts as keyboard focus
// in Chrome, which lifts the present's window. Where an open stack covers
// the car, a test that has pressed something already can `dispatch` it.
const openTimeMachine = async (page: Page, { dispatch = false } = {}) => {
  const car = page.getByRole("button", {
    name: "Time travel to earlier portfolios",
  });
  if (dispatch) {
    await car.dispatchEvent("click");
    await expect(
      page.getByRole("dialog", { name: "Time machine" })
    ).toBeAttached();
    return car;
  }
  const viewport = page.viewportSize() ?? { height: 0, width: 0 };
  const box = await car.boundingBox();
  if (!box) {
    throw new Error("the toy time machine is missing");
  }
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  await page.mouse.wheel(
    centre.x - viewport.width / 2,
    centre.y - viewport.height / 2
  );
  await expect
    .poll(async () => {
      const moved = await car.boundingBox();
      return moved
        ? Math.abs(moved.y + moved.height / 2 - viewport.height / 2)
        : 1e9;
    })
    .toBeLessThan(viewport.height / 4);
  await car.click();
  await expect(
    page.getByRole("dialog", { name: "Time machine" })
  ).toBeAttached();
  return car;
};

const canvasWindow = (page: Page) =>
  page.locator("div.fixed.inset-0", {
    has: page.locator(".react-transform-wrapper"),
  });

const canvasScale = async (page: Page) => {
  const transform = await canvasWindow(page).evaluate(
    (element) => element.style.transform
  );
  return Number(SCALE_PATTERN.exec(transform)?.[1] ?? 1);
};

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await waitForCanvasEntrance(page);
});

test("the time machine shrinks the canvas, opens an earlier version and restores the canvas", async ({
  page,
}) => {
  // Phones get no canvas controls, so there is no time machine there.
  test.skip(
    (page.viewportSize()?.width ?? 0) < 640,
    "phones have no time machine"
  );
  const cover = page.getByRole("button", {
    exact: true,
    name: "Toggle GitHub",
  });
  await cover.click();
  await expect(cover).toHaveAttribute("aria-expanded", "true");

  // The stack now covers the car; the cover took a real press.
  const trigger = await openTimeMachine(page, { dispatch: true });
  const dialog = page.getByRole("dialog", { name: "Time machine" });
  await expect(dialog).toBeAttached();
  await expect(canvasWindow(page)).toHaveAttribute("inert", "");
  await expect.poll(() => canvasScale(page)).toBeLessThan(0.6);

  // The toolbar's goo filter cannot follow the scale, so it hides.
  const controls = page.locator('[aria-label="Canvas controls"]');
  await expect(controls).toBeHidden();

  // The present sits in the middle; the arrow key slides v8 there.
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const centerOf = async (selector: string) => {
    const box = await page.locator(selector).boundingBox();
    return box ? box.x + box.width / 2 : Number.NaN;
  };
  await expect
    .poll(() => centerOf("[data-time-machine-current]"))
    .toBeCloseTo(viewportWidth / 2, 0);
  // Every window settles to the same size, labelled by when it went live.
  await expect
    .poll(async () => {
      const presentBox = await page
        .locator("[data-time-machine-current]")
        .boundingBox();
      const pastBox = await page
        .locator('[data-time-machine-window="v8"]')
        .boundingBox();
      return Math.abs((presentBox?.width ?? 0) - (pastBox?.width ?? 1));
    })
    .toBeLessThan(1);
  await expect(dialog.getByText("Now", { exact: true })).toBeAttached();
  await expect(dialog.getByText(DATE_LABEL).first()).toBeAttached();

  await page.keyboard.press("ArrowRight");
  const openV8 = page.locator('[data-time-machine-window="v8"] button');
  await expect(openV8).toBeFocused();
  // Within a pixel: WebKit scrolls by whole pixels.
  await expect
    .poll(async () =>
      Math.abs(
        (await centerOf('[data-time-machine-window="v8"]')) - viewportWidth / 2
      )
    )
    .toBeLessThan(1.5);

  // An earlier version opens inset by the same padding at its sides and top,
  // with more below it for its controls.
  await page.keyboard.press("Enter");
  const versionWindow = page.locator('[data-time-machine-window="v8"]');
  await expect
    .poll(async () => {
      const box = await versionWindow.boundingBox();
      const viewport = page.viewportSize();
      if (!(box && viewport)) {
        return Number.POSITIVE_INFINITY;
      }
      const gaps = [box.x, box.y, viewport.width - box.x - box.width];
      return Math.max(...gaps) - Math.min(...gaps);
    })
    .toBeLessThan(1);
  const openBox = await versionWindow.boundingBox();
  const viewportHeight = page.viewportSize()?.height ?? 0;
  expect(
    viewportHeight - (openBox?.y ?? 0) - (openBox?.height ?? 0)
  ).toBeGreaterThan((openBox?.y ?? 0) + 40);
  await expect(page.locator('iframe[title*="version 8"]')).toBeAttached();

  // Escape steps back: first to the overview, then to the canvas.
  await page.keyboard.press("Escape");
  await expect(
    page.locator('[data-time-machine-window="v8"] button')
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(canvasWindow(page)).not.toHaveAttribute(
    "style",
    TRANSFORM_STYLE
  );
  await expect(canvasWindow(page)).not.toHaveAttribute("inert", "");
  await expect(trigger).toBeFocused();
  await expect(controls).toBeVisible();

  // The canvas kept its state and still responds.
  await expect(cover).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(cover).toHaveAttribute("aria-expanded", "false");
});

test("the wheel scrolls the timeline and a click opens the window under it", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 640,
    "phones have no time machine"
  );
  await openTimeMachine(page);
  const dialog = page.getByRole("dialog", { name: "Time machine" });
  await expect(dialog).toBeAttached();
  const viewportWidth = page.viewportSize()?.width ?? 0;
  // The oldest version ends the row, so scrolling past it stops there.
  const oldest = page.locator("[data-time-machine-window]").last();
  const centerOfOldest = async () => {
    const box = await oldest.boundingBox();
    return box ? box.x + box.width / 2 : Number.NaN;
  };
  await expect.poll(centerOfOldest).toBeGreaterThan(viewportWidth);

  // A plain wheel scrolls natively; the row clamps at its last window.
  await page.mouse.move(viewportWidth / 2, 300);
  for (let step = 0; step < 4; step += 1) {
    // biome-ignore lint/performance/noAwaitInLoops: wheel notches arrive in turn
    await page.mouse.wheel(0, 3000);
  }
  await expect
    .poll(async () => Math.abs((await centerOfOldest()) - viewportWidth / 2))
    .toBeLessThan(1.5);

  // Windows sit under the scroller; a click there opens the one beneath.
  const box = await oldest.boundingBox();
  if (!box) {
    throw new Error("the oldest window has no box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(
    page.getByRole("button", { name: "Back to all versions" })
  ).toBeFocused();
});

test("a click on a window cut by the screen's edge slides it to the middle first", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 640,
    "phones have no time machine"
  );
  await openTimeMachine(page);
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const v8 = page.locator('[data-time-machine-window="v8"]');
  // Once the zoom has settled, v8 peeks in from the right edge.
  const present = page.locator("[data-time-machine-current]");
  let lastWidth = 0;
  await expect
    .poll(async () => {
      const width = (await present.boundingBox())?.width ?? 0;
      const change = Math.abs(width - lastWidth);
      lastWidth = width;
      return change;
    })
    .toBeLessThan(0.01);
  await expect
    .poll(async () => {
      const box = await v8.boundingBox();
      return box ? box.x + box.width : 0;
    })
    .toBeGreaterThan(viewportWidth);
  const peek = await v8.boundingBox();
  if (!peek) {
    throw new Error("v8 has no box");
  }
  await page.mouse.click(
    (peek.x + viewportWidth) / 2,
    peek.y + peek.height / 2
  );
  const centerOffset = async () => {
    const box = await v8.boundingBox();
    return box
      ? Math.abs(box.x + box.width / 2 - viewportWidth / 2)
      : Number.POSITIVE_INFINITY;
  };
  await expect.poll(centerOffset).toBeLessThan(1.5);
  const close = page.getByRole("button", { name: "Back to all versions" });
  await expect(close).not.toBeFocused();
  await expect(page.locator("[data-time-machine-scroller]")).toHaveCSS(
    "pointer-events",
    "auto"
  );

  // Wholly in view now, the same window opens.
  const centred = await v8.boundingBox();
  if (!centred) {
    throw new Error("v8 has no box");
  }
  await page.mouse.click(
    centred.x + centred.width / 2,
    centred.y + centred.height / 2
  );
  await expect(close).toBeFocused();
});

test("the step buttons slide the timeline and close only shows when open", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 640,
    "phones have no time machine"
  );
  await openTimeMachine(page);
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const newer = page.getByRole("button", { name: "Newer version" });
  const older = page.getByRole("button", { name: "Older version" });
  const close = page.getByRole("button", { name: "Back to all versions" });
  // The present is the newest; nothing to close yet.
  await expect(newer).toBeDisabled();
  await expect(older).toBeEnabled();
  await expect(close.locator("..")).toHaveCSS("opacity", "0");
  // A step that has run out is gone, not dimmed.
  await expect(newer).toHaveCSS("opacity", "0");

  // The arrows flank the window in the middle, under its corners. The
  // disabled one has shrunk inside its slot, so measure the slot.
  const present = page.locator("[data-time-machine-current]");
  await expect
    .poll(async () => {
      const box = await present.boundingBox();
      const arrow = await newer.locator("..").boundingBox();
      return box && arrow ? Math.abs(arrow.x - box.x) : 1e9;
    })
    .toBeLessThan(1);

  const centerOffset = async (id: string) => {
    const box = await page
      .locator(`[data-time-machine-window="${id}"]`)
      .boundingBox();
    return box
      ? Math.abs(box.x + box.width / 2 - viewportWidth / 2)
      : Number.POSITIVE_INFINITY;
  };
  await older.click();
  await expect.poll(() => centerOffset("v8")).toBeLessThan(1.5);
  await expect(newer).toBeEnabled();
  // Still the timeline: the step only scrolled.
  await expect(close.locator("..")).toHaveCSS("opacity", "0");
  await newer.click();
  await expect
    .poll(async () => {
      const box = await present.boundingBox();
      return box ? Math.abs(box.x + box.width / 2 - viewportWidth / 2) : 1e9;
    })
    .toBeLessThan(1.5);
  await expect(newer).toBeDisabled();
});

test("the step buttons go away while the wheel leaves the row between windows", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 640,
    "phones have no time machine"
  );
  test.skip(
    page.context().browser()?.browserType().name() === "webkit" &&
      (page.viewportSize()?.width ?? 0) < 768,
    "WebKit iPhone emulation has no mouse wheel"
  );
  await openTimeMachine(page);
  const older = page.getByRole("button", { name: "Older version" });
  await expect(older).toHaveCSS("opacity", "1");
  await page.mouse.move(
    (page.viewportSize()?.width ?? 0) / 2,
    (page.viewportSize()?.height ?? 0) / 2
  );
  await page.mouse.wheel(0, 120);
  await expect(older).toHaveCSS("opacity", "0");
  await expect(older.locator("..")).toHaveAttribute("inert", "");
  // A click on the window the screen's edge cuts glides to it: they return.
  const v8 = await page
    .locator('[data-time-machine-window="v8"]')
    .boundingBox();
  if (!v8) {
    throw new Error("v8's window is missing");
  }
  await page.mouse.click(
    Math.min(v8.x + v8.width / 2, (page.viewportSize()?.width ?? 0) - 20),
    v8.y + v8.height / 2
  );
  await expect(older).toHaveCSS("opacity", "1");
});

test("a window one click opens lights up under the pointer", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 640,
    "phones have no time machine"
  );
  await openTimeMachine(page);
  const presentVeil = page.locator(
    "[data-time-machine-current] [data-time-machine-veil]"
  );
  const pastVeil = page.locator(
    '[data-time-machine-window="v8"] [data-time-machine-veil]'
  );
  const veilOf = (veil: typeof presentVeil) =>
    veil.evaluate((element) => Number((element as HTMLElement).style.opacity));
  await expect.poll(() => veilOf(presentVeil)).toBeGreaterThan(0.01);

  // The present lies wholly on screen: it rises and its veil clears.
  const present = await page
    .locator("[data-time-machine-current]")
    .boundingBox();
  if (!present) {
    throw new Error("the present's window is missing");
  }
  await page.mouse.move(
    present.x + present.width / 2,
    present.y + present.height / 2
  );
  await expect.poll(() => veilOf(presentVeil)).toBeLessThan(0.001);

  // The screen's edge cuts the next window: a click only slides it, so it
  // stays down, and the present settles back.
  const viewportWidth = page.viewportSize()?.width ?? 0;
  await page.mouse.move(viewportWidth - 10, present.y + present.height / 2);
  await expect.poll(() => veilOf(presentVeil)).toBeGreaterThan(0.01);
  await expect.poll(() => veilOf(pastVeil)).toBeGreaterThan(0.01);
});

test("the timeline's sides go soft and clear when a version opens", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 640,
    "phones have no time machine"
  );
  // An opacity below 1 on a side would make it its layers' backdrop root,
  // and they would blur nothing until the fade ended: only layers fade.
  const sampling = page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let lowest = 1;
        const started = performance.now();
        const sample = () => {
          for (const side of document.querySelectorAll(
            "[data-time-machine-depth]"
          )) {
            lowest = Math.min(lowest, Number(getComputedStyle(side).opacity));
          }
          if (performance.now() - started < 800) {
            requestAnimationFrame(sample);
          } else {
            resolve(lowest);
          }
        };
        requestAnimationFrame(sample);
      })
  );
  await openTimeMachine(page);
  expect(await sampling).toBe(1);
  const sides = page.locator("[data-time-machine-depth]");
  await expect(sides).toHaveCount(2);
  await Promise.all(
    (await sides.all()).map((side) =>
      expect(side).toHaveCSS("visibility", "visible")
    )
  );
  await Promise.all(
    (await sides.locator("> div").all()).map((layer) =>
      expect(layer).toHaveCSS("opacity", "1")
    )
  );
  await page.getByRole("button", { name: "Older version" }).click();
  // The scroller covers the windows: open the middle one by position.
  const v8 = page.locator('[data-time-machine-window="v8"]');
  const viewportWidth = page.viewportSize()?.width ?? 0;
  await expect
    .poll(async () => {
      const box = await v8.boundingBox();
      return box ? Math.abs(box.x + box.width / 2 - viewportWidth / 2) : 1e9;
    })
    .toBeLessThan(1.5);
  const box = await v8.boundingBox();
  if (!box) {
    throw new Error("v8's window is missing");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(
    page.getByRole("button", { name: "Back to all versions" })
  ).toBeFocused();
  await Promise.all(
    (await sides.all()).map((side) =>
      expect(side).toHaveCSS("visibility", "hidden")
    )
  );
});

test("quick presses of a step button add up", async ({ page }) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 640,
    "phones have no time machine"
  );
  await openTimeMachine(page);
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const older = page.getByRole("button", { name: "Older version" });
  // The buttons rise with the opening camera; press once they rest.
  await older.click({ trial: true });
  // Three presses before the first glide has landed: three windows along.
  for (let press = 0; press < 3; press += 1) {
    // biome-ignore lint/performance/noAwaitInLoops: the presses are sequential by design.
    await older.click({ force: true });
  }
  await expect
    .poll(async () => {
      const box = await page
        .locator('[data-time-machine-window="2022-05"]')
        .boundingBox();
      return box
        ? Math.abs(box.x + box.width / 2 - viewportWidth / 2)
        : Number.POSITIVE_INFINITY;
    })
    .toBeLessThan(1.5);
});

test("an open version steps to its neighbours", async ({ page }) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 640,
    "phones have no time machine"
  );
  await openTimeMachine(page);
  await expect(
    page.getByRole("dialog", { name: "Time machine" })
  ).toBeAttached();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.locator('[data-time-machine-window="v8"] button')
  ).toBeFocused();
  await page.keyboard.press("Enter");

  // The newest version has nothing newer; the close button takes focus.
  const close = page.getByRole("button", { name: "Back to all versions" });
  const newer = page.getByRole("button", { name: "Newer version" });
  const older = page.getByRole("button", { name: "Older version" });
  await expect(close).toBeFocused();
  await expect(newer).toBeDisabled();

  /** How far `id`'s window is from filling the open window's place. */
  const offsetFromOpen = async (id: string) => {
    const box = await page
      .locator(`[data-time-machine-window="${id}"]`)
      .boundingBox();
    const viewport = page.viewportSize();
    if (!(box && viewport)) {
      return Number.POSITIVE_INFINITY;
    }
    return Math.abs(box.x + box.width / 2 - viewport.width / 2);
  };

  // Each step flies the camera to the next window, which opens in place.
  const [first, second] = await page
    .locator("[data-time-machine-window]")
    .evaluateAll((elements) =>
      elements.map((element) =>
        element.getAttribute("data-time-machine-window")
      )
    );
  expect(first).toBe("v8");
  await older.click();
  await expect.poll(() => offsetFromOpen(String(second))).toBeLessThan(1);
  await expect(newer).toBeEnabled();

  // The arrow keys step too.
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => offsetFromOpen("v8")).toBeLessThan(1);
  await expect(newer).toBeDisabled();

  // A step from the keyboard keeps focus on the arrow pressed. (Safari does
  // not focus buttons on click, so this goes through the keyboard.)
  await older.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => offsetFromOpen(String(second))).toBeLessThan(1);
  await expect(older).toBeFocused();
});

test("clicking the current window returns to it", async ({ page }) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 640,
    "phones have no time machine"
  );
  await openTimeMachine(page);
  const present = page.locator("[data-time-machine-current]");
  const viewportWidth = page.viewportSize()?.width ?? 0;
  await expect
    .poll(async () => {
      const box = await present.boundingBox();
      return box ? box.width : Number.POSITIVE_INFINITY;
    })
    .toBeLessThan(viewportWidth * 0.6);
  const box = await present.boundingBox();
  if (!box) {
    throw new Error("the present has no box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByRole("dialog", { name: "Time machine" })).toHaveCount(
    0
  );
  await expect(canvasWindow(page)).not.toHaveAttribute("inert", "");
});

test("the toy time machine on the desk opens it, and phones have none", async ({
  page,
}) => {
  const car = page.getByRole("button", {
    name: "Time travel to earlier portfolios",
  });
  if ((page.viewportSize()?.width ?? 0) < 640) {
    await expect(car).toHaveCount(0);
    return;
  }
  // It parks below the first view; the keyboard reaches it all the same.
  await car.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Older version" })
  ).toBeVisible();
});
