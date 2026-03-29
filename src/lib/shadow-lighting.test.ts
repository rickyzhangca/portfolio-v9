import { describe, expect, it } from "vitest";
import {
  formatShadowHour,
  getLocalDecimalHour,
  getShadowLighting,
} from "./shadow-lighting";

describe("shadow lighting", () => {
  it("returns the highest intensity at noon", () => {
    expect(getShadowLighting(12, "live").intensity).toBeGreaterThan(
      getShadowLighting(0, "live").intensity
    );
  });

  it("returns the lowest intensity at midnight", () => {
    expect(getShadowLighting(0, "live").intensity).toBeLessThan(
      getShadowLighting(6, "live").intensity
    );
    expect(getShadowLighting(0, "live").intensity).toBeLessThan(
      getShadowLighting(18, "live").intensity
    );
  });

  it("pushes morning and evening shadows in opposite horizontal directions", () => {
    expect(getShadowLighting(8, "live").angleDeg).toBeGreaterThan(90);
    expect(getShadowLighting(16, "live").angleDeg).toBeLessThan(90);
  });

  it("formats decimal hours in stable local clock text", () => {
    expect(formatShadowHour(14.25)).toBe("2:15 PM");
  });

  it("derives decimal hour from a Date instance", () => {
    expect(
      getLocalDecimalHour(new Date("2026-03-29T09:30:00.000-04:00"))
    ).toBe(9.5);
  });
});
