import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type {
  DurationSignal,
  PerformanceLab,
  PerformanceSample,
} from "./performance-support";
import { test, waitForStableBox } from "./performance-support";

const GITHUB_NOTE = "Exploring AI × design system, just getting started ;-)";
const SWAG_ITEM_COUNT = 102;
const CONTINUOUS_PAN_STEPS = 72;
const CONTINUOUS_DRAG_STEPS = 48;
const TOGGLE_LABEL_PATTERN = /^Toggle /;
const CURSOR_GRABBING_PATTERN = /cursor-grabbing/;
const RAPID_INTERACTION_CYCLES = Number(process.env.PERF_RAPID_CYCLES ?? "4");
const SAMPLE_COUNT_ANNOTATION = "performance-sample-count";
if (
  !Number.isInteger(RAPID_INTERACTION_CYCLES) ||
  RAPID_INTERACTION_CYCLES < 1
) {
  throw new Error("PERF_RAPID_CYCLES must be a positive integer");
}

test.setTimeout(120_000);

const gotoHome = async (page: Page): Promise<void> => {
  await page.goto("/");
};

const prepareCanvasForInteraction = async (page: Page): Promise<void> => {
  await gotoHome(page);
  const toggles = [
    "Toggle GitHub",
    "Toggle Wealthsimple",
    "Toggle Mintlify",
    "Toggle RBC",
    "Toggle Mosaic",
    "Toggle fun projects",
    "Toggle swag collection",
  ].map((name) => page.getByRole("button", { name, exact: true }));

  await Promise.all(
    toggles.map(async (toggle) => {
      await expect(toggle).toBeVisible();
      await waitForStableBox(toggle);
    })
  );
  await page.waitForLoadState("networkidle");
};

const transformStyle = async (page: Page): Promise<string> =>
  page
    .locator(".react-transform-component")
    .first()
    .evaluate((element) => {
      return getComputedStyle(element).transform;
    });

const panElementToCenter = async (
  page: Page,
  target: Locator
): Promise<void> => {
  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error("Performance scenarios require a fixed viewport");
  }

  const bounds = await target.boundingBox();
  if (!bounds) {
    throw new Error("Target has no rendered bounds to pan into view");
  }

  const deltaX = bounds.x + bounds.width / 2 - viewport.width / 2;
  const deltaY = bounds.y + bounds.height / 2 - viewport.height / 2;
  if (Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) {
    return;
  }

  await page.mouse.move(20, 20);
  await page.mouse.wheel(deltaX, deltaY);
  await expect
    .poll(async () => {
      const current = await target.boundingBox();
      if (!current) {
        return Number.POSITIVE_INFINITY;
      }
      return Math.max(
        Math.abs(current.x + current.width / 2 - viewport.width / 2),
        Math.abs(current.y + current.height / 2 - viewport.height / 2)
      );
    })
    .toBeLessThan(40);
};

const measureInteractionFeedback = async (
  lab: PerformanceLab,
  token: Awaited<ReturnType<PerformanceLab["startCapture"]>>,
  signal: string
): Promise<DurationSignal> => ({
  durationMs: await lab.elapsedMs(token),
  signal,
});

const measureCanvasReady = async (
  lab: PerformanceLab,
  token: Awaited<ReturnType<PerformanceLab["startCapture"]>>,
  signal: string
): Promise<DurationSignal> => ({
  durationMs: await lab.elapsedMs(token),
  signal,
});

const saveSamples = async (
  lab: PerformanceLab,
  samples: PerformanceSample[]
): Promise<void> => {
  await lab.attachSamples(samples);
};

const closeGitHubStack = async (
  page: Page,
  githubToggle: Locator
): Promise<void> => {
  await page.keyboard.press("Escape");
  await expect(githubToggle).toHaveAttribute("aria-expanded", "false");
};

