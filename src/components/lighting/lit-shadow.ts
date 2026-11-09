import type { LampShadow } from "@/lib/lamp-shadow";
import { wakeLamp } from "./desk-lamp";

interface LampShadowClaim {
  /** An inside sprite follows the caster's transforms, but only at rest. */
  inside: boolean;
  /** Until ready, the lamp works out the shadow but keeps the filter. */
  ready: boolean;
  shadow: LampShadow | null;
}

const claims = new Map<Element, LampShadowClaim>();

/** Hands the caster's shadow to a sprite. Returns the release. */
export const claimLampShadow = (
  caster: Element,
  { inside = false, ready = true }: { inside?: boolean; ready?: boolean } = {}
) => {
  const claim = { inside, ready, shadow: null };
  claims.set(caster, claim);
  wakeLamp();
  return () => {
    if (claims.get(caster) === claim) {
      claims.delete(caster);
      wakeLamp();
    }
  };
};

/** The bitmap is ready: the lamp leaves the caster's filter off next frame. */
export const markLampShadowReady = (caster: Element) => {
  const claim = claims.get(caster);
  if (claim && !claim.ready) {
    claim.ready = true;
    wakeLamp();
  }
};

export const getLampShadowClaim = (
  caster: Element
): Readonly<LampShadowClaim> | undefined => claims.get(caster);

export const isLampShadowClaimed = (caster: Element) => claims.has(caster);

/** Set by the lamp in the read phase, before any sprite writes. */
export const setClaimedLampShadow = (
  caster: Element,
  shadow: LampShadow | null
) => {
  const claim = claims.get(caster);
  if (claim) {
    claim.shadow = shadow;
  }
};

export const getClaimedLampShadow = (caster: Element) =>
  claims.get(caster)?.shadow ?? null;
