import { describe, expect, it } from "vitest";
import { type Linear2D, projectLampShadow } from "./lamp-shadow";

const IDENTITY: Linear2D = { a: 1, b: 0, c: 0, d: 1 };
const LAMP_HEIGHT = 240;

describe("projectLampShadow", () => {
  it("throws the shadow away from the lamp", () => {
    const shadow = projectLampShadow({
      center: { x: 300, y: 200 },
      lamp: { x: 100, y: 100 },
      lampHeight: LAMP_HEIGHT,
      lift: 12,
      linear: IDENTITY,
    });

    expect(shadow?.x).toBeGreaterThan(0);
    expect(shadow?.y).toBeGreaterThan(0);
    // Along the lamp-to-caster direction (2:1).
    expect((shadow?.x ?? 0) / (shadow?.y ?? 1)).toBeCloseTo(2);
  });

  it("caps the shadow length at 1.6x the caster height", () => {
    const shadow = projectLampShadow({
      center: { x: 5000, y: 0 },
      lamp: { x: 0, y: 0 },
      lampHeight: LAMP_HEIGHT,
      lift: 10,
      linear: IDENTITY,
    });

    expect(shadow?.x).toBeCloseTo(16);
    expect(shadow?.y).toBeCloseTo(0);
  });

  it("casts straight down with no offset under the lamp", () => {
    const shadow = projectLampShadow({
      center: { x: 50, y: 50 },
      lamp: { x: 50, y: 50 },
      lampHeight: LAMP_HEIGHT,
      lift: 12,
      linear: IDENTITY,
    });

    expect(shadow?.x).toBe(0);
    expect(shadow?.y).toBe(0);
    expect(shadow?.opacity).toBeCloseTo(0.24);
  });

  it("converts the offset into a rotated, scaled caster's own space", () => {
    // Rotated 90deg clockwise and scaled 2x: local +y points to screen -x.
    const rotated: Linear2D = { a: 0, b: 2, c: -2, d: 0 };
    const input = {
      center: { x: 400, y: 100 },
      lamp: { x: 100, y: 100 },
      lampHeight: LAMP_HEIGHT,
      lift: 12,
    };
    const flat = projectLampShadow({ ...input, linear: IDENTITY });
    const shadow = projectLampShadow({ ...input, linear: rotated });

    // A screen offset to the right is local -y, at half the length.
    expect(shadow?.x).toBeCloseTo(0);
    expect(shadow?.y).toBeCloseTo(-(flat?.x ?? 0) / 2);
    expect(shadow?.blur).toBeCloseTo((flat?.blur ?? 0) / 2);
  });

  it("skips casters collapsed to nothing", () => {
    expect(
      projectLampShadow({
        center: { x: 0, y: 0 },
        lamp: { x: 10, y: 10 },
        lampHeight: LAMP_HEIGHT,
        lift: 12,
        linear: { a: 0, b: 0, c: 0, d: 0 },
      })
    ).toBeNull();
  });
});
