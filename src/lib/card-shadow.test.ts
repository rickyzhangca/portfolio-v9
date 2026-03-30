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
  it("returns a filter style for silhouette shadows", () => {
    expect(
      getCardShadowStyle({
        surface: "canvas-filter",
        role: "silhouette",
      })
    ).toEqual({
      filter: expect.stringContaining("drop-shadow("),
    });
  });

  it("returns a box shadow style for card surfaces", () => {
    expect(
      getCardShadowStyle({
        surface: "card-box-shadow",
        role: "surface",
        tone: "paper",
      })
    ).toEqual({
      boxShadow: expect.any(String),
    });
  });

  it("uses stable fallback depth when z-index context is omitted", () => {
    expect(
      getCardShadowStyle({
        surface: "card-box-shadow",
        role: "surface",
      })
    ).toEqual(
      getCardShadowStyle({
        surface: "card-box-shadow",
        role: "surface",
        zIndex: undefined,
        maxZIndex: undefined,
      })
    );
  });

  it("changes shadow output between rest and hover states", () => {
    expect(
      getCardShadowStyle({
        surface: "canvas-filter",
        role: "silhouette",
        state: "rest",
      }).filter
    ).not.toBe(
      getCardShadowStyle({
        surface: "canvas-filter",
        role: "silhouette",
        state: "hover",
      }).filter
    );
  });

  it("keeps silhouette and surface elevations in the same band", () => {
    const silhouette = getShadowRecipe({
      role: "silhouette",
      state: "rest",
      zIndex: 5,
      maxZIndex: 10,
    });
    const surface = getShadowRecipe({
      role: "surface",
      state: "expanded",
      zIndex: 5,
      maxZIndex: 10,
    });

    expect(
      Math.abs((silhouette[0]?.opacity ?? 0) - (surface[0]?.opacity ?? 0))
    ).toBeLessThan(0.04);
    expect(
      Math.abs((silhouette[0]?.blur ?? 0) - (surface[0]?.blur ?? 0))
    ).toBeLessThan(4);
  });

  it("slightly increases depth for higher z-index values", () => {
    expect(
      getCardShadowStyle({
        surface: "canvas-filter",
        role: "silhouette",
        zIndex: 1,
        maxZIndex: 10,
      }).filter
    ).not.toBe(
      getCardShadowStyle({
        surface: "canvas-filter",
        role: "silhouette",
        zIndex: 10,
        maxZIndex: 10,
      }).filter
    );
  });

  it("changes shadow direction and strength when lighting is provided", () => {
    expect(
      getCardShadowStyle({
        surface: "canvas-filter",
        role: "silhouette",
        lighting: getShadowLighting(8, "live"),
      }).filter
    ).not.toBe(
      getCardShadowStyle({
        surface: "canvas-filter",
        role: "silhouette",
        lighting: getShadowLighting(16, "live"),
      }).filter
    );
  });

  it("combines lighting with z-index depth bias", () => {
    expect(
      getCardShadowStyle({
        surface: "canvas-filter",
        role: "silhouette",
        zIndex: 1,
        maxZIndex: 10,
        lighting: getShadowLighting(12, "live"),
      }).filter
    ).not.toBe(
      getCardShadowStyle({
        surface: "canvas-filter",
        role: "silhouette",
        zIndex: 10,
        maxZIndex: 10,
        lighting: getShadowLighting(12, "live"),
      }).filter
    );
  });

  it("produces visibly different default canvas shadows across a day sweep", () => {
    const midnightShadow = parseDropShadow(
      getCardShadowStyle({
        surface: "canvas-filter",
        role: "silhouette",
        zIndex: 5,
        maxZIndex: 10,
        lighting: getShadowLighting(0, "debug"),
      }).filter ?? ""
    );

    const noonShadow = parseDropShadow(
      getCardShadowStyle({
        surface: "canvas-filter",
        role: "silhouette",
        zIndex: 5,
        maxZIndex: 10,
        lighting: getShadowLighting(12, "debug"),
      }).filter ?? ""
    );

    expect(Math.abs(midnightShadow.blur - noonShadow.blur)).toBeGreaterThan(4);
    expect(
      Math.abs(midnightShadow.opacity - noonShadow.opacity)
    ).toBeGreaterThan(0.08);
  });

  it("keeps hover and focused deltas modest across roles", () => {
    const restSilhouetteOpacity = getShadowOpacity(
      getCardShadowStyle({
        surface: "canvas-filter",
        role: "silhouette",
        state: "rest",
      }).filter ?? ""
    );
    const hoverSilhouetteOpacity = getShadowOpacity(
      getCardShadowStyle({
        surface: "canvas-filter",
        role: "silhouette",
        state: "hover",
      }).filter ?? ""
    );
    const focusedSurface = getShadowRecipe({
      role: "surface",
      state: "focused",
    });
    const restSurface = getShadowRecipe({
      role: "surface",
      state: "rest",
    });

    expect(hoverSilhouetteOpacity - restSilhouetteOpacity).toBeLessThan(0.05);
    expect((focusedSurface[0]?.opacity ?? 0) - (restSurface[0]?.opacity ?? 0)).toBeLessThan(
      0.07
    );
  });
});
