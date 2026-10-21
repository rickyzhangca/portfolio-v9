import { describe, expect, it } from "vitest";
import {
  claimLampShadow,
  getClaimedLampShadow,
  getLampShadowClaim,
  isLampShadowClaimed,
  markLampShadowReady,
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

  it("keeps the filter until a canvas inside the caster is ready", () => {
    const caster = document.createElement("div");
    const release = claimLampShadow(caster, { inside: true, ready: false });

    expect(getLampShadowClaim(caster)).toMatchObject({
      inside: true,
      ready: false,
    });
    markLampShadowReady(caster);
    expect(getLampShadowClaim(caster)?.ready).toBe(true);
    release();
  });

  it("leaves a newer claim in place when an older one is released", () => {
    const caster = document.createElement("div");
    const releaseOld = claimLampShadow(caster);
    const releaseNew = claimLampShadow(caster, { inside: true });

    releaseOld();
    expect(getLampShadowClaim(caster)?.inside).toBe(true);
    releaseNew();
    expect(isLampShadowClaimed(caster)).toBe(false);
  });
});