const openGitHubStack = async (
  page: Page,
  lab: PerformanceLab,
  samples: PerformanceSample[],
  phase: string
): Promise<void> => {
  const githubToggle = page.getByRole("button", {
    name: "Toggle GitHub",
    exact: true,
  });
  const stack = page.locator('[data-card-stack-id="github-stack"]');
  const note = page.getByText(GITHUB_NOTE, { exact: true });
  const token = await lab.startCapture("github-stack", phase);

  await githubToggle.click();
  await expect(githubToggle).toHaveAttribute("aria-expanded", "true");
  await expect(stack).toHaveAttribute("data-expanded", "true");
  const feedback = await measureInteractionFeedback(
    lab,
    token,
    "GitHub cover aria-expanded becomes true"
  );

  await expect(note).toBeVisible();
  await waitForStableBox(note);
  const ready = await measureCanvasReady(
    lab,
    token,
    "GitHub stack content is present and its animated layout has settled"
  );
  samples.push(
    await lab.finishCapture(token, "github-stack", phase, feedback, ready, {
      interaction: "open GitHub stack",
      childCards: 1,
    })
  );
};

const countVisibleDecodedProjectImages = async (
  stack: Locator
): Promise<number> =>
  stack.evaluate((root) => {
    const intersectsViewport = (image: HTMLImageElement): boolean => {
      const bounds = image.getBoundingClientRect();
      const style = getComputedStyle(image);
      return (
        bounds.width > 0 &&
        bounds.height > 0 &&
        bounds.right > 0 &&
        bounds.bottom > 0 &&
        bounds.left < window.innerWidth &&
        bounds.top < window.innerHeight &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0
      );
    };
    return [...root.querySelectorAll<HTMLImageElement>("img[alt]")]
      .filter((image) => image.alt !== "Wealthsimple")
      .filter(intersectsViewport)
      .filter((image) => image.complete && image.naturalWidth > 0).length;
  });

const waitForVisibleDecodedProjectImages = async (
  stack: Locator
): Promise<number> => {
  await expect
    .poll(() => countVisibleDecodedProjectImages(stack))
    .toBeGreaterThanOrEqual(3);
  const decodedCount = await stack.evaluate(async (root) => {
    const visibleImages = [
      ...root.querySelectorAll<HTMLImageElement>("img[alt]"),
    ]
      .filter((image) => image.alt !== "Wealthsimple")
      .filter((image) => {
        const bounds = image.getBoundingClientRect();
        const style = getComputedStyle(image);
        return (
          bounds.width > 0 &&
          bounds.height > 0 &&
          bounds.right > 0 &&
          bounds.bottom > 0 &&
          bounds.left < window.innerWidth &&
          bounds.top < window.innerHeight &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0
        );
      });
    await Promise.all(visibleImages.map((image) => image.decode()));
    return visibleImages.filter(
      (image) => image.complete && image.naturalWidth > 0
    ).length;
  });
  expect(decodedCount).toBeGreaterThanOrEqual(3);
  return decodedCount;
};

const openWealthsimpleStack = async (
  page: Page,
  lab: PerformanceLab,
  samples: PerformanceSample[],
  phase: string
): Promise<void> => {
  const wealthsimpleToggle = page.getByRole("button", {
    name: "Toggle Wealthsimple",
    exact: true,
  });
  const stack = page.locator('[data-card-stack-id="wealthsimple-stack"]');
  const projectImages = stack.locator("img[alt]");
  const token = await lab.startCapture("wealthsimple-large-stack", phase);

  await wealthsimpleToggle.click();
  await expect(wealthsimpleToggle).toHaveAttribute("aria-expanded", "true");
  await expect(stack).toHaveAttribute("data-expanded", "true");
  const feedback = await measureInteractionFeedback(
    lab,
    token,
    "Wealthsimple cover aria-expanded becomes true"
  );

  await expect(projectImages).toHaveCount(15);
  const visibleDecodedProjectImages =
    await waitForVisibleDecodedProjectImages(stack);
  const ready = await measureCanvasReady(
    lab,
    token,
    "All 14 image-rich project cards are present and at least three visible project images decode"
  );
  samples.push(
    await lab.finishCapture(
      token,
      "wealthsimple-large-stack",
      phase,
      feedback,
      ready,
      {
        childCards: 14,
        projectImageElements: 14,
        visibleDecodedProjectImages,
        cacheState: phase === "cold" ? "first stack expansion" : "warm reopen",
      }
    )
  );
};

