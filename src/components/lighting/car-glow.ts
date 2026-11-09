/**
 * A light of the car's own, beside the lamp: its charge's bolts, the flash
 * it lands in, the fire it drove through. In the car's local px (z above
 * the desk), with a linear rgb colour and an intensity, 0 for none.
 */
export interface CarGlowLight {
  color: readonly [number, number, number];
  intensity: number;
  x: number;
  y: number;
  z: number;
}

/** The car's own lights, written by its effect and read on each draw. */
export interface CarGlow {
  lights: [CarGlowLight, CarGlowLight];
}

/** A glow with both lights off. */
export const createCarGlow = (): CarGlow => ({
  lights: [
    { color: [0, 0, 0], intensity: 0, x: 0, y: 0, z: 0 },
    { color: [0, 0, 0], intensity: 0, x: 0, y: 0, z: 0 },
  ],
});
