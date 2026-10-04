import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures";

const EPHEMERAL_PATH = "/writing/en/ephemeral-design";
const ARTICLE_BODY_MODULE_PATTERN = /^\/assets\/(?:en|cn)-.+\.js$/;
const PROJECTION_ARTICLES = [
  "design-system-team-maturity",
  "ephemeral-design",
  "verification-asymmetry",
] as const;

test.beforeEach(() => {
  test.skip(true, "The Thoughts writing group is hidden from the home canvas.");
});

async function expandWriting(page: Page) {
  await page.goto("/");
  const folder = page.getByRole("button", { name: "Toggle Thoughts folder" });
  await folder.press("Enter");
  await expect(folder).toHaveAttribute("aria-expanded", "true");
  const first = page.getByRole("link", {
    exact: true,
    name: "Read Ephemeral Design",
  });
  await expect(first).toBeVisible();
  return { first, folder };
}

test("bounded previews include visible static diagrams without loading full MDX or off-card images", async ({
  page,
  isMobile,
}) => {
  const requests: { type: string; pathname: string }[] = [];
  page.on("request", (request) => {
    requests.push({
      pathname: new URL(request.url()).pathname,
      type: request.resourceType(),
    });
  });
  await expandWriting(page);
  const card = page.locator('a[href="/writing/en/verification-asymmetry"]');
  const images = card.locator("img");
  expect(await images.count()).toBeGreaterThan(1);
  const first = images.first();
  await expect(first).toHaveAttribute(
    "alt",
    "Verification asymmetry image - 0"
  );
  await expect(first).toHaveAttribute("width", "734");
  await expect(first).toHaveAttribute("height", "412");
  await expect(first).toHaveAttribute("loading", "lazy");
  await expect(first).toHaveAttribute("decoding", "async");
  if (!isMobile) {
    await expect(first).toBeInViewport();
    await expect
      .poll(() =>
        first.evaluate(
          (image) =>
            image instanceof HTMLImageElement &&
            image.complete &&
            image.naturalWidth > 0
        )
      )
      .toBe(true);
    const offCardPaths = await images.evaluateAll((elements) =>
      elements
        .slice(1)
        .filter((element) => element instanceof HTMLImageElement)
        .map((element) => element.getAttribute("data-preview-src"))
        .filter((src): src is string => src !== null)
        .map((src) => new URL(src, window.location.origin).pathname)
    );
    expect(offCardPaths).toHaveLength((await images.count()) - 1);
    expect(
      await images.evaluateAll((elements) =>
        elements.slice(1).every((element) => !element.hasAttribute("src"))
      )
    ).toBe(true);
    expect(
      requests.filter(
        (request) =>
          request.type === "image" && offCardPaths.includes(request.pathname)
      )
    ).toHaveLength(0);
  }
  expect(
    requests.filter(
      (request) =>
        request.type === "script" &&
        ARTICLE_BODY_MODULE_PATTERN.test(request.pathname)
    )
  ).toHaveLength(0);
});

interface ProjectionFrame {
  backdropOpacity: number;
  contentOpacity: number;
  contentWidth: number;
  dialogOpacity: number;
  elapsed: number;
  headingHeight: number;
  headingWidth: number;
  insetX: number;
  insetY: number;
  scaleX: number;
  scaleY: number;
  sourceContentFitsSurface: boolean;
  sourceFrameClipsProjection: boolean;
  sourceFrameWidth: number;
  sourceSurfaceOpacity: number;
  sourceSurfaceWidth: number;
  surfaceOpacity: number;
  surfaceWidth: number;
}

