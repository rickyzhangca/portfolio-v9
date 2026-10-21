import { describe, expect, it } from "vitest";
import {
  claimLampShadow,
  getClaimedLampShadow,
  isLampShadowClaimed,
  setClaimedLampShadow,
} from "./lit-shadow";

const SHADOW = {
  blur: 6,
  contact: { blur: 3, opacity: 0.2 },
  opacity: 0.2,
  x: 4,
  y: 5,
};

describe("claimed lamp shadows", () => {
  it("hands the lamp's shadow to the canvas that claimed the caster", () => {
    const caster = document.createElement("div");
    const release = claimLampShadow(caster);

    expect(isLampShadowClaimed(caster)).toBe(true);
    expect(getClaimedLampShadow(caster)).toBeNull();
    setClaimedLampShadow(caster, SHADOW);
    expect(getClaimedLampShadow(caster)).toBe(SHADOW);

    release();
    expect(isLampShadowClaimed(caster)).toBe(false);
    expect(getClaimedLampShadow(caster)).toBeNull();
  });

  it("keeps no shadow for a caster nobody claimed", () => {
    const caster = document.createElement("div");
    setClaimedLampShadow(caster, SHADOW);

    expect(isLampShadowClaimed(caster)).toBe(false);
    expect(getClaimedLampShadow(caster)).toBeNull();
  });
});
