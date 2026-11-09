import {
  DEFAULT_LAMP_CONFIG,
  LAMP_FOLLOW_RATE,
  type LampConfig,
} from "@/lib/lamp-config";
import { createTransformCache } from "./lamp-shadows";

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
  time: number,
  elapsed: number
) => (() => void) | undefined;

let config: LampConfig = DEFAULT_LAMP_CONFIG;

/** The lamp's tunable settings; listeners read them every frame. */
export const getLampConfig = () => config;

export const setLampConfig = (next: LampConfig) => {
  config = next;
  wakeLamp();
};

const listeners = new Set<LampListener>();
const lamp: LampPosition = { x: 0, y: 0 };
// Where the light comes from this frame: the lamp, or pulled towards a
// brighter light on the desk while one burns.
const lit: LampPosition = { x: 0, y: 0 };

/** A brighter light on the desk, client px, and how it outshines the lamp. */
interface LampFlare extends LampPosition {
  /**
   * How much brighter it makes the room's light than the lamp alone: 0 adds
   * nothing, 1 deepens shadows by `FLARE_SHADOW_GAIN` more.
   */
  brightness: number;
  /** 0 leaves the light at the lamp; 1 moves it wholly onto the flare. */
  weight: number;
}

let flare: LampFlare | null = null;
/** How much darker shadows grow at a flare's full brightness. */
const FLARE_SHADOW_GAIN = 2;
let intensity = 1;

/**
 * A light brighter than the lamp burning on the desk (the time machine's
 * plasma), or null once it is out. While it burns the room is lit from
 * between the lamp and it, by `weight`, unsmoothed, so shadows swing away
 * from it as it grows and a flash throws them at once; its flicker belongs in
 * `brightness`, which deepens shadows without moving the light: a light that
 * jittered in place counted as a moving lamp and sent every lit surface to
 * half resolution and back, reallocating their canvases.
 */
export const setLampFlare = (next: LampFlare | null) => {
  const active =
    next && (next.weight > 0.001 || next.brightness > 0.001) ? next : null;
  if (
    flare?.x === active?.x &&
    flare?.y === active?.y &&
    flare?.weight === active?.weight &&
    flare?.brightness === active?.brightness
  ) {
    return;
  }
  flare = active;
  wakeLamp();
};

/**
 * How bright the room's light is against the lamp alone: above 1 while a
 * flare burns, so shadows deepen with it and flicker as it does.
 */
export const getLampIntensity = () => intensity;

/**
 * The lamp itself, eased after the pointer, whatever a flare does to the
 * light: how fast it moves is how fast the hand moves.
 */
export const getLampPointer = (): LampPosition => lamp;

let target: LampPosition | null = null;
let frame = 0;
let lastTime = 0;
let ticking = false;
// Element transforms measured this frame, shared by every listener: shadows
// and lit surfaces climb the same ancestors.
let transformCache = createTransformCache();

let shadowsHeld = false;

/**
 * While the canvas's entrance plays, the lamp's DOM shadows keep the frame
 * they had at rest and ride up with their cards. Rewriting every caster's
 * filter each frame would re-raster the rising cards on the main thread and
 * take the wave off the compositor.
 */
export const holdLampShadows = (held: boolean) => {
  if (shadowsHeld === held) {
    return;
  }
  shadowsHeld = held;
  wakeLamp();
};

export const areLampShadowsHeld = () => shadowsHeld;

let sceneHidden = false;

/**
 * While the canvas waits, hidden, for its first view, shadows land at once
 * instead of easing round: nobody sees them arrive, and an easing filter
 * would still be running on the cards once they start to rise.
 */
export const hideLampScene = (hidden: boolean) => {
  if (sceneHidden === hidden) {
    return;
  }
  sceneHidden = hidden;
  wakeLamp();
};

export const isLampSceneHidden = () => sceneHidden;

const pauses = new Set<string>();

/**
 * While the time machine shows the canvas as a scaled window, the lamp stops
 * where it is and its listeners stop drawing: they measure in client px,
 * which the window's transform would skew, and a frozen scene costs nothing.
 * The pointer is still tracked, so the lamp glides to it on resuming.
 */
export const pauseLamp = (isPaused: boolean, reason = "time-machine") => {
  const wasPaused = pauses.size > 0;
  if (isPaused) {
    pauses.add(reason);
  } else {
    pauses.delete(reason);
  }
  if (pauses.size > 0) {
    cancelAnimationFrame(frame);
    frame = 0;
  } else if (wasPaused) {
    catchingUp = true;
    catchUpSince = 0;
    lastTime = performance.now();
    wakeLamp();
  }
};

let catchingUp = false;
let catchUpSince = 0;
/** The longest a glide back counts as one: a hand moving all along sweeps. */
const MAX_CATCH_UP_MS = 600;

/**
 * Whether the lamp is gliding back to the pointer after a pause. That glide
 * is not the hand sweeping the lamp: lit surfaces keep full resolution
 * through it, since dropping and restoring it reallocated every canvas on
 * the desk as the time machine closed.
 */
export const isLampCatchingUp = () => catchingUp;

/** Transforms measured during the current lamp frame. */
export const getFrameTransformCache = () => transformCache;

// Before the pointer moves, the lamp hangs over the upper left of the desk.
const restingPosition = (): LampPosition => ({
  x: window.innerWidth * 0.3,
  y: window.innerHeight * 0.18,
});

const handlePointerMove = (event: PointerEvent) => {
  target = { x: event.clientX, y: event.clientY };
  wakeLamp();
};