async function recordProjection(
  page: Page,
  action: "open" | "close",
  articlePath = EPHEMERAL_PATH
) {
  return await page.evaluate(
    async ({ direction, path }) => {
      const source = document.querySelector(`a[href="${path}"]`);
      const sourceFrame =
        source?.querySelector<HTMLElement>("[data-paper-frame]");
      const sourceSurface = source?.querySelector<HTMLElement>(
        "[data-paper-surface]"
      );
      const sourceContent = source?.querySelector<HTMLElement>(
        "[data-paper-content]"
      );
      if (!(sourceFrame && sourceSurface && sourceContent)) {
        throw new Error("Missing source paper projection");
      }
      const sourceProjection = {
        content: sourceContent,
        frame: sourceFrame,
        surface: sourceSurface,
      };
      const control =
        direction === "open"
          ? source
          : document.querySelector(
              '[role="dialog"] button[aria-label="Close reader"]'
            );
      if (!(control instanceof HTMLElement)) {
        throw new Error(`Missing projection ${direction} control`);
      }
      const frames: ProjectionFrame[] = [];
      const start = performance.now();
      control.click();
      return await new Promise<ProjectionFrame[]>((resolve, reject) => {
        function record() {
          const dialog = document.querySelector('[role="dialog"]');
          const surface = dialog?.querySelector<HTMLElement>(
            "[data-paper-surface]"
          );
          const content = dialog?.querySelector<HTMLElement>(
            "[data-paper-content]"
          );
          const heading = dialog?.querySelector("h1");
          if (surface && content && heading) {
            const surfaceBounds = surface.getBoundingClientRect();
            const contentBounds = content.getBoundingClientRect();
            const headingBounds = heading.getBoundingClientRect();
            const sourceSurfaceBounds =
              sourceProjection.surface.getBoundingClientRect();
            const sourceContentBounds =
              sourceProjection.content.getBoundingClientRect();
            const sourceFrameStyle = getComputedStyle(sourceProjection.frame);
            const dialogOpacity = dialog
              ? Number(getComputedStyle(dialog).opacity)
              : 0;
            const backdrop = dialog?.querySelector("[data-reader-backdrop]");
            frames.push({
              backdropOpacity:
                dialogOpacity *
                (backdrop ? Number(getComputedStyle(backdrop).opacity) : 1),
              contentOpacity: Number(getComputedStyle(content).opacity),
              contentWidth: contentBounds.width,
              dialogOpacity,
              elapsed: performance.now() - start,
              headingHeight: heading.offsetHeight,
              headingWidth: heading.offsetWidth,
              insetX: contentBounds.left - surfaceBounds.left,
              insetY: contentBounds.top - surfaceBounds.top,
              scaleX: headingBounds.width / heading.offsetWidth,
              scaleY: headingBounds.height / heading.offsetHeight,
              sourceContentFitsSurface:
                sourceContentBounds.left >= sourceSurfaceBounds.left - 0.5 &&
                sourceContentBounds.top >= sourceSurfaceBounds.top - 0.5 &&
                sourceContentBounds.right <= sourceSurfaceBounds.right + 0.5 &&
                sourceContentBounds.bottom <= sourceSurfaceBounds.bottom + 0.5,
              sourceFrameClipsProjection:
                ["hidden", "clip"].includes(sourceFrameStyle.overflowX) ||
                ["hidden", "clip"].includes(sourceFrameStyle.overflowY),
              sourceFrameWidth:
                sourceProjection.frame.getBoundingClientRect().width,
              sourceSurfaceOpacity: Number(
                getComputedStyle(sourceProjection.surface).opacity
              ),
              sourceSurfaceWidth: sourceSurfaceBounds.width,
              surfaceOpacity: Number(getComputedStyle(surface).opacity),
              surfaceWidth: surfaceBounds.width,
            });
            if (
              direction === "open" &&
              frames.length > 2 &&
              getComputedStyle(content).overflow === "visible" &&
              surface.style.transform === "none" &&
              content.style.transform === "none"
            ) {
              resolve(frames);
              return;
            }
          } else if (direction === "close" && frames.length > 2) {
            resolve(frames);
            return;
          }
          if (performance.now() - start > 4000) {
            reject(new Error(`Paper ${direction} projection did not settle`));
            return;
          }
          requestAnimationFrame(record);
        }
        requestAnimationFrame(record);
      });
    },
    { direction: action, path: articlePath }
  );
}

