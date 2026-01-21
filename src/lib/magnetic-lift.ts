export interface MagneticLiftConfig {
  /** Influence radius in pixels (distance where lift effect reaches zero) */
  radiusPx: number;
  /** Maximum lift in pixels at pointer position */
  maxLiftPx: number;
  /** Shadow intensity at max lift (1.0 = full shadow) */
  shadowIntensity: number;
}

export const DEFAULT_MAGNETIC_LIFT_CONFIG: MagneticLiftConfig = {
  radiusPx: 200,
  maxLiftPx: 8,
  shadowIntensity: 1.0,
};

export interface IconLiftEffect {
  /** Vertical offset in pixels (negative = lift up) */
  y: number;
  /** Shadow intensity from 0 to 1 */
  shadowIntensity: number;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * Computes lift effects for each icon based on pointer position.
 *
 * @param pointerX - Pointer X coordinate relative to viewport
 * @param pointerY - Pointer Y coordinate relative to viewport
 * @param iconRects - Map of icon index to their bounding client rects
 * @param config - Optional configuration overrides
 * @returns Map of icon index to lift effect
 */
export const computeMagneticLift = (
  pointerX: number,
  pointerY: number,
  iconRects: Map<number, DOMRect>,
  config: Partial<MagneticLiftConfig> = {}
): Map<number, IconLiftEffect> => {
  const radiusPx = config.radiusPx ?? DEFAULT_MAGNETIC_LIFT_CONFIG.radiusPx;
  const maxLiftPx = config.maxLiftPx ?? DEFAULT_MAGNETIC_LIFT_CONFIG.maxLiftPx;
  const maxShadowIntensity =
    config.shadowIntensity ?? DEFAULT_MAGNETIC_LIFT_CONFIG.shadowIntensity;

  const effects = new Map<number, IconLiftEffect>();

  for (const [index, rect] of iconRects.entries()) {
    // Calculate center of the icon
    const iconCenterX = rect.left + rect.width / 2;
    const iconCenterY = rect.top + rect.height / 2;

    // Calculate distance from pointer to icon center
    const dx = pointerX - iconCenterX;
    const dy = pointerY - iconCenterY;
    const dist = Math.hypot(dx, dy);

    // Calculate falloff: t = 0 at pointer, t = 1 at radius edge
    const t = clamp01(dist / radiusPx);

    // Lift amount: max lift at pointer, zero at radius edge
    const liftAmount = maxLiftPx * (1 - t);

    // Shadow intensity: matches lift amount
    const shadowIntensity = maxShadowIntensity * (1 - t);

    effects.set(index, {
      y: -liftAmount, // Negative Y = lift up
      shadowIntensity,
    });
  }

  return effects;
};