const spinWheelPan = async (
  page: Page,
  steps: number
): Promise<{ before: string; after: string }> => {
  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error("Performance scenarios require a fixed viewport");
  }

  const before = await transformStyle(page);
  await page.mouse.move(20, viewport.height - 12);
  for (let index = 0; index < steps; index += 1) {
    await page.mouse.wheel(index % 2 === 0 ? 3 : 2, 4);
    await page.waitForTimeout(12);
  }
  const after = await transformStyle(page);
  return { before, after };
};

test(
  "initial canvas load",
  { annotation: { type: SAMPLE_COUNT_ANNOTATION, description: "1" } },
  async ({ page, lab }) => {
    await gotoHome(page);
    const token = await lab.initialCapture();
    const githubToggle = page.getByRole("button", {
      name: "Toggle GitHub",
      exact: true,
    });
    const toggles = page.getByRole("button", { name: TOGGLE_LABEL_PATTERN });
    const reset = page.getByRole("button", {
      name: "Reset canvas",
      exact: true,
    });

    await expect(githubToggle).toBeVisible();
    await expect(toggles).toHaveCount(8);
    await expect(reset).toBeDisabled();
    const paintFeedback = await lab.firstContentfulPaint(token);
    const feedback =
      paintFeedback ??
      (await measureInteractionFeedback(
        lab,
        token,
        "First visible GitHub cover"
      ));
    await waitForStableBox(githubToggle);
    const ready = await measureCanvasReady(
      lab,
      token,
      "Seven stack controls, keyboard-mode toggle, and reset control are rendered"
    );
    const sample = await lab.finishCapture(
      token,
      "initial-load",
      "cold",
      feedback,
      ready,
      {
        expectedStackControls: 7,
        expectedToggleButtons: 8,
        includesKeyboardModeToggle: true,
        initialResetDisabled: true,
      }
    );
    await saveSamples(lab, [sample]);
  }
);

test(
  "cold and warm GitHub stack expansion",
  { annotation: { type: SAMPLE_COUNT_ANNOTATION, description: "2" } },
  async ({ page, lab }) => {
    await prepareCanvasForInteraction(page);
    const samples: PerformanceSample[] = [];
    const githubToggle = page.getByRole("button", {
      name: "Toggle GitHub",
      exact: true,
    });

    await expect(githubToggle).toHaveAttribute("aria-expanded", "false");
    await openGitHubStack(page, lab, samples, "cold");
    await closeGitHubStack(page, githubToggle);
    await waitForStableBox(page.getByText(GITHUB_NOTE, { exact: true }));
    await openGitHubStack(page, lab, samples, "warm");
    await saveSamples(lab, samples);
  }
);

test(
  "cold and warm image-rich Wealthsimple expansion",
  { annotation: { type: SAMPLE_COUNT_ANNOTATION, description: "2" } },
  async ({ page, lab }) => {
    await prepareCanvasForInteraction(page);
    const wealthsimpleToggle = page.getByRole("button", {
      name: "Toggle Wealthsimple",
      exact: true,
    });
    await panElementToCenter(page, wealthsimpleToggle);
    await page.waitForLoadState("networkidle");
    await expect(wealthsimpleToggle).toHaveAttribute("aria-expanded", "false");

    const samples: PerformanceSample[] = [];
    await openWealthsimpleStack(page, lab, samples, "cold");
    await page.keyboard.press("Escape");
    await expect(wealthsimpleToggle).toHaveAttribute("aria-expanded", "false");
    await waitForStableBox(wealthsimpleToggle);
    await openWealthsimpleStack(page, lab, samples, "warm");
    await saveSamples(lab, samples);
  }
);

