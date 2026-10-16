import { describe, expect, it } from "vitest";
import { DEFAULT_LAMP_CONFIG } from "./lamp-config";
import { getRoomGradient } from "./room-gradient";

describe("getRoomGradient", () => {
  it("keeps the designed room at the default settings", () => {
    expect(getRoomGradient(DEFAULT_LAMP_CONFIG, "10px 20px")).toBe(
      "radial-gradient(circle 900px at 10px 20px, rgb(255 255 252) 0%, rgb(252 251 247) 35%, rgb(230 229 225) 75%, rgb(215 214 210) 100%)"
    );
  });

  it("scales the dimming from white and clamps it at black", () => {
    expect(
      getRoomGradient({ poolRadiusPx: 400, roomDim: 0 }, "center")
    ).toContain("rgb(255 255 255) 100%");
    expect(
      getRoomGradient({ poolRadiusPx: 400, roomDim: 2 }, "center")
    ).toContain("rgb(175 173 165) 100%");
    expect(
      getRoomGradient({ poolRadiusPx: 400, roomDim: 10 }, "center")
    ).toContain("rgb(0 0 0) 100%");
  });
});
