import {
  areLampShadowsHeld,
  getFrameTransformCache,
  getLampConfig,
  subscribeLamp,
} from "./desk-lamp";
import { screenLinear } from "./lamp-shadows";

/**
 * Marks a glossy layer that catches the desk lamp's glint. Each frame it gets
 * `--sheen-x` and `--sheen-y`, the lamp over its own untransformed box in
 * local px, and `--sheen`, the glint's strength from 0 to 1.
 */
export const LAMP_SHEEN_ATTRIBUTE = "data-lamp-sheen";

/**
 * A soft white glint centered under the lamp, for a layer that screens it
 * over the surface below.
 */
export const LAMP_SHEEN_GRADIENT =
  "radial-gradient(circle 72px at var(--sheen-x, -100px) var(--sheen-y, -100px), rgb(255 255 255 / calc(var(--sheen, 0) * 0.5)), rgb(255 255 255 / 0))";

const FADE_IN_MS = 700;
/** Distance from the lamp, as a share of its height, where the glint halves. */
const SHEEN_REACH = 0.8;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Moves the glint of every sheen layer inside `root` with the lamp. While
 * the canvas's entrance holds the lamp's shadows, glints hold too, so the
 * rising cards are not repainted each frame. Returns the unsubscribe.
 */
export const startLampSheen = (root: HTMLElement) => {
  const fadeStart = performance.now();
  const applied = new WeakMap<HTMLElement, string>();

  return subscribeLamp((lamp) => {
    if (areLampShadowsHeld()) {
      return;
    }
    const bounds = root.getBoundingClientRect();
    if (
      bounds.right < 0 ||
      bounds.bottom < 0 ||
      bounds.left > window.innerWidth ||
      bounds.top > window.innerHeight
    ) {
      return;
    }
    const { heightPx } = getLampConfig();
    const fade = easeOutCubic(
      Math.min(1, (performance.now() - fadeStart) / FADE_IN_MS)
    );
    const cache = getFrameTransformCache();

    // Reads; the glints are written once every lamp listener has read.
    const glints: [HTMLElement, number, number, number][] = [];
    for (const element of root.querySelectorAll<HTMLElement>(
      `[${LAMP_SHEEN_ATTRIBUTE}]`
    )) {
      const linear = screenLinear(element, cache);
      const det = linear.a * linear.d - linear.b * linear.c;
      if (Math.abs(det) < 1e-4) {
        continue;
      }
      const rect = element.getBoundingClientRect();
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      // The bounding box's center is the element's center under any affine
      // transform, so the lamp maps into the element's own space.
      const awayX = lamp.x - (rect.left + rect.width / 2);
      const awayY = lamp.y - (rect.top + rect.height / 2);
      const x = width / 2 + (linear.d * awayX - linear.c * awayY) / det;
      const y = height / 2 + (-linear.b * awayX + linear.a * awayY) / det;
      const reach = Math.hypot(awayX, awayY) / (heightPx * SHEEN_REACH);
      const strength = fade / (1 + reach ** 2);
      const value = `${x.toFixed(1)} ${y.toFixed(1)} ${strength.toFixed(2)}`;
      // A resting lamp stops touching the DOM.
      if (applied.get(element) === value) {
        continue;
      }
      applied.set(element, value);
      glints.push([element, x, y, strength]);
    }

    return () => {
      for (const [element, x, y, strength] of glints) {
        element.style.setProperty("--sheen-x", `${x.toFixed(1)}px`);
        element.style.setProperty("--sheen-y", `${y.toFixed(1)}px`);
        element.style.setProperty("--sheen", strength.toFixed(2));
      }
    };
  });
};
