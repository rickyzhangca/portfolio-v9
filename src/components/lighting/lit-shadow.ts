import type { LampShadow } from "@/lib/lamp-shadow";
import { getFrameTransformCache, subscribeLamp } from "./desk-lamp";
import { LAMP_SHADOW_MARGIN, screenLinear } from "./lamp-shadows";
import type { ShadowSurface } from "./shadow-renderer";

/**
 * Backing px per screen px. The shadow is a blur at least a few px wide, so
 * a coarse grid holds it, and the canvas costs a sixteenth of a print's on a
 * 2x screen: redrawing costs per pixel.
 */
const RESOLUTION = 0.5;
const MAX_CANVAS_PIXELS = 1024;
/** Backing-store scale steps, so zooming does not reallocate every frame. */
const PIXEL_SCALE_STEP = 0.125;
/** A shadow that moved less than this, in screen px, is not redrawn. */
const SHADOW_STEP = 0.25;
const OPACITY_STEP = 0.002;

/**
 * Casters whose lamp shadow a WebGPU canvas behind them draws, with the
 * shadow the lamp worked out for them this frame. The lamp leaves their
 * drop-shadow filter off and hands them the shadow instead: a filter that
 * changes re-blurs its caster on the GPU every frame, and a folder of prints
 * swept under the lamp spent half the frame's GPU time on those blurs. The
 * canvas draws the blur in closed form, at a fraction of the resolution.
 * The shadow is null while the caster moves under its own transform (a
 * layout animation), which the canvas behind it would not follow; the
 * filter then draws it.
 */
const drawnShadows = new Map<Element, LampShadow | null>();

/** Hands the caster's lamp shadow to a canvas. Returns the release. */
export const claimLampShadow = (caster: Element) => {
  drawnShadows.set(caster, null);
  return () => {
    drawnShadows.delete(caster);
  };
};

export const isLampShadowClaimed = (caster: Element) =>
  drawnShadows.has(caster);

/** Set by the lamp each frame for a claimed caster. */
export const setClaimedLampShadow = (
  caster: Element,
  shadow: LampShadow | null
) => {
  if (drawnShadows.has(caster)) {
    drawnShadows.set(caster, shadow);
  }
};

/** The shadow a claimed caster's canvas should draw, in its own px. */
export const getClaimedLampShadow = (caster: Element) =>
  drawnShadows.get(caster) ?? null;

const IDENTITY_MATRIX = "matrix(1, 0, 0, 1, 0, 0)";

/** Whether an element moves under transforms of its own, not its parent's. */
export const hasOwnTransform = (element: Element) => {
  const style = getComputedStyle(element);
  return (
    // Motion leaves an identity matrix behind after a layout animation.
    (style.transform !== "none" && style.transform !== IDENTITY_MATRIX) ||
    style.translate !== "none" ||
    style.rotate !== "none" ||
    style.scale !== "none"
  );
};

interface Drawn {
  height: number;
  pixelScale: number;
  shadow: LampShadow | null;
  width: number;
}

const isCurrent = (drawn: Drawn | null, next: Drawn, screenScale: number) => {
  if (
    !drawn ||
    drawn.width !== next.width ||
    drawn.height !== next.height ||
    drawn.pixelScale !== next.pixelScale
  ) {
    return false;
  }
  const { shadow } = next;
  if (!(shadow && drawn.shadow)) {
    return shadow === drawn.shadow;
  }
  return (
    Math.max(
      Math.abs(shadow.x - drawn.shadow.x),
      Math.abs(shadow.y - drawn.shadow.y),
      Math.abs(shadow.blur - drawn.shadow.blur)
    ) *
      screenScale <
      SHADOW_STEP &&
    Math.abs(shadow.opacity - drawn.shadow.opacity) < OPACITY_STEP
  );
};

interface LampShadowOptions {
  /** Covers the caster's box, overhanging it by `LAMP_SHADOW_MARGIN`. */
  canvas: HTMLCanvasElement;
  /** A rounded-box lamp shadow caster, the same size as the canvas's parent. */
  caster: HTMLElement;
  radius: number;
}

/**
 * Draws a caster's lamp shadow on a WebGPU canvas behind it in place of its
 * drop-shadow filter (see `claimLampShadow`). Each frame the lamp works out
 * the shadow while every listener reads; it is drawn once they have, and
 * only when it moved. Unlike lit surfaces it skips the redraw queue: its
 * filter is already off, so a shadow waiting its turn would trail the lamp,
 * and it costs a few thousand pixels. Returns the cleanup for an effect.
 */
export const runLampShadow = ({
  canvas,
  caster,
  radius,
}: LampShadowOptions) => {
  const abort = new AbortController();
  let surface: ShadowSurface | null = null;
  let release: (() => void) | null = null;
  let unsubscribe: (() => void) | null = null;

  const stop = (error?: unknown) => {
    release?.();
    release = null;
    unsubscribe?.();
    unsubscribe = null;
    if (error !== undefined && !abort.signal.aborted) {
      console.warn("Lamp shadow unavailable", error);
    }
  };

  const start = async () => {
    const { attachShadow } = await import("./shadow-renderer");
    const attached = await attachShadow(canvas, abort.signal);
    if (abort.signal.aborted) {
      attached.destroy();
      return;
    }
    surface = attached;
    release = claimLampShadow(caster);
    let drawn: Drawn | null = null;

    unsubscribe = subscribeLamp(() => {
      const width = caster.offsetWidth;
      const height = caster.offsetHeight;
      const rect = caster.getBoundingClientRect();
      if (
        !(width && height) ||
        rect.right < -LAMP_SHADOW_MARGIN ||
        rect.bottom < -LAMP_SHADOW_MARGIN ||
        rect.left > window.innerWidth + LAMP_SHADOW_MARGIN ||
        rect.top > window.innerHeight + LAMP_SHADOW_MARGIN
      ) {
        return;
      }
      const linear = screenLinear(caster, getFrameTransformCache());
      const screenScale = Math.sqrt(
        Math.abs(linear.a * linear.d - linear.b * linear.c)
      );
      const span = Math.max(width, height) + LAMP_SHADOW_MARGIN * 2;
      const pixelScale = Math.min(
        Math.max(Math.ceil((screenScale * RESOLUTION) / PIXEL_SCALE_STEP), 1) *
          PIXEL_SCALE_STEP,
        MAX_CANVAS_PIXELS / span
      );
      // The lamp hands out this frame's shadow while its listener reads,
      // which may come after this one.
      queueMicrotask(() => {
        if (abort.signal.aborted) {
          return;
        }
        const next = {
          height,
          pixelScale,
          shadow: getClaimedLampShadow(caster),
          width,
        };
        if (isCurrent(drawn, next, screenScale)) {
          return;
        }
        try {
          attached.render({
            height,
            margin: LAMP_SHADOW_MARGIN,
            pixelHeight: Math.round(
              (height + LAMP_SHADOW_MARGIN * 2) * pixelScale
            ),
            pixelWidth: Math.round(
              (width + LAMP_SHADOW_MARGIN * 2) * pixelScale
            ),
            radius,
            shadow: next.shadow,
            width,
          });
        } catch (error) {
          // The caster's filter takes its shadow back.
          stop(error);
          return;
        }
        drawn = next;
      });
    });
  };

  start().catch(stop);

  return () => {
    abort.abort();
    stop();
    const attached = surface;
    surface = null;
    // Kept for a frame, until the lamp has written the caster's filter back.
    requestAnimationFrame(() => attached?.destroy());
  };
};
