import { describe, expect, it } from "vitest";
import { getCardShadowStyle } from "./card-shadow";

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
});