/** Request one frame; listeners request another while their work is moving. */
export const wakeLamp = () => {
  if (frame || !listeners.size || pauses.size || document.hidden) {
    return;
  }
  if (!ticking) {
    lastTime = performance.now();
  }
  frame = requestAnimationFrame(tick);
};

const handleVisibility = () => {
  if (document.hidden) {
    cancelAnimationFrame(frame);
    frame = 0;
  } else {
    lastTime = performance.now();
    wakeLamp();
  }
};

const WAKE_EVENTS = [
  "pointerdown",
  "pointerup",
  "pointerover",
  "pointerout",
  "pointercancel",
  "keydown",
  "keyup",
  "click",
  "wheel",
  "scroll",
  "resize",
  "focusin",
  "focusout",
] as const;

const POSITION_EPSILON = 0.05;

const tick = (time: number) => {
  frame = 0;
  if (pauses.size || document.hidden || !listeners.size) {
    return;
  }
  const goal = target ?? restingPosition();
  const elapsed = lastTime
    ? Math.max(0, Math.min((time - lastTime) / 1000, 0.1))
    : 1 / 60;
  lastTime = time;
  const follow = 1 - Math.exp(-elapsed * LAMP_FOLLOW_RATE);
  lamp.x += (goal.x - lamp.x) * follow;
  lamp.y += (goal.y - lamp.y) * follow;
  const moving =
    Math.hypot(goal.x - lamp.x, goal.y - lamp.y) >= POSITION_EPSILON;
  if (!moving) {
    Object.assign(lamp, goal);
  }
  if (catchingUp) {
    catchUpSince ||= time;
    if (
      Math.hypot(goal.x - lamp.x, goal.y - lamp.y) < 2 ||
      time - catchUpSince > MAX_CATCH_UP_MS
    ) {
      catchingUp = false;
    }
  }
  const weight = flare ? Math.min(1, flare.weight) : 0;
  intensity = 1 + FLARE_SHADOW_GAIN * (flare?.brightness ?? 0);
  lit.x = lamp.x + ((flare?.x ?? 0) - lamp.x) * weight;
  lit.y = lamp.y + ((flare?.y ?? 0) - lamp.y) * weight;
  transformCache = createTransformCache();
  ticking = true;
  try {
    if (moving) {
      wakeLamp();
    }
    const writes: (() => void)[] = [];
    for (const listener of listeners) {
      const write = listener(lit, time, elapsed);
      if (write) {
        writes.push(write);
      }
    }
    for (const write of writes) {
      write();
    }
  } finally {
    ticking = false;
  }
};

/**
 * Reads first and runs returned writes after. The loop sleeps once the lamp
 * converges; listeners call `wakeLamp` while easing or waiting for a draw.
 */
export const subscribeLamp = (listener: LampListener) => {
  listeners.add(listener);
  if (listeners.size === 1) {
    Object.assign(lamp, target ?? restingPosition());
    lastTime = 0;
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    for (const event of WAKE_EVENTS) {
      window.addEventListener(event, wakeLamp, {
        capture: true,
        passive: true,
      });
    }
    document.addEventListener("visibilitychange", handleVisibility);
  }
  wakeLamp();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener("pointermove", handlePointerMove);
      for (const event of WAKE_EVENTS) {
        window.removeEventListener(event, wakeLamp, true);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
    }
  };
};

/** Chromium's client hints; the DOM lib does not type them yet. */
interface UserAgentData {
  brands: { brand: string }[];
  mobile: boolean;
  platform: string;
}

const MAC_PATTERN = /Macintosh/;
const WEBKIT_PATTERN = /AppleWebKit\//;
const OTHER_ENGINE_PATTERN = /Chrome|Chromium|Firefox/;

/**
 * Safari, or another WebKit browser, on a Mac. WebKit sends no client hints,
 * so this reads the user agent. iPadOS asks for desktop sites with this same
 * Mac user agent, but a Mac reports no touch points.
 */
const isDesktopWebKit = () => {
  const { maxTouchPoints, userAgent } = navigator;
  return (
    MAC_PATTERN.test(userAgent) &&
    WEBKIT_PATTERN.test(userAgent) &&
    !OTHER_ENGINE_PATTERN.test(userAgent) &&
    !maxTouchPoints
  );
};

/**
 * Whether this browser gets the desk lamp: desktop Chromium (Chrome, Edge,
 * Brave, Opera, Arc, Vivaldi) or desktop Safari, with WebGPU. Everywhere else
 * (Firefox, phones, tablets) keeps the DOM rendering and hides the lamp's
 * switch. Every Chromium browser lists a "Chromium" brand in its client
 * hints, beside its own and a randomised GREASE brand, so the brand is
 * matched exactly. `mobile` is false on Android tablets, so the platform
 * rules those out. Client hints exist only in secure contexts, so Chromium on
 * a plain-HTTP LAN address shows no lamp; localhost and HTTPS do.
 *
 * `?lamp=force` skips the browser check, for comparing the lamp in Firefox;
 * it still needs WebGPU, and the adapter probe still decides.
 */
export const isDeskLampSupported = () => {
  if (typeof navigator === "undefined" || !("gpu" in navigator)) {
    return false;
  }
  if (new URLSearchParams(window.location.search).get("lamp") === "force") {
    return true;
  }
  const hints = (navigator as Navigator & { userAgentData?: UserAgentData })
    .userAgentData;
  if (!hints) {
    return isDesktopWebKit();
  }
  return (
    !hints.mobile &&
    hints.platform !== "Android" &&
    hints.brands.some(({ brand }) => brand === "Chromium")
  );
};
