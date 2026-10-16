import {
  getFrameTransformCache,
  LAMP_HEIGHT,
  type LampPosition,
  subscribeLamp,
} from "./desk-lamp";
import { screenLinear } from "./lamp-shadows";

/** What a lit surface needs each frame, in its own untransformed CSS px. */
export interface SurfaceView {
  height: number;
  /** 0 to 1 as the lamp warms up after the surface mounts. */
  intensity: number;
  /** Lamp position; z is its height above the surface. */
  light: { x: number; y: number; z: number };
  /** Device pixels per local px for the canvas backing store. */
  pixelScale: number;
  width: number;
}

interface LitSurfaceOptions<Surface extends { destroy: () => void }> {
  attach: (signal: AbortSignal) => Promise<Surface>;
  draw: (surface: Surface, view: SurfaceView) => void;
  /** The element the surface covers; its box and transforms are measured. */
  element: HTMLElement;
  /** Names the surface in the console when WebGPU fails. */
  label: string;
  onReady: () => void;
  /** How far the canvas overhangs the element on each side, in local px. */
  overhang?: number;
  /**
   * Advances the surface's own animated values once per frame (seconds since
   * the last frame); a change in them redraws like a lamp move does.
   */
  step?: (elapsed: number) => readonly number[];
}

const FADE_IN_MS = 700;
const MAX_CANVAS_PIXELS = 2048;
/** Backing-store scale steps, so zooming does not reallocate every frame. */
const PIXEL_SCALE_STEP = 0.25;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * WebGPU surfaces redrawn per frame, at most. Opening a folder of 14 prints
 * moves every one of them against the lamp at once; redrawing all of them
 * each frame stalled the GPU process on canvas presents and dropped half the
 * frames. Over budget, surfaces wait their turn, the longest-waiting first,
 * so lighting trails motion by a few frames and catches up once it settles.
 * Surfaces animating their own parts (a key going down, a keycap lifting)
 * go first: the pointer that drives them also moves the lamp, which queues
 * every other surface on screen, and a part that skips frames stutters
 * where relighting a few frames late does not show.
 */
const DRAWS_PER_FRAME = 4;

interface PendingDraw {
  draw: () => void;
  since: number;
}

const pending = new Map<object, PendingDraw>();
let flushQueued = false;

// Runs after every lamp listener of this frame has queued its redraw.
const flushDraws = () => {
  flushQueued = false;
  const queue = [...pending.entries()].sort((a, b) => a[1].since - b[1].since);
  for (const [owner, entry] of queue.slice(0, DRAWS_PER_FRAME)) {
    pending.delete(owner);
    entry.draw();
  }
};

const requestDraw = (owner: object, draw: () => void, animating: boolean) => {
  pending.set(owner, {
    draw,
    // Animating surfaces queue as if they had waited longest, and keep
    // their place while waiting.
    since: animating ? 0 : (pending.get(owner)?.since ?? performance.now()),
  });
  if (!flushQueued) {
    flushQueued = true;
    queueMicrotask(flushDraws);
  }
};

const measure = (
  element: HTMLElement,
  lamp: LampPosition,
  fadeStart: number,
  overhang: number
): SurfaceView | null => {
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  const rect = element.getBoundingClientRect();
  // Surfaces off screen keep their last frame.
  if (
    !(width && height) ||
    rect.right < 0 ||
    rect.bottom < 0 ||
    rect.left > window.innerWidth ||
    rect.top > window.innerHeight
  ) {
    return null;
  }
  const linear = screenLinear(element, getFrameTransformCache());
  const det = linear.a * linear.d - linear.b * linear.c;
  if (Math.abs(det) < 1e-4) {
    return null;
  }
  const screenScale = Math.sqrt(Math.abs(det));

  // The bounding box's center is the element's center under any affine
  // transform, so the lamp maps into the element's own (rotated) space.
  const awayX = lamp.x - (rect.left + rect.width / 2);
  const awayY = lamp.y - (rect.top + rect.height / 2);
  return {
    height,
    intensity: easeOutCubic(
      Math.min(1, (performance.now() - fadeStart) / FADE_IN_MS)
    ),
    light: {
      x: width / 2 + (linear.d * awayX - linear.c * awayY) / det,
      y: height / 2 + (-linear.b * awayX + linear.a * awayY) / det,
      z: LAMP_HEIGHT / screenScale,
    },
    pixelScale: Math.min(
      Math.ceil((screenScale * window.devicePixelRatio) / PIXEL_SCALE_STEP) *
        PIXEL_SCALE_STEP,
      MAX_CANVAS_PIXELS / (Math.max(width, height) + overhang * 2)
    ),
    width,
  };
};

/**
 * Attaches a WebGPU surface and redraws it whenever the lamp, the element's
 * size or its zoom changes. Returns the cleanup for an effect.
 */
export const runLitSurface = <Surface extends { destroy: () => void }>({
  attach,
  draw,
  element,
  label,
  onReady,
  overhang = 0,
  step,
}: LitSurfaceOptions<Surface>) => {
  const abort = new AbortController();
  let surface: Surface | null = null;
  let unsubscribe: (() => void) | null = null;
  const owner = {};

  const fail = (error: unknown) => {
    if (!abort.signal.aborted) {
      console.warn(`${label} unavailable`, error);
    }
  };

  const start = async () => {
    const attached = await attach(abort.signal);
    if (abort.signal.aborted) {
      attached.destroy();
      return;
    }
    surface = attached;
    const fadeStart = performance.now();
    let drawnKey = "";
    let drawnOwn = "";
    let announced = false;
    let lastFrame = fadeStart;

    unsubscribe = subscribeLamp((lamp) => {
      const now = performance.now();
      const own = step?.(Math.min((now - lastFrame) / 1000, 0.1)) ?? [];
      lastFrame = now;
      const view = measure(element, lamp, fadeStart, overhang);
      if (!view) {
        return;
      }
      // Skip frames where nothing visible changed: a lamp step under a
      // pixel, or a fraction of a pixel of travel, does not show.
      const ownKey = own.map((value) => value.toFixed(2)).join();
      const key = [
        Math.round(view.light.x),
        Math.round(view.light.y),
        Math.round(view.light.z),
        view.intensity.toFixed(2),
        view.pixelScale,
        view.width,
        view.height,
        ownKey,
      ].join();
      if (key === drawnKey) {
        pending.delete(owner);
        return;
      }
      // Queued with this frame's view; a later frame replaces it.
      requestDraw(
        owner,
        () => {
          if (abort.signal.aborted) {
            return;
          }
          try {
            draw(attached, view);
          } catch (error) {
            unsubscribe?.();
            fail(error);
            return;
          }
          drawnKey = key;
          drawnOwn = ownKey;
          if (!announced) {
            announced = true;
            onReady();
          }
        },
        ownKey !== drawnOwn
      );
    });
  };

  start().catch(fail);

  return () => {
    abort.abort();
    pending.delete(owner);
    unsubscribe?.();
    surface?.destroy();
  };
};
