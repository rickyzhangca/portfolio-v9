/** Desk lamp settings the playground can tune. */
export interface LampConfig {
  /** Lamp height above the desk, in screen px. Shared by every shadow. */
  heightPx: number;
  /** Radius of the lamp's pool of light on the room, in screen px. */
  poolRadiusPx: number;
  /** How dark the room gets outside the pool; 1 is the designed dimming. */
  roomDim: number;
}

/** How quickly the lamp catches up with the pointer, per second. */
export const LAMP_FOLLOW_RATE = 16;

export const DEFAULT_LAMP_CONFIG: LampConfig = {
  heightPx: 240,
  poolRadiusPx: 900,
  roomDim: 1,
};
