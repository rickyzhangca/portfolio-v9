import {
  DEFAULT_LAMP_CONFIG,
  LAMP_FOLLOW_RATE,
  type LampConfig,
} from "@/lib/lamp-config";
import type { Linear2D } from "@/lib/lamp-shadow";

/** Lamp position in client px. It trails the pointer like a hand-held lamp. */
export interface LampPosition {
  x: number;
  y: number;
}

/**
 * Called every frame with the lamp and the frame's requestAnimationFrame
 * timestamp. A listener reads layout when called and returns its DOM writes,
 * which run once every listener has read: a write between two listeners'
 * reads would force a style recalculation for each of them.
 */
type LampListener = (
  lamp: LampPosition,
  time: number
) => (() => void) | undefined;

let config: LampConfig = DEFAULT_LAMP_CONFIG;

/** The lamp's tunable settings; listeners read them every frame. */
export const getLampConfig = () => config;

export const setLampConfig = (next: LampConfig) => {
  config = next;
};

const listeners = new Set<LampListener>();
const lamp: LampPosition = { x: 0, y: 0 };
let target: LampPosition | null = null;
let frame = 0;
let lastTime = 0;
// Element transforms measured this frame, shared by every listener: shadows
// and lit surfaces climb the same ancestors.
let transformCache = new Map<Element, Linear2D>();

let shadowsHeld = false;

/**
 * While the canvas's entrance plays, the lamp's DOM shadows keep the frame
 * they had at rest and ride up with their cards. Rewriting every caster's
 * filter each frame would re-raster the rising cards on the main thread and
 * take the wave off the compositor.
 */
export const holdLampShadows = (held: boolean) => {
  shadowsHeld = held;
};

export const areLampShadowsHeld = () => shadowsHeld;

let sceneHidden = false;

/**
 * While the canvas waits, hidden, for its first view, shadows land at once
 * instead of easing round: nobody sees them arrive, and an easing filter
 * would still be running on the cards once they start to rise.
 */
export const hideLampScene = (hidden: boolean) => {
  sceneHidden = hidden;
};

export const isLampSceneHidden = () => sceneHidden;

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
  const follow = 1 - Math.exp(-elapsed * LAMP_FOLLOW_RATE);
  lamp.x += (goal.x - lamp.x) * follow;
  lamp.y += (goal.y - lamp.y) * follow;
  // Scheduled first, so a throwing listener cannot stop the shared loop.
  frame = requestAnimationFrame(tick);
  transformCache = new Map();
  const writes: (() => void)[] = [];
  for (const listener of listeners) {
    const write = listener(lamp, time);
    if (write) {
      writes.push(write);
    }
  }
  for (const write of writes) {
    write();
  }
};

/**
 * Calls `listener` every animation frame with the lamp position, reads
 * first and returned writes after. The shared loop runs only while someone
 * is listening.
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
  platform: string;
}

/**
 * Whether this browser gets the desk lamp: desktop Chromium with WebGPU
 * (Chrome, Edge, Brave, Opera, Arc, Vivaldi), which all draw through the same
 * Blink and Dawn the lamp was tuned on. Everywhere else keeps the DOM
 * rendering and hides the lamp's switch. Every Chromium browser lists a
 * "Chromium" brand in its client hints, beside its own and a randomised
 * GREASE brand, so the brand is matched exactly. Browsers without client
 * hints (Safari, Firefox, every iOS browser) are not Chromium here, even
 * where they ship WebGPU. `mobile` is false on Android tablets, so the
 * platform rules those out. Client hints exist only in secure contexts: a
 * plain-HTTP LAN address shows no lamp, localhost and HTTPS do.
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
      hints.platform !== "Android" &&
      hints.brands.some(({ brand }) => brand === "Chromium")
  );
};
