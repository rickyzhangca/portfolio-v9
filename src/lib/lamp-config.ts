/** Desk lamp settings the playground can tune. */
export interface LampConfig {
  /** Lamp height above the desk, in screen px. Shared by every shadow. */
  heightPx: number;
  /** Radius of the lamp's pool of light on the room, in screen px. */
  poolRadiusPx: number;
  /** How dark the room gets outside the pool; 1 is the designed dimming. */
  roomDim: number;
}

/**
 * How quickly the lamp catches up with the pointer, per second: a time
 * constant of 25ms. At 16 the light trailed a 900px/s sweep by 54ms (about
 * 48px) and took 200ms to cover 95% of a jump, which read as the lighting
 * not following the hand; at 40 it trails by 18ms, about a frame, with no
 * more late frames and the lit surfaces no staler. At 70 it trailed by 8ms
 * but the surfaces' lighting ran two frames older.
 */
export const LAMP_FOLLOW_RATE = 40;

export const DEFAULT_LAMP_CONFIG: LampConfig = {
  heightPx: 240,
  poolRadiusPx: 900,
  roomDim: 1,
};
