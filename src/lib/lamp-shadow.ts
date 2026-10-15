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
}

/** A drop shadow in the caster's own CSS px, ready for `drop-shadow()`. */
export interface LampShadow {
  blur: number;
  opacity: number;
  x: number;
  y: number;
}

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

  return {
    blur: blur / Math.sqrt(Math.abs(det)),
    opacity: 0.08 + 0.16 * falloff,
    x: (linear.d * screenX - linear.c * screenY) / det,
    y: (-linear.b * screenX + linear.a * screenY) / det,
  };
};
