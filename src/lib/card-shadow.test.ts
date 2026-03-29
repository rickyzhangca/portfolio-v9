import { describe, expect, it } from "vitest";
import { getCardShadowStyle } from "./card-shadow";
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
        preset: "default",
      })
    ).toEqual({
      filter: expect.stringContaining("drop-shadow("),
    });
  });

  it("returns a box shadow style for card surfaces", () => {
    expect(
      getCardShadowStyle({
        surface: "card-box-shadow",
        preset: "paper",
      })
    ).toEqual({
      boxShadow: expect.any(String),
    });
  });

  it("uses stable fallback depth when z-index context is omitted", () => {
    expect(
      getCardShadowStyle({
        surface: "card-box-shadow",
        preset: "media",
      })
    ).toEqual(
      getCardShadowStyle({
        surface: "card-box-shadow",
        preset: "media",
        zIndex: undefined,
        maxZIndex: undefined,
      })
    );
  });

  it("changes shadow output between rest and hover states", () => {
    expect(
      getCardShadowStyle({
        surface: "canvas-filter",
        preset: "cover",
        state: "rest",
      }).filter
    ).not.toBe(
      getCardShadowStyle({
        surface: "canvas-filter",
        preset: "cover",
        state: "hover",
      }).filter
    );
  });

  it("keeps stack cover shadows visibly stronger at rest", () => {
    const filter = getCardShadowStyle({
      surface: "canvas-filter",
      preset: "cover",
      state: "rest",
    }).filter;

    expect(getShadowOpacity(filter ?? "")).toBeGreaterThan(0.2);
  });

  it("slightly increases depth for higher z-index values", () => {
    expect(
      getCardShadowStyle({
        surface: "canvas-filter",
        preset: "default",
        zIndex: 1,
        maxZIndex: 10,
      }).filter
    ).not.toBe(
      getCardShadowStyle({
        surface: "canvas-filter",
        preset: "default",
        zIndex: 10,
        maxZIndex: 10,
      }).filter
    );
  });

  it("changes shadow direction and strength when lighting is provided", () => {
    expect(
      getCardShadowStyle({
        surface: "canvas-filter",
        preset: "default",
        lighting: getShadowLighting(8, "live"),
      }).filter
    ).not.toBe(
      getCardShadowStyle({
        surface: "canvas-filter",
        preset: "default",
        lighting: getShadowLighting(16, "live"),
      }).filter
    );
  });

  it("combines lighting with z-index depth bias", () => {
    expect(
      getCardShadowStyle({
        surface: "canvas-filter",
        preset: "default",
        zIndex: 1,
        maxZIndex: 10,
        lighting: getShadowLighting(12, "live"),
      }).filter
    ).not.toBe(
      getCardShadowStyle({
        surface: "canvas-filter",
        preset: "default",
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
        preset: "default",
        zIndex: 5,
        maxZIndex: 10,
        lighting: getShadowLighting(0, "debug"),
      }).filter ?? ""
    );

    const noonShadow = parseDropShadow(
      getCardShadowStyle({
        surface: "canvas-filter",
        preset: "default",
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
});