test(
  "102-item Swag expansion with continuous pan",
  { annotation: { type: SAMPLE_COUNT_ANNOTATION, description: "1" } },
  async ({ page, lab }) => {
    await prepareCanvasForInteraction(page);
    const swagToggle = page.getByRole("button", {
      name: "Toggle swag collection",
      exact: true,
    });
    const swagStack = page.locator('[data-swag-stack-id="swag-stack"]');
    const reset = page.getByRole("button", {
      name: "Reset canvas",
      exact: true,
    });
    await panElementToCenter(page, swagToggle);
    await page.waitForLoadState("networkidle");
    await expect(swagToggle).toHaveAttribute("aria-expanded", "false");

    const token = await lab.startCapture("swag-expansion-pan", "expanded-102");
    await swagToggle.click();
    await expect(swagToggle).toHaveAttribute("aria-expanded", "true");
    await expect(swagStack).toHaveAttribute("data-expanded", "true");
    const feedback = await measureInteractionFeedback(
      lab,
      token,
      "Swag cover aria-expanded becomes true"
    );

    const swagImages = swagStack.locator("img");
    await expect(swagImages).toHaveCount(SWAG_ITEM_COUNT);
    const ready = await measureCanvasReady(
      lab,
      token,
      "All 102 Swag image elements are rendered"
    );
    const { before, after } = await spinWheelPan(page, CONTINUOUS_PAN_STEPS);
    expect(after).not.toBe(before);
    await expect(reset).toBeEnabled();

    const sample = await lab.finishCapture(
      token,
      "swag-expansion-pan",
      "expanded-102",
      feedback,
      ready,
      {
        itemCount: SWAG_ITEM_COUNT,
        continuousWheelEvents: CONTINUOUS_PAN_STEPS,
        wheelDeltaXPattern: "alternating 3px/2px",
        wheelDeltaY: 4,
      }
    );
    await saveSamples(lab, [sample]);
  }
);

test(
  "continuous single-card drag",
  { annotation: { type: SAMPLE_COUNT_ANNOTATION, description: "1" } },
  async ({ page, lab }) => {
    await prepareCanvasForInteraction(page);
    const card = page.getByRole("button", {
      name: "Toggle GitHub",
      exact: true,
    });
    const draggableGroup = page.locator('[data-card-stack-id="github-stack"]');
    await expect(card).toBeVisible();
    await waitForStableBox(card);

    const initialBounds = await card.boundingBox();
    if (!initialBounds) {
      throw new Error("GitHub stack cover has no rendered bounds");
    }
    const startX = initialBounds.x + initialBounds.width / 2;
    const startY = initialBounds.y + initialBounds.height / 2;
    const deltaX = 220;
    const deltaY = 150;
    const token = await lab.startCapture(
      "continuous-card-drag",
      "github-stack"
    );

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    let feedback: DurationSignal | null = null;
    try {
      for (let index = 1; index <= CONTINUOUS_DRAG_STEPS; index += 1) {
        const progress = index / CONTINUOUS_DRAG_STEPS;
        await page.mouse.move(
          startX + deltaX * progress,
          startY + deltaY * progress
        );
        if (index === 1) {
          await expect(draggableGroup).toHaveClass(CURSOR_GRABBING_PATTERN);
          feedback = await measureInteractionFeedback(
            lab,
            token,
            "GitHub card stack enters cursor-grabbing state"
          );
        }
        await page.waitForTimeout(12);
      }
    } finally {
      await page.mouse.up();
    }

    if (!feedback) {
      throw new Error("Card drag did not produce its first-feedback signal");
    }
    await expect(draggableGroup).not.toHaveClass(CURSOR_GRABBING_PATTERN);
    await expect(card).toHaveAttribute("aria-expanded", "false");
    const finalBounds = await card.boundingBox();
    expect(finalBounds).not.toBeNull();
    if (!finalBounds) {
      throw new Error(
        "GitHub stack cover lost its rendered bounds after dragging"
      );
    }
    expect(
      Math.abs(finalBounds.x - initialBounds.x) +
        Math.abs(finalBounds.y - initialBounds.y)
    ).toBeGreaterThan(100);
    await waitForStableBox(card);
    const ready = await measureCanvasReady(
      lab,
      token,
      "Dragged GitHub card has a committed, stable position"
    );
    const sample = await lab.finishCapture(
      token,
      "continuous-card-drag",
      "github-stack",
      feedback,
      ready,
      {
        pointerMoveSteps: CONTINUOUS_DRAG_STEPS,
        dragDeltaX: deltaX,
        dragDeltaY: deltaY,
        cardId: "github-stack",
      }
    );
    await saveSamples(lab, [sample]);
  }
);

