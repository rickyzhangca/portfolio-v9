/** The linear part (rotation, scale, skew) of a 2D CSS transform. */
export interface Linear2D {
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface LampShadowInput {
  /** Caster center on screen, in px. */
  center: { x: number; y: number };
  lamp: { x: number; y: number };
  /** Lamp height above the desk, in screen px. */
  lampHeight: number;
  /** Caster height above the desk, in screen px. */
  lift: number;
  /** Maps the caster's own CSS px to screen px. */
  linear: Linear2D;
  /**
   * The caster's height while it lies still, in screen px; lifting it above
   * that (hovered, carried) loosens its contact shadow. Defaults to `lift`.
   */
  rest?: number;
}

/** A drop shadow in the caster's own CSS px, ready for `drop-shadow()`. */
export interface LampShadow {
  blur: number;
  /**
   * The soft dark right under the caster, where it hides the desk from the
   * room's light: tight and dark while it rests, fading and spreading as it
   * is lifted, as under the lit keycaps (keycaps-shader.wgsl).
   */
  contact: { blur: number; opacity: number };
  opacity: number;
  x: number;
  y: number;
}

/**
 * Shadows lean cool: where the warm lamp is blocked, only the room's light
 * is left. A tint darkens less than black, so its opacity is raised to keep
 * shadows as deep. The shaders use the same (`SHADOW_TINT`, `SHADOW_DEPTH`).
 */
const SHADOW_RGB = "28 36 59";
const SHADOW_DEPTH = 1.16;

const shadowColor = (opacity: number) =>
  `rgb(${SHADOW_RGB} / ${Math.min(opacity * SHADOW_DEPTH, 1).toFixed(3)})`;

/**
 * The contact shadow at rest: its darkness and blur (screen px), then how
 * fast it fades and spreads per screen px the caster is lifted.
 */
const CONTACT_OPACITY = 0.2;
const CONTACT_BLUR = 3;
const CONTACT_FADE = 0.15;
const CONTACT_SPREAD = 0.6;

/**
 * Projects a caster's shadow away from a point lamp, matching the lit
 * MacBook's shader: higher casters and casters further from the lamp throw
 * longer, softer shadows, capped at 1.6x their height. The result is in the
 * caster's own space, because drop-shadow offsets rotate and scale with the
 * element. Returns null when the caster is collapsed to nothing.
 */
export const projectLampShadow = ({
  center,
  lamp,
  lampHeight,
  lift,
  linear,
  rest = lift,
}: LampShadowInput): LampShadow | null => {
  const det = linear.a * linear.d - linear.b * linear.c;
  if (Math.abs(det) < 1e-4) {
    return null;
  }

  const awayX = center.x - lamp.x;
  const awayY = center.y - lamp.y;
  const distance = Math.hypot(awayX, awayY);
  const reach = lift / Math.max(lampHeight - lift, 1);
  const length = Math.min(distance * reach, lift * 1.6);
  const unit = distance > 0 ? length / distance : 0;
  const screenX = awayX * unit;
  const screenY = awayY * unit;
  const blur = 1.5 + lift * 0.45 + length * 0.15;
  // Further from the lamp, less direct light: a fainter shadow.
  const falloff = 1 / (1 + (distance / (lampHeight * 1.9)) ** 2);
  const scale = Math.sqrt(Math.abs(det));
  const raised = Math.max(lift - rest, 0);

  return {
    blur: blur / scale,
    contact: {
      blur: (CONTACT_BLUR + raised * CONTACT_SPREAD) / scale,
      opacity: CONTACT_OPACITY / (1 + raised * CONTACT_FADE),
    },
    opacity: 0.08 + 0.16 * falloff,
    x: (linear.d * screenX - linear.c * screenY) / det,
    y: (-linear.b * screenX + linear.a * screenY) / det,
  };
};

/** The CSS filter for a lamp shadow. */
export const lampShadowFilter = ({ blur, opacity, x, y }: LampShadow) =>
  `drop-shadow(${x.toFixed(1)}px ${y.toFixed(1)}px ${blur.toFixed(1)}px ${shadowColor(opacity)})`;

/**
 * The same lamp shadow as a box-shadow, for casters whose outline is their
 * rounded border box. Chrome and Safari read drop-shadow's blur as the
 * Gaussian's standard deviation and box-shadow's as twice that, so the blur
 * doubles; on an opaque box the two then draw alike.
 */
export const lampBoxShadow = ({ blur, opacity, x, y }: LampShadow) =>
  `${x.toFixed(1)}px ${y.toFixed(1)}px ${(blur * 2).toFixed(1)}px ${shadowColor(opacity)}`;

/**
 * The CSS box-shadow for a contact shadow, for casters whose outline is
 * their rounded border box. The lamp's filter then takes in its faint halo,
 * as it would cast the paper's own edge.
 */
export const contactBoxShadow = ({ contact }: LampShadow) =>
  `0 0 ${contact.blur.toFixed(1)}px ${shadowColor(contact.opacity)}`;
