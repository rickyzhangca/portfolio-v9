import { describe, expect, it } from "vitest";
import { getCardShadowStyle, getShadowRecipe } from "./card-shadow";
import { getShadowLighting } from "./shadow-lighting";

const SHADOW_OPACITY_PATTERN = /rgba\(0, 0, 0, ([0-9.]+)\)/;
const DROP_SHADOW_PATTERN =
  /drop-shadow\(([-0-9.]+)px ([-0-9.]+)px ([-0-9.]+)px rgba\(0, 0, 0, ([0-9.]+)\)\)/;

const getShadowOpacity = (filter: string) => {
  const match = filter.match(SHADOW_OPACITY_PATTERN);

  if (!match) {
    throw new Error(`Could not parse shadow opacity from "${filter}"`);
  }

  return Number(match[1]);
};

const parseDropShadow = (filter: string) => {
  const match = filter.match(DROP_SHADOW_PATTERN);

  if (!match) {
    throw new Error(`Could not parse drop shadow from "${filter}"`);
  }

  return {
    x: Number(match[1]),
    y: Number(match[2]),
    blur: Number(match[3]),
    opacity: Number(match[4]),
  };
};

describe("getCardShadowStyle", () => {
  it("returns a filter style for canvas shadows", () => {
    expect(
      getCardShadowStyle({
        surface: "canvas-filter",
      })
    ).toEqual({
      filter: expect.stringContaining("drop-shadow("),
    });
  });

  it("returns a box shadow style for card surfaces", () => {
    expect(
      getCardShadowStyle({
        surface: "card-box-shadow",
      })
    ).toEqual({
      boxShadow: expect.any(String),
    });
  });

  it("uses stable fallback geometry when z and object height are omitted", () => {
    expect(
      getCardShadowStyle({
        surface: "card-box-shadow",
      })
    ).toEqual(
      getCardShadowStyle({
        surface: "card-box-shadow",
        z: undefined,
        objectHeight: undefined,
      })
    );
  });

  it("increases projected offset and blur for larger z at the same object height", () => {
    const low = parseDropShadow(
      getCardShadowStyle({
        surface: "canvas-filter",
        z: 8,
        objectHeight: 180,
      }).filter ?? ""
    );
    const high = parseDropShadow(
      getCardShadowStyle({
        surface: "canvas-filter",
        z: 24,
        objectHeight: 180,
      }).filter ?? ""
    );

    expect(Math.abs(high.x) + Math.abs(high.y)).toBeGreaterThan(
      Math.abs(low.x) + Math.abs(low.y)
    );
    expect(high.blur).toBeGreaterThan(low.blur);
  });

  it("uses object height to keep taller objects tighter and darker at the same z", () => {
    const shortObject = parseDropShadow(
      getCardShadowStyle({
        surface: "canvas-filter",
        z: 16,
        objectHeight: 96,
        lighting: getShadowLighting(12, "live"),
      }).filter ?? ""
    );
    const tallObject = parseDropShadow(
      getCardShadowStyle({
        surface: "canvas-filter",
        z: 16,
        objectHeight: 240,
        lighting: getShadowLighting(12, "live"),
      }).filter ?? ""
    );

    expect(tallObject.blur).toBeLessThan(shortObject.blur);
    expect(tallObject.opacity).toBeGreaterThan(shortObject.opacity);
  });

  it("changes shadow direction and strength when lighting is provided", () => {
    expect(
      getCardShadowStyle({
        surface: "canvas-filter",
        z: 16,
        objectHeight: 180,
        lighting: getShadowLighting(8, "live"),
      }).filter
    ).not.toBe(
      getCardShadowStyle({
        surface: "canvas-filter",
        z: 16,
        objectHeight: 180,
        lighting: getShadowLighting(16, "live"),
      }).filter
    );
  });

  it("produces visibly different default canvas shadows across a day sweep", () => {
    const midnightShadow = parseDropShadow(
      getCardShadowStyle({
        surface: "canvas-filter",
        z: 16,
        objectHeight: 180,
        lighting: getShadowLighting(0, "debug"),
      }).filter ?? ""
    );

    const noonShadow = parseDropShadow(
      getCardShadowStyle({
        surface: "canvas-filter",
        z: 16,
        objectHeight: 180,
        lighting: getShadowLighting(12, "debug"),
      }).filter ?? ""
    );

    expect(Math.abs(midnightShadow.blur - noonShadow.blur)).toBeGreaterThan(4);
    expect(
      Math.abs(midnightShadow.opacity - noonShadow.opacity)
    ).toBeGreaterThan(0.08);
  });

  it("returns a single geometry-derived layer", () => {
    expect(
      getShadowRecipe({
        z: 8,
        objectHeight: 120,
        lighting: getShadowLighting(12, "debug"),
      })
    ).toHaveLength(1);
  });

  it("keeps hover-style and focus-style z deltas modest when supplied explicitly", () => {
    const restOpacity = getShadowOpacity(
      getCardShadowStyle({
        surface: "canvas-filter",
        z: 16,
        objectHeight: 180,
      }).filter ?? ""
    );
    const hoverOpacity = getShadowOpacity(
      getCardShadowStyle({
        surface: "canvas-filter",
        z: 20,
        objectHeight: 180,
      }).filter ?? ""
    );
    const focusedRecipe = getShadowRecipe({
      z: 12,
      objectHeight: 120,
    });
    const restRecipe = getShadowRecipe({
      z: 8,
      objectHeight: 120,
    });

    expect(hoverOpacity - restOpacity).toBeLessThan(0.05);
    expect((focusedRecipe[0]?.opacity ?? 0) - (restRecipe[0]?.opacity ?? 0)).toBeLessThan(
      0.05
    );
  });
});
