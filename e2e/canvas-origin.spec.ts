import { expect } from "@playwright/test";
import { test } from "./fixtures";

test("initial canvas and resize preserve the scene origin", async ({
  page,
}) => {
  await page.setViewportSize({ width: 2000, height: 1080 });
  await page.goto("/");
  const content = page.locator(".react-transform-component");
  const cover = page.getByRole("button", {
    name: "Toggle GitHub",
    exact: true,
  });
  const reset = page.getByRole("button", { name: "Reset canvas", exact: true });

  for (const viewport of [
    { width: 2000, height: 1080 },
    { width: 1024, height: 768 },
    { width: 2000, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(() =>
        content.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
          };
        })
      )
      .toEqual({ x: 0, y: 0, ...viewport });
    await expect
      .poll(async () => {
        const bounds = await cover.boundingBox();
        return bounds && { x: bounds.x, y: bounds.y };
      })
      .toEqual({ x: 80, y: 200 });
    await expect(reset).toBeDisabled();
  }
});
