import { describe, expect, it } from "vitest";
import {
  ENTRANCE_DURATION_MS,
  ENTRANCE_RISE_MS,
  getEntranceDelays,
  getEntranceOrigin,
  MAX_ENTRANCE_STAGGER_MS,
} from "@/lib/canvas-entrance";
import { createMockSingle, createMockStack } from "@/test-utils/test-helpers";

describe("canvas entrance", () => {
  it("scales each item around its resting center", () => {
    expect(getEntranceOrigin(createMockStack("stack", 40, 60))).toEqual({
      x: 90,
      y: 110,
    });
    expect(getEntranceOrigin(createMockSingle("single", 0, 0))).toEqual({
      x: 50,
      y: 50,
    });
  });

  it("starts near the origin first and runs down the page", () => {
    const delays = getEntranceDelays([
      createMockSingle("origin", 0, 0),
      createMockSingle("right", 400, 0),
      createMockSingle("below", 0, 400),
    ]);
    const origin = delays.get("origin") ?? Number.NaN;
    const right = delays.get("right") ?? Number.NaN;
    const below = delays.get("below") ?? Number.NaN;
    expect(origin).toBeLessThan(right);
    // Rows weigh more than columns, the way a visitor reads the desk.
    expect(right).toBeLessThan(below);
  });

  it("caps the stagger however far the scene reaches", () => {
    const delays = getEntranceDelays([createMockSingle("far", 20_000, 20_000)]);
    expect(delays.get("far")).toBe(MAX_ENTRANCE_STAGGER_MS);
    expect(ENTRANCE_DURATION_MS).toBe(
      MAX_ENTRANCE_STAGGER_MS + ENTRANCE_RISE_MS
    );
  });
});
