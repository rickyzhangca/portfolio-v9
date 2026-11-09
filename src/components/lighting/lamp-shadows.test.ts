import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTransformCache,
  hasOwnTransform,
  isLampVisible,
  screenBounds,
  screenLinear,
} from "./lamp-shadows";

afterEach(() => vi.restoreAllMocks());

describe("lamp frame measurements", () => {
  it("shares computed styles between the linear transform and own-transform check", () => {
    const element = document.createElement("div");
    element.style.transform = "matrix(1, 0, 0, 1, 10, 0)";
    const read = vi.spyOn(window, "getComputedStyle");
    const cache = createTransformCache();
    expect(screenLinear(element, cache)).toEqual({ a: 1, b: 0, c: 0, d: 1 });
    expect(hasOwnTransform(element, cache)).toBe(true);
    expect(read).toHaveBeenCalledTimes(1);
    screenLinear(element, cache);
    expect(read).toHaveBeenCalledTimes(1);
    screenLinear(element, createTransformCache());
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("shares bounds within a frame but reads them again next frame", () => {
    const element = document.createElement("div");
    const read = vi.spyOn(element, "getBoundingClientRect");
    const cache = createTransformCache();
    screenBounds(element, cache);
    screenBounds(element, cache);
    expect(read).toHaveBeenCalledTimes(1);
    screenBounds(element, createTransformCache());
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("culls distant casters, not shadows just beyond the viewport", () => {
    expect(
      isLampVisible(DOMRect.fromRect({ height: 40, width: 40, x: -100, y: 0 }))
    ).toBe(true);
    expect(
      isLampVisible(DOMRect.fromRect({ height: 40, width: 40, x: -1000, y: 0 }))
    ).toBe(false);
    expect(isLampVisible(DOMRect.fromRect({ height: 40, width: 0 }))).toBe(
      false
    );
  });
});
