import { describe, expect, it } from "vitest";
import {
  computeMagneticLift,
  DEFAULT_MAGNETIC_LIFT_CONFIG,
} from "./magnetic-lift";

const createMockRect = (
  left: number,
  top: number,
  width = 50,
  height = 50
): DOMRect =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

describe("computeMagneticLift", () => {
  it("returns empty map when iconRects is empty", () => {
    const result = computeMagneticLift(100, 100, new Map());
    expect(result.size).toBe(0);
  });

  it("computes max lift when pointer is at icon center", () => {
    const iconRects = new Map([[0, createMockRect(75, 75, 50, 50)]]);
    const result = computeMagneticLift(100, 100, iconRects);
    const effect = result.get(0);

    expect(effect).toBeDefined();
    expect(effect?.y).toBe(-DEFAULT_MAGNETIC_LIFT_CONFIG.maxLiftPx);
    expect(effect?.shadowIntensity).toBe(
      DEFAULT_MAGNETIC_LIFT_CONFIG.shadowIntensity
    );
  });

  it("computes zero lift when icon is at radius edge", () => {
    const radius = DEFAULT_MAGNETIC_LIFT_CONFIG.radiusPx;
    // Icon center is exactly radius away from pointer
    // Pointer at (100, 100), so icon center should be at (100 + radius, 100)
    // Icon with width 50 has center at left + 25, so left = 100 + radius - 25
    const iconRects = new Map([
      [0, createMockRect(100 + radius - 25, 75, 50, 50)],
    ]);
    const result = computeMagneticLift(100, 100, iconRects);
    const effect = result.get(0);

    expect(effect).toBeDefined();
    expect(effect?.y).toBeCloseTo(0, 5);
    expect(effect?.shadowIntensity).toBe(0);
  });

  it("computes zero lift when icon is beyond radius", () => {
    const radius = DEFAULT_MAGNETIC_LIFT_CONFIG.radiusPx;
    // Icon center is beyond radius
    const iconRects = new Map([
      [0, createMockRect(100 + radius + 100, 75, 50, 50)],
    ]);
    const result = computeMagneticLift(100, 100, iconRects);
    const effect = result.get(0);

    expect(effect).toBeDefined();
    expect(effect?.y).toBeCloseTo(0, 5);
    expect(effect?.shadowIntensity).toBe(0);
  });

  it("computes partial lift for icon at halfway point", () => {
    const radius = DEFAULT_MAGNETIC_LIFT_CONFIG.radiusPx;
    const maxLift = DEFAULT_MAGNETIC_LIFT_CONFIG.maxLiftPx;
    const maxShadow = DEFAULT_MAGNETIC_LIFT_CONFIG.shadowIntensity;

    // Icon center is at half radius distance
    const iconRects = new Map([
      [0, createMockRect(100 + radius / 2 - 25, 75, 50, 50)],
    ]);
    const result = computeMagneticLift(100, 100, iconRects);
    const effect = result.get(0);

    expect(effect).toBeDefined();
    expect(effect?.y).toBe(-maxLift / 2);
    expect(effect?.shadowIntensity).toBe(maxShadow / 2);
  });

  it("computes lift for multiple icons at different distances", () => {
    const radius = DEFAULT_MAGNETIC_LIFT_CONFIG.radiusPx;
    const maxLift = DEFAULT_MAGNETIC_LIFT_CONFIG.maxLiftPx;

    const iconRects = new Map([
      [0, createMockRect(75, 75, 50, 50)], // At pointer (max lift)
      [1, createMockRect(100 + radius / 2 - 25, 75, 50, 50)], // Halfway (half lift)
      [2, createMockRect(100 + radius + 100, 75, 50, 50)], // Beyond radius (no lift)
    ]);

    const result = computeMagneticLift(100, 100, iconRects);

    expect(result.get(0)?.y).toBe(-maxLift);
    expect(result.get(1)?.y).toBe(-maxLift / 2);
    expect(result.get(2)?.y).toBeCloseTo(0, 5);
  });

  it("uses custom radius from config", () => {
    const customRadius = 100;
    // Pointer at (100, 100), icon center at (200, 100) = exactly customRadius away
    // Icon left edge: 200 - 25 = 175
    const iconRects = new Map([[0, createMockRect(175, 75, 50, 50)]]);

    const result = computeMagneticLift(100, 100, iconRects, {
      radiusPx: customRadius,
    });

    // At exactly the custom radius, lift should be 0
    expect(result.get(0)?.y).toBeCloseTo(0, 5);
  });

  it("uses custom maxLift from config", () => {
    const customMaxLift = 50;
    const iconRects = new Map([[0, createMockRect(75, 75, 50, 50)]]);

    const result = computeMagneticLift(100, 100, iconRects, {
      maxLiftPx: customMaxLift,
    });

    expect(result.get(0)?.y).toBe(-customMaxLift);
  });

  it("uses custom shadowIntensity from config", () => {
    const customShadowIntensity = 2.0;
    const iconRects = new Map([[0, createMockRect(75, 75, 50, 50)]]);

    const result = computeMagneticLift(100, 100, iconRects, {
      shadowIntensity: customShadowIntensity,
    });

    expect(result.get(0)?.shadowIntensity).toBe(customShadowIntensity);
  });

  it("uses partial custom config with defaults for unspecified values", () => {
    const customMaxLift = 50;
    const iconRects = new Map([[0, createMockRect(75, 75, 50, 50)]]);

    const result = computeMagneticLift(100, 100, iconRects, {
      maxLiftPx: customMaxLift,
      // radiusPx and shadowIntensity should use defaults
    });

    const effect = result.get(0);
    expect(effect?.y).toBe(-customMaxLift);
    expect(effect?.shadowIntensity).toBe(
      DEFAULT_MAGNETIC_LIFT_CONFIG.shadowIntensity
    );
  });

  it("returns negative Y values (lift up)", () => {
    const iconRects = new Map([[0, createMockRect(75, 75, 50, 50)]]);
    const result = computeMagneticLift(100, 100, iconRects);

    const effect = result.get(0);
    expect(effect?.y).toBeLessThan(0);
  });

  it("handles icon with different sizes", () => {
    const iconRects = new Map([
      [0, createMockRect(50, 50, 100, 100)], // Center at (100, 100)
    ]);

    const result = computeMagneticLift(100, 100, iconRects);
    const effect = result.get(0);

    expect(effect?.y).toBe(-DEFAULT_MAGNETIC_LIFT_CONFIG.maxLiftPx);
  });

  it("computes diagonal distance correctly", () => {
    const radius = DEFAULT_MAGNETIC_LIFT_CONFIG.radiusPx;
    const maxLift = DEFAULT_MAGNETIC_LIFT_CONFIG.maxLiftPx;

    // Icon at 45 degrees, distance = radius / 2
    const distance = radius / 2;
    const offset = distance / Math.sqrt(2);

    const iconRects = new Map([
      [0, createMockRect(100 + offset - 25, 100 + offset - 25, 50, 50)],
    ]);

    const result = computeMagneticLift(100, 100, iconRects);
    const effect = result.get(0);

    // Should be at t=0.5, so half lift
    expect(effect?.y).toBeCloseTo(-maxLift / 2, 0);
  });

  it("preserves icon indices in result map", () => {
    const iconRects = new Map([
      [5, createMockRect(75, 75, 50, 50)],
      [10, createMockRect(200, 200, 50, 50)],
      [99, createMockRect(300, 300, 50, 50)],
    ]);

    const result = computeMagneticLift(100, 100, iconRects);

    expect(result.has(5)).toBe(true);
    expect(result.has(10)).toBe(true);
    expect(result.has(99)).toBe(true);
    expect(result.size).toBe(3);
  });
});

describe("DEFAULT_MAGNETIC_LIFT_CONFIG", () => {
  it("has expected default values", () => {
    expect(DEFAULT_MAGNETIC_LIFT_CONFIG.radiusPx).toBe(180);
    expect(DEFAULT_MAGNETIC_LIFT_CONFIG.maxLiftPx).toBe(32);
    expect(DEFAULT_MAGNETIC_LIFT_CONFIG.shadowIntensity).toBe(1.5);
  });
});
