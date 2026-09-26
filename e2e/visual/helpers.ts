import { expect, type Locator, type Page } from "@playwright/test";

const MAX_STABILITY_FRAMES = 600;
const REQUIRED_STABLE_FRAMES = 10;
export const waitForPinnedFonts = async (page: Page) => {
  await page.evaluate(async () => {
    const loadedFaces = await Promise.all([
      document.fonts.load('16px "Google Sans"', "Canvas visuals"),
      document.fonts.load('italic 16px "Google Sans"', "Canvas visuals"),
      document.fonts.load('16px "Playpen Sans"', "Canvas visuals"),
    ]);
    await document.fonts.ready;
    const areFontsLoaded = loadedFaces.every((faces) =>
      faces.some((font) => font.status === "loaded")
    );
    if (!areFontsLoaded) {
      throw new Error("Pinned visual font fixtures did not load");
    }
  });
};

const waitForMotionToSettle = async (page: Page) => {
  await page.evaluate(
    async ({ maxFrames, stableFramesRequired }) => {
      const trackedWindow = window as Window & {
        __e2eVisualMutationCount?: number;
      };
      let lastMutationCount = trackedWindow.__e2eVisualMutationCount;
      if (lastMutationCount === undefined) {
        throw new Error("Visual mutation tracking was not installed");
      }

      const getMotionState = () =>
        Array.from(document.querySelectorAll<HTMLElement>("[style]"))
          .filter((element) => element.style.transform || element.style.opacity)
          .map((element) => {
            const bounds = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            return [
              Math.round(bounds.x * 100),
              Math.round(bounds.y * 100),
              Math.round(bounds.width * 100),
              Math.round(bounds.height * 100),
              style.transform,
              style.opacity,
            ].join(",");
          })
          .join(";");

      let lastMotionState = getMotionState();
      let stableFrames = 0;
      for (let frame = 0; frame < maxFrames; frame++) {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });

        const nextMutationCount = trackedWindow.__e2eVisualMutationCount;
        const nextMotionState = getMotionState();
        if (
          nextMutationCount === lastMutationCount &&
          nextMotionState === lastMotionState
        ) {
          stableFrames += 1;
          if (stableFrames >= stableFramesRequired) {
            return;
          }
        } else {
          lastMutationCount = nextMutationCount;
          lastMotionState = nextMotionState;
          stableFrames = 0;
        }
      }

      throw new Error(
        `Canvas styles did not settle within ${maxFrames} animation frames`
      );
    },
    {
      maxFrames: MAX_STABILITY_FRAMES,
      stableFramesRequired: REQUIRED_STABLE_FRAMES,
    }
  );
};

const waitForVisibleImages = async (page: Page) => {
  await page.evaluate(async () => {
    const images = Array.from(document.images).filter((image) => {
      const bounds = image.getBoundingClientRect();
      if (
        bounds.width <= 0 ||
        bounds.height <= 0 ||
        bounds.right <= 0 ||
        bounds.bottom <= 0 ||
        bounds.left >= window.innerWidth ||
        bounds.top >= window.innerHeight
      ) {
        return false;
      }

      let ancestor = image.parentElement;
      while (ancestor) {
        const style = window.getComputedStyle(ancestor);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.visibility === "collapse" ||
          Number.parseFloat(style.opacity) <= 0
        ) {
          return false;
        }
        ancestor = ancestor.parentElement;
      }
      return window.getComputedStyle(image).visibility !== "hidden";
    });

    await Promise.all(
      images.map(async (image) => {
        if (!image.currentSrc) {
          return;
        }
        if (!image.complete) {
          await new Promise<void>((resolve, reject) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener(
              "error",
              () =>
                reject(
                  new Error(`Visible image failed to load: ${image.currentSrc}`)
                ),
              { once: true }
            );
          });
        }
        if (image.naturalWidth === 0) {
          throw new Error(
            `Visible image has no decoded pixels: ${image.currentSrc}`
          );
        }
        await image.decode();
      })
    );
  });
};

export const freezeVisibleVideosAtStart = async (videos: Locator) => {
  await expect
    .poll(
      () =>
        videos.evaluateAll((elements) => {
          const visibleVideos = elements.filter((element) => {
            if (!(element instanceof HTMLVideoElement)) {
              return false;
            }
            const bounds = element.getBoundingClientRect();
            return (
              bounds.width > 0 &&
              bounds.height > 0 &&
              bounds.right > 0 &&
              bounds.bottom > 0 &&
              bounds.left < window.innerWidth &&
              bounds.top < window.innerHeight
            );
          });
          return visibleVideos.every(
            (video) =>
              video instanceof HTMLVideoElement &&
              Boolean(video.currentSrc) &&
              (video.readyState >= 2 || video.error !== null)
          );
        }),
      { timeout: 15_000 }
    )
    .toBe(true);

  await videos.evaluateAll(async (elements) => {
    for (const element of elements) {
      if (!(element instanceof HTMLVideoElement)) {
        continue;
      }
      const bounds = element.getBoundingClientRect();
      const isInViewport =
        bounds.width > 0 &&
        bounds.height > 0 &&
        bounds.right > 0 &&
        bounds.bottom > 0 &&
        bounds.left < window.innerWidth &&
        bounds.top < window.innerHeight;
      if (!isInViewport) {
        continue;
      }

      element.pause();
      if (
        element.error ||
        element.readyState < 2 ||
        element.currentTime === 0
      ) {
        continue;
      }

      const seeked = new Promise<void>((resolve) => {
        element.addEventListener("seeked", () => resolve(), { once: true });
      });
      element.currentTime = 0;
      if (element.seeking) {
        await seeked;
      }
      element.pause();
    }
  });
};

export const waitForVisualStability = async (page: Page) => {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await waitForMotionToSettle(page);
  await waitForVisibleImages(page);
  await waitForMotionToSettle(page);
};

export const expectVisualSnapshot = async (page: Page, name: string) => {
  await waitForVisualStability(page);
  await expect(page).toHaveScreenshot(name, {
    animations: "disabled",
    caret: "hide",
  });
};
