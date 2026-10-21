import { describe, expect, it } from "vitest";
import { DEFAULT_LAMP_CONFIG } from "./lamp-config";
import { getRoomGradient } from "./room-gradient";

describe("getRoomGradient", () => {
  it("keeps the designed room at the default settings", () => {
    expect(getRoomGradient(DEFAULT_LAMP_CONFIG, "10px 20px")).toBe(
      "radial-gradient(circle 900px at 10px 20px, rgba(128, 128, 0, 0.008) 0%, rgba(67, 47, 0, 0.025) 35%, rgba(15, 11, 0, 0.111) 75%, rgba(10, 7, 0, 0.170) 100%)"
    );
  });

  it("scales the dimming from white and clamps it at black", () => {
    expect(
      getRoomGradient({ poolRadiusPx: 400, roomDim: 0 }, "center")
    ).toContain("rgba(0, 0, 0, 0) 100%");
    // Tone 175 173 165: darkened to 168.3, warmth added back.
    expect(
      getRoomGradient({ poolRadiusPx: 400, roomDim: 2 }, "center")
    ).toContain("rgba(10, 7, 0, 0.340) 100%");
    expect(
      getRoomGradient({ poolRadiusPx: 400, roomDim: 10 }, "center")
    ).toContain("rgba(0, 0, 0, 1.000) 100%");
  });

  it("lays the tone over the desk within two levels of multiplying it", () => {
    const gradient = getRoomGradient({ poolRadiusPx: 900, roomDim: 1 }, "0 0");
    const overlays = [
      ...gradient.matchAll(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/g),
    ].map((match) => match.slice(1).map(Number));
    const tones = [
      [255, 255, 252],
      [252, 251, 247],
      [230, 229, 225],
      [215, 214, 210],
    ];
    for (const [index, tone] of tones.entries()) {
      const [red = 0, green = 0, blue = 0, alpha = 0] = overlays[index] ?? [];
      for (const desk of [0, 0.25, 0.5, 0.75, 1]) {
        for (const [channel, color] of [red, green, blue].entries()) {
          const multiplied = (tone[channel] ?? 0) * desk;
          const laid = desk * 255 * (1 - alpha) + color * alpha;
          expect(Math.abs(laid - multiplied)).toBeLessThan(2);
        }
      }
    }
  });
});
