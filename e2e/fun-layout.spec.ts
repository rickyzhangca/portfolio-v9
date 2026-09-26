import { expect, type Locator } from "@playwright/test";
import { test } from "./fixtures";

const waitForStableGeometry = async (stack: Locator) => {
  let previousGeometry = "";
  let stableSamples = 0;

  await expect
    .poll(
      async () => {
        const geometry = await stack.evaluate((element) => {
          const cover = element.querySelector<HTMLElement>(
            '[aria-label="Toggle fun projects"]'
          );
          const cards = Array.from(
            element.querySelectorAll<HTMLElement>(
              "[data-fun-content-card-index]"
            )
          );
          return [cover, ...cards]
            .filter((candidate): candidate is HTMLElement => candidate !== null)
            .map((candidate) => {
              const bounds = candidate.getBoundingClientRect();
              const style = window.getComputedStyle(candidate);
              return [
                bounds.x,
                bounds.y,
                bounds.width,
                bounds.height,
                style.opacity,
                style.visibility,
              ]
                .map((value) =>
                  typeof value === "number"
                    ? Math.round(value * 100) / 100
                    : value
                )
                .join(",");
            })
            .join(";");
        });

        stableSamples = geometry === previousGeometry ? stableSamples + 1 : 0;
        previousGeometry = geometry;
        return stableSamples >= 4;
      },
      { intervals: [100], timeout: 15_000 }
    )
    .toBe(true);
};

test("late fun-project content avoids overlap without overriding manual pan", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName === "webkit" && isMobile,
    "Mobile WebKit does not support the wheel input used for manual panning"
  );

  let releaseMarkdown!: () => void;
  const markdownGate = new Promise<void>((resolve) => {
    releaseMarkdown = resolve;
  });
  let markdownRequestIntercepted = false;

  await page.route("**/markdown-renderer-*.js", async (route) => {
    markdownRequestIntercepted = true;
    await markdownGate;
    await route.continue();
  });

  try {
    await page.goto("/");

    const funProjects = page.getByRole("button", {
      name: "Toggle fun projects",
      exact: true,
    });
    await funProjects.press("Enter");
    await expect(funProjects).toHaveAttribute("aria-expanded", "true");
    await expect
      .poll(() => markdownRequestIntercepted, {
        intervals: [100],
        timeout: 15_000,
      })
      .toBe(true);

    const stack = page.locator("[data-fun-stack-id]");
    await expect(stack).toHaveAttribute("data-layout-ready", "false");
    const contentCards = stack.locator("[data-fun-content-card-index]");
    const contentCardCount = await contentCards.count();
    expect(contentCardCount).toBeGreaterThan(1);

    const firstCardPanel = contentCards.first().locator(":scope > div");
    const initialPanelHeight = await firstCardPanel.evaluate(
      (element) => (element as HTMLElement).offsetHeight
    );

    await waitForStableGeometry(stack);
    const coverBoundsBeforePan = await funProjects.boundingBox();
    expect(coverBoundsBeforePan).not.toBeNull();
    if (!coverBoundsBeforePan) {
      throw new Error("Fun-project cover has no rendered bounds");
    }

    await page.mouse.move(10, 10);
    await page.mouse.wheel(0, 180);
    await expect
      .poll(async () => {
        const bounds = await funProjects.boundingBox();
        return bounds ? Math.abs(bounds.y - coverBoundsBeforePan.y) : 0;
      })
      .toBeGreaterThan(60);
    await waitForStableGeometry(stack);

    const coverBoundsAfterPan = await funProjects.boundingBox();
    expect(coverBoundsAfterPan).not.toBeNull();
    if (!coverBoundsAfterPan) {
      throw new Error("Fun-project cover has no rendered bounds after panning");
    }

    releaseMarkdown();
    await expect(stack).toHaveAttribute("data-layout-ready", "true", {
      timeout: 15_000,
    });
    await expect(contentCards.first()).toBeVisible();
    await expect
      .poll(() =>
        firstCardPanel.evaluate(
          (element) => (element as HTMLElement).offsetHeight
        )
      )
      .toBeGreaterThan(initialPanelHeight);
    await waitForStableGeometry(stack);

    const resolvedCards = await contentCards.all();
    for (const card of resolvedCards) {
      await expect(card).toBeVisible();
    }

    const finalCoverBounds = await funProjects.boundingBox();
    expect(finalCoverBounds).not.toBeNull();
    if (!finalCoverBounds) {
      throw new Error("Fun-project cover has no rendered bounds after layout");
    }
    expect(
      Math.abs(finalCoverBounds.x - coverBoundsAfterPan.x)
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(finalCoverBounds.y - coverBoundsAfterPan.y)
    ).toBeLessThanOrEqual(1);

    const cardBounds = await contentCards.evaluateAll((cards) =>
      cards
        .map((card) => {
          const bounds = card.getBoundingClientRect();
          return {
            bottom: bounds.bottom,
            index: Number(card.getAttribute("data-fun-content-card-index")),
            top: bounds.top,
          };
        })
        .sort((first, second) => first.index - second.index)
    );
    expect(cardBounds).toHaveLength(contentCardCount);
    for (let index = 1; index < cardBounds.length; index++) {
      const previous = cardBounds[index - 1];
      const current = cardBounds[index];
      expect(previous).toBeDefined();
      expect(current).toBeDefined();
      if (!(previous && current)) {
        throw new Error("Expected measured fun-project content cards");
      }
      expect(current.index).toBe(index);
      expect(current.top).toBeGreaterThanOrEqual(previous.bottom - 1);
    }
  } finally {
    releaseMarkdown();
  }
});