test(
  "rapid open, close, pan, and reset",
  { annotation: { type: SAMPLE_COUNT_ANNOTATION, description: "1" } },
  async ({ page, lab }) => {
    await prepareCanvasForInteraction(page);
    const githubToggle = page.getByRole("button", {
      name: "Toggle GitHub",
      exact: true,
    });
    const reset = page.getByRole("button", {
      name: "Reset canvas",
      exact: true,
    });
    const token = await lab.startCapture(
      "rapid-open-close-reset",
      "repeated-cycle"
    );
    let feedback: DurationSignal | null = null;

    for (let cycle = 0; cycle < RAPID_INTERACTION_CYCLES; cycle += 1) {
      await githubToggle.click();
      await expect(githubToggle).toHaveAttribute("aria-expanded", "true");
      if (feedback === null) {
        feedback = await measureInteractionFeedback(
          lab,
          token,
          "First GitHub cover aria-expanded becomes true"
        );
      }

      await closeGitHubStack(page, githubToggle);
      await page.mouse.move(20, 20);
      await page.mouse.wheel(9, 8);
      await expect(reset).toBeEnabled();
      await reset.click();
      await expect(reset).toBeDisabled();
    }

    if (!feedback) {
      throw new Error("Rapid interaction workload did not produce feedback");
    }
    const ready = await measureCanvasReady(
      lab,
      token,
      "Canvas reset is disabled after all repeated cycles"
    );
    const sample = await lab.finishCapture(
      token,
      "rapid-open-close-reset",
      "repeated-cycle",
      feedback,
      ready,
      {
        cycles: RAPID_INTERACTION_CYCLES,
        actionsPerCycle: "open GitHub, Escape close, wheel pan, reset canvas",
        wheelDeltaX: 9,
        wheelDeltaY: 8,
      }
    );
    await saveSamples(lab, [sample]);
  }
);

const videoHasSource = async (video: Locator): Promise<boolean> =>
  video.evaluate((element) =>
    Boolean(element.getAttribute("src") || element.querySelector("source[src]"))
  );

const waitForPlayableVideo = async (video: Locator): Promise<void> => {
  await expect
    .poll(() =>
      video.evaluate(
        (element: HTMLVideoElement) =>
          element.readyState >= 2 &&
          element.videoWidth > 0 &&
          element.videoHeight > 0 &&
          !element.paused
      )
    )
    .toBe(true);
};

const centerVideoAndMeasure = async (
  page: Page,
  lab: PerformanceLab,
  token: Awaited<ReturnType<PerformanceLab["startCapture"]>>,
  video: Locator,
  samples: PerformanceSample[]
): Promise<void> => {
  await panElementToCenter(page, video);
  await expect.poll(() => videoHasSource(video)).toBe(true);
  const feedback = await measureInteractionFeedback(
    lab,
    token,
    "Visible project video receives a source"
  );
  await waitForPlayableVideo(video);
  const ready = await measureCanvasReady(
    lab,
    token,
    "Visible video has a decoded frame and is actively playing"
  );
  samples.push(
    await lab.finishCapture(
      token,
      "visible-video",
      "cold-visible",
      feedback,
      ready,
      {
        projectCardIndex: 6,
        assetType: "local production WebM",
        readyState: "HAVE_CURRENT_DATA or greater with decoded dimensions",
        playbackActive: true,
        cacheState: "first visible load",
      }
    )
  );
};

