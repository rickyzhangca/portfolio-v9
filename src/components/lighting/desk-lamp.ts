import type { Linear2D } from "@/lib/lamp-shadow";

/** Lamp position in client px. It trails the pointer like a hand-held lamp. */
export interface LampPosition {
  x: number;
  y: number;
}

type LampListener = (lamp: LampPosition) => void;

/** Lamp height above the desk, in screen px. Shared by every shadow. */
export const LAMP_HEIGHT = 240;
/** How quickly the lamp catches up with the pointer, per second. */
const FOLLOW_RATE = 10;

const listeners = new Set<LampListener>();
const lamp: LampPosition = { x: 0, y: 0 };
let target: LampPosition | null = null;
let frame = 0;
let lastTime = 0;
// Element transforms measured this frame, shared by every listener: shadows
// and lit surfaces climb the same ancestors.
let transformCache = new Map<Element, Linear2D>();

/** Transforms measured during the current lamp frame. */
export const getFrameTransformCache = () => transformCache;

// Before the pointer moves, the lamp hangs over the upper left of the desk.
const restingPosition = (): LampPosition => ({
  x: window.innerWidth * 0.3,
  y: window.innerHeight * 0.18,
});

const handlePointerMove = (event: PointerEvent) => {
  target = { x: event.clientX, y: event.clientY };
};

const tick = (time: number) => {
  const goal = target ?? restingPosition();
  const elapsed = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 1;
  lastTime = time;
  const follow = 1 - Math.exp(-elapsed * FOLLOW_RATE);
  lamp.x += (goal.x - lamp.x) * follow;
  lamp.y += (goal.y - lamp.y) * follow;
  // Scheduled first, so a throwing listener cannot stop the shared loop.
  frame = requestAnimationFrame(tick);
  transformCache = new Map();
  for (const listener of listeners) {
    listener(lamp);
  }
};

/**
 * Calls `listener` every animation frame with the lamp position. The shared
 * loop runs only while someone is listening.
 */
export const subscribeLamp = (listener: LampListener) => {
  listeners.add(listener);
  if (listeners.size === 1) {
    Object.assign(lamp, target ?? restingPosition());
    lastTime = 0;
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    frame = requestAnimationFrame(tick);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handlePointerMove);
    }
  };
};

/** Chromium's client hints; the DOM lib does not type them yet. */
interface UserAgentData {
  brands: { brand: string }[];
  mobile: boolean;
}

/**
 * Whether this browser gets the desk lamp: desktop Google Chrome with
 * WebGPU. Everywhere else keeps the DOM rendering and hides the lamp's
 * switch. Chrome's own brand in its client hints tells it apart from Edge,
 * Opera, Brave and other Chromium browsers, which share its user agent
 * string; browsers without client hints (Safari, Firefox, Chrome on iOS) are
 * not Chrome here.
 */
export const isDeskLampSupported = () => {
  if (typeof navigator === "undefined" || !("gpu" in navigator)) {
    return false;
  }
  const hints = (navigator as Navigator & { userAgentData?: UserAgentData })
    .userAgentData;
  return Boolean(
    hints &&
      !hints.mobile &&
      hints.brands.some(({ brand }) => brand === "Google Chrome")
  );
};
