import { test as base } from "@playwright/test";
import { PINNED_FONT_STYLESHEET } from "./visual/font-stylesheet";

interface E2EOptions {
  pinVisualFonts: boolean;
}

export const test = base.extend<E2EOptions>({
  pinVisualFonts: [false, { option: true }],
  page: async ({ baseURL, page, pinVisualFonts }, use) => {
    if (!baseURL) {
      throw new Error("E2E tests require a configured baseURL");
    }

    const appOrigin = new URL(baseURL).origin;
    await page.addInitScript(() => {
      let seed = 0x7a_4d_13_5b;
      Math.random = () => {
        seed = (seed * 48_271) % 2_147_483_647;
        return (seed - 1) / 2_147_483_646;
      };

      const trackedWindow = window as Window & {
        __e2eVisualMutationCount?: number;
      };
      trackedWindow.__e2eVisualMutationCount = 0;
      const observer = new MutationObserver((records) => {
        if (
          records.some(
            (record) =>
              record.type === "childList" || record.attributeName === "style"
          )
        ) {
          trackedWindow.__e2eVisualMutationCount =
            (trackedWindow.__e2eVisualMutationCount ?? 0) + 1;
        }
      });
      observer.observe(document.documentElement, {
        attributeFilter: ["style"],
        attributes: true,
        childList: true,
        subtree: true,
      });
    });

    await page.route("**/*", async (route) => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.origin === appOrigin) {
        await route.continue();
        return;
      }

      if (
        pinVisualFonts &&
        requestUrl.origin === "https://fonts.googleapis.com"
      ) {
        await route.fulfill({
          body: PINNED_FONT_STYLESHEET,
          contentType: "text/css; charset=utf-8",
        });
        return;
      }

      await route.abort("blockedbyclient");
    });

    await use(page);
  },
});
