import { describe, expect, it } from "vitest";
import { getBoardGlowGradients } from "./cover-layout";

describe("getBoardGlowGradients", () => {
  it("draws each glow as an elliptical radial gradient, topmost first", () => {
    expect(
      getBoardGlowGradients([
        { at: { x: 0.5, y: 0 }, color: "#016642", size: { x: 1.3, y: 0.22 } },
        { at: { x: 0.5, y: 1 }, color: "#047343", size: { x: 1.4, y: 0.26 } },
      ])
    ).toBe(
      "radial-gradient(130% 22% at 50% 0%, #016642 0%, transparent 100%), radial-gradient(140% 26% at 50% 100%, #047343 0%, transparent 100%)"
    );
  });
});
