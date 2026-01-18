import { describe, expect, it } from "vitest";
import { DEFAULT_FAN_CONFIG } from "./fan";

describe("DEFAULT_FAN_CONFIG", () => {
  it("has correct rotate step", () => {
    expect(DEFAULT_FAN_CONFIG.rotateStepDeg).toBe(0.5);
  });

  it("has correct arc step", () => {
    expect(DEFAULT_FAN_CONFIG.arcStepPx).toBe(3);
  });

  it("has correct expand gap", () => {
    expect(DEFAULT_FAN_CONFIG.expandGapPx).toBe(18);
  });

  it("has correct expand row gap", () => {
    expect(DEFAULT_FAN_CONFIG.expandRowGapPx).toBe(10);
  });

  it("has all required properties", () => {
    expect(DEFAULT_FAN_CONFIG).toHaveProperty("rotateStepDeg");
    expect(DEFAULT_FAN_CONFIG).toHaveProperty("arcStepPx");
    expect(DEFAULT_FAN_CONFIG).toHaveProperty("expandGapPx");
    expect(DEFAULT_FAN_CONFIG).toHaveProperty("expandRowGapPx");
  });

  it("has positive values", () => {
    expect(DEFAULT_FAN_CONFIG.rotateStepDeg).toBeGreaterThan(0);
    expect(DEFAULT_FAN_CONFIG.arcStepPx).toBeGreaterThan(0);
    expect(DEFAULT_FAN_CONFIG.expandGapPx).toBeGreaterThan(0);
    expect(DEFAULT_FAN_CONFIG.expandRowGapPx).toBeGreaterThan(0);
  });
});