for (const slug of PROJECTION_ARTICLES) {
  test(`opening and closing interpolate ${slug} without stretching or reflowing text`, async ({
    page,
  }, testInfo) => {
    await expandWriting(page);
    const articlePath = `/writing/en/${slug}`;
    const opening = await recordProjection(page, "open", articlePath);
    const closing = await recordProjection(page, "close", articlePath);
    await testInfo.attach("paper-projection-frames", {
      body: JSON.stringify({ closing, opening }),
      contentType: "application/json",
    });
    const frames = [...opening, ...closing];
    expect(opening.length).toBeGreaterThan(2);
    expect(closing.length).toBeGreaterThan(2);
    expect(
      frames.some((frame) => frame.scaleX > 0.35 && frame.scaleX < 0.9)
    ).toBe(true);
    expect(
      Math.max(...frames.map((frame) => Math.abs(frame.scaleX - frame.scaleY)))
    ).toBeLessThan(0.005);
    expect(new Set(frames.map((frame) => frame.headingWidth)).size).toBe(1);
    expect(new Set(frames.map((frame) => frame.headingHeight)).size).toBe(1);
    expect(Math.max(...frames.map((frame) => frame.insetX))).toBeGreaterThan(8);
    expect(Math.min(...frames.map((frame) => frame.insetX))).toBeGreaterThan(
      -0.5
    );
    expect(Math.max(...frames.map((frame) => frame.insetX))).toBeLessThan(16.5);
    expect(Math.max(...frames.map((frame) => frame.insetY))).toBeLessThan(24.5);
    expect(Math.min(...frames.map((frame) => frame.insetY))).toBeGreaterThan(
      -0.5
    );

    const readerWidth = Math.max(...closing.map((frame) => frame.surfaceWidth));
    const surfaceTravel =
      readerWidth - Math.min(...closing.map((frame) => frame.surfaceWidth));
    const contentTravel =
      readerWidth - Math.min(...closing.map((frame) => frame.contentWidth));
    expect(
      Math.max(
        ...closing.map((frame) =>
          Math.abs(
            (readerWidth - frame.surfaceWidth) / surfaceTravel -
              (readerWidth - frame.contentWidth) / contentTravel
          )
        )
      )
    ).toBeLessThan(0.025);
    const earlyReturn = closing.filter(
      (frame) =>
        frame.surfaceWidth < readerWidth * 0.9 &&
        frame.surfaceWidth > readerWidth * 0.75
    );
    expect(earlyReturn.length).toBeGreaterThan(0);
    expect(
      Math.max(...earlyReturn.map((frame) => frame.backdropOpacity))
    ).toBeLessThan(0.9);

    const returningPaper = closing.filter(
      (frame) =>
        frame.sourceSurfaceWidth > frame.sourceFrameWidth * 1.1 &&
        frame.sourceSurfaceOpacity > 0.8
    );
    expect(returningPaper.length).toBeGreaterThan(0);
    expect(
      returningPaper.every(
        (frame) =>
          !frame.sourceFrameClipsProjection && frame.sourceContentFitsSurface
      )
    ).toBe(true);
  });
}

