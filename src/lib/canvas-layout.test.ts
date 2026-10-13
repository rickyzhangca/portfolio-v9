import { describe, expect, it } from "vitest";
import {
  COMPACT_VIEWPORT_MAX_WIDTH_PX,
  DESKTOP_CANVAS_LAYOUT,
  getCanvasLayout,
  isCompactViewport,
} from "./canvas-layout";

describe("getCanvasLayout", () => {
  it("keeps the wide layout from the compact breakpoint upwards", () => {
    expect(getCanvasLayout(COMPACT_VIEWPORT_MAX_WIDTH_PX)).toBe(
      DESKTOP_CANVAS_LAYOUT
    );
    expect(getCanvasLayout(1440)).toBe(DESKTOP_CANVAS_LAYOUT);
    expect(isCompactViewport(COMPACT_VIEWPORT_MAX_WIDTH_PX - 1)).toBe(true);
  });

  it("reveals one column at a time on phones", () => {
    const layout = getCanvasLayout(390);
    expect(layout.compact).toBe(true);
    expect(layout.stackColumns).toBe(1);
    expect(layout.autoPanMargin).toBeLessThan(
      DESKTOP_CANVAS_LAYOUT.autoPanMargin
    );
    // Description cards never outgrow the screen they are read on.
    expect(layout.funContentWidth).toBe(390 - layout.autoPanMargin * 2);
  });

  it("fits two scaled swag columns and their gap between the margins", () => {
    for (const width of [320, 360, 390, 430, 600]) {
      const { autoPanMargin, swag } = getCanvasLayout(width);
      const columnsWidth =
        swag.columns * swag.itemSize * swag.expandedScale + 18;
      expect(columnsWidth).toBeLessThanOrEqual(width - autoPanMargin * 2);
      expect(swag.itemSize).toBeLessThanOrEqual(
        DESKTOP_CANVAS_LAYOUT.swag.itemSize
      );
    }
  });

  it("keeps the swag image aspect ratio when shrinking", () => {
    const { swag } = getCanvasLayout(360);
    expect(swag.imageHeight / swag.itemSize).toBeCloseTo(120 / 180, 1);
  });
});