test(
  "cold and warm visible project video",
  { annotation: { type: SAMPLE_COUNT_ANNOTATION, description: "2" } },
  async ({ page, lab }) => {
    await prepareCanvasForInteraction(page);
    const funToggle = page.getByRole("button", {
      name: "Toggle fun projects",
      exact: true,
    });
    await panElementToCenter(page, funToggle);

    const coldToken = await lab.startCapture("visible-video", "cold-visible");
    await funToggle.click();
    await expect(funToggle).toHaveAttribute("aria-expanded", "true");
    const funStack = page.locator('[data-fun-stack-id="fun-projects-stack"]');
    await expect(funStack).toHaveAttribute("data-expanded", "true");
    await expect(funStack).toHaveAttribute("data-layout-ready", "true");

    const videoCard = page.locator('[data-fun-content-card-index="6"]');
    const video = videoCard.locator("video");
    await expect(video).toHaveCount(1);
    const samples: PerformanceSample[] = [];
    await centerVideoAndMeasure(page, lab, coldToken, video, samples);

    const offscreenAnchor = page.locator('[data-fun-content-card-index="0"]');
    await panElementToCenter(page, offscreenAnchor);
    await expect
      .poll(() =>
        video.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return (
            bounds.right <= 0 ||
            bounds.bottom <= 0 ||
            bounds.left >= window.innerWidth ||
            bounds.top >= window.innerHeight
          );
        })
      )
      .toBe(true);
    await expect.poll(() => videoHasSource(video)).toBe(false);
    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
      .toBe(true);
    await expect(video).toHaveAttribute("preload", "none");
    expect(
      await video.evaluate((element: HTMLVideoElement) => element.autoplay)
    ).toBe(false);

    const warmToken = await lab.startCapture("visible-video", "warm-visible");
    await panElementToCenter(page, video);
    await expect.poll(() => videoHasSource(video)).toBe(true);
    const warmFeedback = await measureInteractionFeedback(
      lab,
      warmToken,
      "Revisited visible video receives its source after offscreen unload"
    );
    await waitForPlayableVideo(video);
    const warmMediaResource = await video.evaluate((element, startedAt) => {
      const matchingEntries = (
        performance.getEntriesByType("resource") as PerformanceResourceTiming[]
      ).filter(
        (entry) =>
          entry.name === (element as HTMLVideoElement).currentSrc &&
          entry.startTime >= startedAt
      );
      const latest = matchingEntries.at(-1);
      return {
        resourceTimingEntryCount: matchingEntries.length,
        transferSizeBytes: latest?.transferSize ?? -1,
        encodedBodyBytes: latest?.encodedBodySize ?? -1,
        decodedBodyBytes: latest?.decodedBodySize ?? -1,
      };
    }, warmToken.startedAt);
    const warmReady = await measureCanvasReady(
      lab,
      warmToken,
      "Warm visible video has a decoded frame and resumes playback"
    );
    const warmSample = await lab.finishCapture(
      warmToken,
      "visible-video",
      "warm-visible",
      warmFeedback,
      warmReady,
      {
        projectCardIndex: 6,
        assetType: "local production WebM",
        readyState: "HAVE_CURRENT_DATA or greater with decoded dimensions",
        playbackActive: true,
        videoWasUnloadedOffscreen: true,
        browserHttpCacheEnabled: true,
        cacheState:
          "offscreen unload followed by revisit in the warmed context",
        warmMediaResourceTimingEntries:
          warmMediaResource.resourceTimingEntryCount,
        warmMediaTransferSizeBytes: warmMediaResource.transferSizeBytes,
        warmMediaEncodedBodyBytes: warmMediaResource.encodedBodyBytes,
        warmMediaDecodedBodyBytes: warmMediaResource.decodedBodyBytes,
      }
    );
    samples.push(warmSample);
    await saveSamples(lab, samples);
  }
);
