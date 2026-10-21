import {
  getFrameTransformCache,
  getLampConfig,
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
  /** Canvases each draw fills, overhang included; the budget counts them. */
  canvases?: number;
  draw: (surface: Surface, view: SurfaceView) => void;
  /** The element the surface covers; its box and transforms are measured. */
  element: HTMLElement;
  /** Names the surface in the console when WebGPU fails. */
  label: string;
  /** Called when the surface cannot attach or a draw throws. */
  onFail?: (error: unknown) => void;
  onReady: () => void;
  /**
   * Share of the full backing-store resolution to draw at while the lamp
   * moves fast; full resolution returns once it slows. For surfaces whose
   * detail is soft (paper grain, board relief), where fewer pixels let every
   * stale surface redraw each frame. Absent, the surface keeps full
   * resolution, as surfaces drawing sharp prints or text must.
   */
  motionScale?: number;
  /** How far the canvas overhangs the element on each side, in local px. */
  overhang?: number;
  /**
   * How much of the surface shows, from 0 to 1, read every frame. A mostly
   * covered surface waits for proportionally more lamp travel before it
   * redraws, leaving the turns to surfaces in plain view. At 0 it keeps its
   * last frame however the lamp moves, at full resolution, until it shows
   * again or its size or zoom changes.
   */
  prominence?: () => number;
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
 * Lamp speed, in screen px per second, above which `motionScale` surfaces
 * drop resolution, and how long it must stay slower before they restore it.
 * Redrawing costs per pixel, not per surface or shader step: on an Apple GPU
 * at 2x, about 4.5 million canvas pixels a frame. A fast sweep makes every
 * paper and folder stale at once, so at full resolution they took turns and
 * their shadows trailed the lamp in steps; at half they all keep up.
 */
const MOTION_SPEED = 240;
const MOTION_REST_MS = 150;

/**
 * WebGPU surfaces redrawn per frame. Opening a folder of 14 prints moves
 * every one of them against the lamp at once; on a slow or power-saving GPU,
 * redrawing all of them each frame stalled the GPU process on canvas
 * presents and dropped half the frames. A fixed budget of four made a fast
 * machine relight each folder only every fifth frame, so the budget follows
 * frame pacing instead: it creeps up while frames arrive on time and halves
 * after a late one. Creeping, rather than jumping, keeps a busy GPU from
 * being probed with a dropped frame every few frames. It grows only on
 * frames that spent all of it: a resting lamp used to let it climb to the
 * maximum, and the first fast sweep then redrew every surface in one frame,
 * stalled the GPU, and halved it down to the minimum for a third of a
 * second. Over budget, surfaces wait their turn, so lighting trails motion
 * by a few frames and catches up once it settles.
 *
 * The turn goes to the surface whose lighting is most out of date as seen:
 * a moving lamp changes the surfaces under it a lot and those across the
 * desk barely, so the ones under the pointer keep redrawing while the rest
 * wait. Raising a waiting surface's claim with every frame it waited gave
 * those across the desk regular turns, but took them from the ones under
 * the pointer, whose shadows then stepped as it circled them. Surfaces
 * animating their own parts (a key going down, a keycap lifting) go first:
 * the pointer that drives them also moves the lamp, and a part that skips
 * frames stutters where relighting a few frames late does not show.
 *
 * The budget counts backing pixels, not surfaces: redrawing costs per pixel,
 * and surfaces differ forty-fold, from a folder label to a folder cover's
 * two full-size canvases. Counted in surfaces, the 15 prints of a folder
 * that opened all fell stale at once and fitted the budget a sweep had left,
 * twice the pixels the GPU could draw in a frame: four frames in a row ran
 * late. Each late frame also records the budget it happened at; growth
 * slows close to that ceiling, so a saturated lamp probes past it every few
 * seconds rather than every third of a second.
 */
const INITIAL_PIXEL_BUDGET = 1_000_000;
const MIN_PIXEL_BUDGET = 250_000;
const MAX_PIXEL_BUDGET = 24_000_000;
/** Growth per frame that arrives on time, as a share of the budget. */
const BUDGET_GROWTH = 0.02;
/** Growth once within `NEAR_CEILING` of the budget a frame ran late at. */
const BUDGET_GROWTH_NEAR_CEILING = 0.0025;
const NEAR_CEILING = 0.85;
/**
 * A draw into a new or resized backing store costs this many times its
 * pixels: the texture is allocated as well as filled. A folder that opened
 * right after a sweep still ran two frames late at a budget it had been
 * drawing within, until its fresh canvases were counted double.
 */
export const ALLOCATION_COST = 2;
/** A frame this many display intervals after the last one came late. */
const LATE_FRAME = 1.5;
/** Longer gaps are pauses (a hidden tab, a restarted lamp), not frames. */
const MAX_FRAME_GAP_MS = 250;
/** How quickly the display interval estimate rises, per frame. */
const INTERVAL_RISE = 0.02;
/**
 * The lamp moves this far, in local px, before a surface right under it
 * redraws; surfaces further from it wait for proportionally more travel.
 */
const LIGHT_STEP = 1;
/** Staleness of a surface whose size, zoom or fade-in has changed. */
const RESHAPED = Number.MAX_VALUE;
/** Staleness of a surface animating its own parts: it always goes first. */
const ANIMATING = Number.POSITIVE_INFINITY;

interface PendingDraw {
  draw: () => void;
  /** Backing pixels the draw fills. */
  pixels: number;
  since: number;
  /** How far the drawn frame is from the current one; larger goes first. */
  staleness: number;
}

const pending = new Map<object, PendingDraw>();
let flushQueued = false;
let pixelBudget = INITIAL_PIXEL_BUDGET;
/** The budget the last late frame ran at. */
let ceiling = MAX_PIXEL_BUDGET;
/** Pixels drawn outside the queue since the last flush (`chargeLitPixels`). */
let charged = 0;
/** Whether the last frame left surfaces waiting for budget. */
let budgetSpent = false;
let frameTime = 0;
/** The display's frame interval: falls at once, rises slowly. */
let frameInterval = 0;
/** The lamp at the last frame, to measure its speed. */
let lastLamp: LampPosition | null = null;
/** Frame time until which the lamp counts as moving fast. */
let movingUntil = 0;

/**
 * Adjusts the draw budget and the lamp's motion once per frame, from the
 * lamp's frame timestamp and position.
 */
const paceFrame = (time: number, lamp: LampPosition) => {
  if (time === frameTime) {
    return;
  }
  const interval = time - frameTime;
  frameTime = time;
  const previous = lastLamp;
  lastLamp = { x: lamp.x, y: lamp.y };
  if (interval <= 0 || interval > MAX_FRAME_GAP_MS) {
    return;
  }
  if (
    previous &&
    (Math.hypot(lamp.x - previous.x, lamp.y - previous.y) / interval) * 1000 >
      MOTION_SPEED
  ) {
    movingUntil = time + MOTION_REST_MS;
  }
  frameInterval =
    frameInterval === 0 || interval < frameInterval
      ? interval
      : frameInterval + (interval - frameInterval) * INTERVAL_RISE;
  if (interval > frameInterval * LATE_FRAME) {
    ceiling = pixelBudget;
    pixelBudget = Math.max(MIN_PIXEL_BUDGET, pixelBudget / 2);
  } else if (budgetSpent) {
    const growth =
      pixelBudget < ceiling * NEAR_CEILING
        ? BUDGET_GROWTH
        : BUDGET_GROWTH_NEAR_CEILING;
    pixelBudget = Math.min(MAX_PIXEL_BUDGET, pixelBudget * (1 + growth));
    ceiling = Math.max(ceiling, pixelBudget);
  }
  budgetSpent = false;
};

/**
 * Counts pixels drawn outside the queue (lamp shadow canvases) against the
 * next flush's budget.
 */
export const chargeLitPixels = (pixels: number) => {
  charged += pixels;
};

// Runs after every lamp listener of this frame has queued its redraw. The
// first surface always draws, so one larger than the budget is not stuck.
const flushDraws = () => {
  flushQueued = false;
  const queue = [...pending.entries()].sort(
    (a, b) => b[1].staleness - a[1].staleness || a[1].since - b[1].since
  );
  let spent = charged;
  charged = 0;
  let drawn = 0;
  for (const [owner, entry] of queue) {
    if (drawn > 0 && spent + entry.pixels > pixelBudget) {
      budgetSpent = true;
      return;
    }
    pending.delete(owner);
    entry.draw();
    spent += entry.pixels;
    drawn += 1;
  }
};

const requestDraw = (
  owner: object,
  draw: () => void,
  staleness: number,
  pixels: number
) => {
  pending.set(owner, {
    draw,
    pixels,
    since: pending.get(owner)?.since ?? performance.now(),
    staleness,
  });
  if (!flushQueued) {
    flushQueued = true;
    queueMicrotask(flushDraws);
  }
};

/**
 * How far the lamp has moved since the drawn frame, in local px as seen from
 * right under it. Shading follows how steeply the light falls on the
 * surface, which a step of the lamp changes less the further away it hangs:
 * travel is scaled by the square of the lamp's height over its distance to
 * the nearest point of the surface.
 */
export const lightStaleness = (
  drawn: SurfaceView["light"],
  view: SurfaceView
) => {
  const { light, width, height } = view;
  const travel = Math.hypot(
    light.x - drawn.x,
    light.y - drawn.y,
    light.z - drawn.z
  );
  const outsideX = Math.max(0, -light.x, light.x - width);
  const outsideY = Math.max(0, -light.y, light.y - height);
  const reach = Math.hypot(outsideX, outsideY, light.z);
  return reach > 0 ? travel * (light.z / reach) ** 2 : travel;
};

const measure = (
  element: HTMLElement,
  lamp: LampPosition,
  fadeStart: number,
  overhang: number,
  motionScale: number
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
  const { heightPx } = getLampConfig();
  const fullScale =
    Math.ceil((screenScale * window.devicePixelRatio) / PIXEL_SCALE_STEP) *
    PIXEL_SCALE_STEP;
  // Never below one backing pixel per CSS pixel, so 1x screens lose nothing.
  const scale =
    frameTime < movingUntil
      ? Math.min(
          fullScale,
          Math.max(
            Math.ceil((fullScale * motionScale) / PIXEL_SCALE_STEP),
            Math.ceil(screenScale / PIXEL_SCALE_STEP)
          ) * PIXEL_SCALE_STEP
        )
      : fullScale;
  return {
    height,
    intensity: easeOutCubic(
      Math.min(1, (performance.now() - fadeStart) / FADE_IN_MS)
    ),
    light: {
      x: width / 2 + (linear.d * awayX - linear.c * awayY) / det,
      y: height / 2 + (-linear.b * awayX + linear.a * awayY) / det,
      z: heightPx / screenScale,
    },
    pixelScale: Math.min(
      scale,
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
  canvases = 1,
  draw,
  element,
  label,
  motionScale = 1,
  onFail,
  onReady,
  overhang = 0,
  prominence,
  step,
}: LitSurfaceOptions<Surface>) => {
  const abort = new AbortController();
  let surface: Surface | null = null;
  let unsubscribe: (() => void) | null = null;
  const owner = {};

  const fail = (error: unknown) => {
    if (!abort.signal.aborted) {
      console.warn(`${label} unavailable`, error);
      onFail?.(error);
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
    let drawn: SurfaceView | null = null;
    let drawnOwn = "";
    let announced = false;
    let lastFrame = fadeStart;

    unsubscribe = subscribeLamp((lamp, time) => {
      paceFrame(time, lamp);
      const now = performance.now();
      const own = step?.(Math.min((now - lastFrame) / 1000, 0.1)) ?? [];
      lastFrame = now;
      const shown = prominence?.() ?? 1;
      // A hidden surface would only redraw to change resolution and back.
      const view = measure(
        element,
        lamp,
        fadeStart,
        overhang,
        shown > 0 ? motionScale : 1
      );
      if (!view) {
        return;
      }
      const ownKey = own.map((value) => value.toFixed(2)).join();
      const animating = ownKey !== drawnOwn;
      let staleness = RESHAPED;
      if (
        drawn &&
        drawn.width === view.width &&
        drawn.height === view.height &&
        drawn.pixelScale === view.pixelScale &&
        drawn.intensity.toFixed(2) === view.intensity.toFixed(2)
      ) {
        staleness = lightStaleness(drawn.light, view) * shown;
      }
      // Skip frames where nothing visible changed: a lamp step under a
      // pixel, or a fraction of a pixel of travel, does not show.
      if (!animating && staleness < LIGHT_STEP) {
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
          drawn = view;
          drawnOwn = ownKey;
          if (!announced) {
            announced = true;
            onReady();
          }
        },
        animating ? ANIMATING : staleness,
        Math.round((view.width + overhang * 2) * view.pixelScale) *
          Math.round((view.height + overhang * 2) * view.pixelScale) *
          canvases *
          (staleness === RESHAPED &&
          (drawn?.width !== view.width ||
            drawn.height !== view.height ||
            drawn.pixelScale !== view.pixelScale)
            ? ALLOCATION_COST
            : 1)
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