test("inset previews preserve reader typography, scroll reachability and return geometry", async ({
  page,
}) => {
  const { first, folder } = await expandWriting(page);
  const preview = await first.evaluate((link) => {
    const surface = link.querySelector<HTMLElement>("[data-paper-surface]");
    const content = link.querySelector<HTMLElement>("[data-paper-content]");
    const paper = link.querySelector<HTMLElement>(".article-paper");
    const heading = paper?.querySelector("h2");
    if (!(surface && content && paper && heading)) {
      throw new Error("Writing card is missing a paper projection");
    }
    return {
      contentHeight: content.offsetHeight,
      contentLeft: content.offsetLeft,
      contentTop: content.offsetTop,
      contentWidth: content.offsetWidth,
      fontSize: getComputedStyle(heading).fontSize,
      headingHeight: heading.clientHeight,
      height: surface.offsetHeight,
      paperWidth: paper.offsetWidth,
      width: surface.offsetWidth,
    };
  });
  expect(preview).toMatchObject({
    contentHeight: 312,
    contentLeft: 16,
    contentTop: 24,
    contentWidth: 208,
    height: 360,
    width: 240,
  });

  await first.press("Enter");
  await expect(page).toHaveURL(EPHEMERAL_PATH);
  const dialog = page.getByRole("dialog", {
    exact: true,
    name: "Ephemeral Design",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-paper-content]")).toHaveCSS(
    "overflow",
    "visible"
  );
  const reader = await dialog.evaluate((element) => {
    const paper = element.querySelector<HTMLElement>(".article-paper");
    const heading = paper?.querySelector("h1");
    const content = element.querySelector<HTMLElement>("[data-paper-content]");
    const viewport = element.querySelector<HTMLElement>(
      "[data-reader-viewport]"
    );
    if (!(paper && heading && content && viewport)) {
      throw new Error("Reader is missing its projection or scroll viewport");
    }
    return {
      contentHeight: content.offsetHeight,
      fontSize: getComputedStyle(heading).fontSize,
      headingHeight: heading.clientHeight,
      paperWidth: paper.offsetWidth,
      scrollHeight: viewport.scrollHeight,
    };
  });
  expect(reader.paperWidth).toBe(preview.paperWidth);
  expect(reader.fontSize).toBe(preview.fontSize);
  expect(reader.headingHeight).toBe(preview.headingHeight);
  expect(reader.scrollHeight).toBeGreaterThan(reader.contentHeight);

  const bottom = await dialog
    .locator("[data-reader-viewport]")
    .evaluate((element) => {
      const paper = element.querySelector(".article-paper");
      if (!paper) {
        throw new Error("Reader article is missing");
      }
      element.scrollTop = element.scrollHeight;
      const bounds = element.getBoundingClientRect();
      const articleBounds = paper.getBoundingClientRect();
      return {
        articleBottom: articleBounds.bottom,
        scrollTop: element.scrollTop,
        viewportBottom: bounds.bottom,
        viewportTop: bounds.top,
      };
    });
  expect(bottom.scrollTop).toBeGreaterThan(0);
  expect(bottom.articleBottom).toBeLessThanOrEqual(bottom.viewportBottom);
  expect(bottom.articleBottom).toBeGreaterThan(bottom.viewportTop);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL("/");
  await expect(folder).toHaveAttribute("aria-expanded", "true");
  await expect(first).toBeFocused();
  const content = first.locator("[data-paper-content]");
  await expect(content).toHaveCSS("width", "208px");
  await expect(content).toHaveCSS("height", "312px");
});

test("closing and immediately opening a sibling keeps both projections and the folder usable", async ({
  page,
  isMobile,
}) => {
  const { first, folder } = await expandWriting(page);
  await first.press("Enter");
  const firstDialog = page.getByRole("dialog", {
    exact: true,
    name: "Ephemeral Design",
  });
  await expect(firstDialog.locator("[data-paper-content]")).toHaveCSS(
    "overflow",
    "visible"
  );
  await firstDialog.getByRole("button", { name: "Close reader" }).click();
  await expect(page).toHaveURL("/");
  const next = page.getByRole("link", {
    exact: true,
    name: "Read Verification asymmetry",
  });
  if (isMobile) {
    await next.press("Enter");
  } else {
    // Wait for the returning card to enter the viewport, not for it to settle.
    await expect(next).toBeInViewport();
    const exitingDialog = page.locator('[role="dialog"]');
    await expect(exitingDialog).toHaveCount(1);
    await expect(exitingDialog).toHaveCSS("pointer-events", "none");
    // Bypass only the stability wait, exercising a pointer during the old exit.
    await next.click({ force: true });
  }
  const nextDialog = page.getByRole("dialog", {
    exact: true,
    name: "Verification asymmetry",
  });
  await expect(nextDialog).toBeVisible();
  await expect(nextDialog.locator("[data-paper-content]")).toHaveCSS(
    "overflow",
    "visible"
  );
  await expect(nextDialog.locator("[data-paper-content]")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(nextDialog).toHaveCount(0);
  await expect(folder).toHaveAttribute("aria-expanded", "true");
  await expect(next).toBeFocused();
});

test("reduced motion keeps the inset without trapping or clipping the reader", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { first, folder } = await expandWriting(page);
  await first.press("Enter");
  const dialog = page.getByRole("dialog", {
    exact: true,
    name: "Ephemeral Design",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-paper-surface]")).toHaveCSS(
    "transform",
    "none"
  );
  await expect(dialog.locator("[data-paper-content]")).toHaveCSS(
    "transform",
    "none"
  );
  await expect(dialog.locator("[data-reader-viewport]")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(folder).toHaveAttribute("aria-expanded", "true");
  await expect(first).toBeFocused();
});
