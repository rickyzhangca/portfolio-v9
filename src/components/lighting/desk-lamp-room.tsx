import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { lampConfigAtom } from "@/context/atoms";
import { getRoomGradient } from "@/lib/room-gradient";
import { projectLampShadow } from "@/lib/lamp-shadow";
import {
  areLampShadowsHeld,
  getFrameTransformCache,
  getLampConfig,
  setLampConfig,
  subscribeLamp,
} from "./desk-lamp";
import { LAMP_SHADOW_ATTRIBUTE, screenLinear } from "./lamp-shadows";

/** How long the room takes to dim when the lamp switches on. */
const ROOM_FADE_MS = 700;
const SWITCH_ON_TRANSITION = `filter ${ROOM_FADE_MS}ms ease-out`;
/** Extra height while the pointer hovers a caster, as when it is picked up. */
const HOVER_LIFT = 8;
/** How quickly a caster rises or settles, per second. */
const LIFT_RATE = 14;
/**
 * Moving casters ride higher, as a card does when it is picked up and
 * carried: extra height per canvas px/s of travel, up to a ceiling. Speed is
 * measured in canvas space, so camera pans lift nothing.
 */
const FLIGHT_LIFT_PER_SPEED = 0.008;
const MAX_FLIGHT_LIFT = 18;
/** The camera's content element from react-zoom-pan-pinch. */
const CAMERA_SELECTOR = ".react-transform-component";

interface CasterState {
  /** Last filter written; style.filter reads back normalized. */
  applied: string;
  filter: string;
  lift: number;
  /** Center in canvas px last frame, for its speed. */
  position: { x: number; y: number } | null;
  /** Smoothed speed in canvas px per second. */
  speed: number;
  transition: string;
}

const isHovered = (element: HTMLElement) =>
  element.matches(":hover") || element.closest(".group:hover") !== null;

/**
 * Points every caster's drop shadow away from the desk lamp. Each frame reads
 * all layout first and hands the lamp its filter writes, so the pass never
 * forces layout between writes. Returns a function that restores the stylesheet shadows.
 */
const startLampShadows = () => {
  const states = new Map<HTMLElement, CasterState>();
  let lastTime = performance.now();
  const switchedOnAt = lastTime;
  let switchingOn = true;
  let held = false;

  const restore = (element: HTMLElement, state: CasterState) => {
    element.style.filter = state.filter;
    element.style.transition = state.transition;
  };

  const unsubscribe = subscribeLamp((lamp) => {
    if (areLampShadowsHeld()) {
      held = true;
      return;
    }
    const now = performance.now();
    if (held) {
      // The cards moved while shadows held; that travel is not flight.
      held = false;
      lastTime = now;
      for (const state of states.values()) {
        state.position = null;
      }
    }
    const elapsed = Math.max((now - lastTime) / 1000, 1 / 240);
    const follow = 1 - Math.exp(-elapsed * LIFT_RATE);
    lastTime = now;
    const settled = switchingOn && now - switchedOnAt > ROOM_FADE_MS;
    if (settled) {
      switchingOn = false;
    }

    const casters = [
      ...document.querySelectorAll<HTMLElement>(`[${LAMP_SHADOW_ATTRIBUTE}]`),
    ];
    const present = new Set(casters);
    const removed = [...states].filter(([element]) => !present.has(element));
    for (const [element] of removed) {
      states.delete(element);
    }

    const cache = getFrameTransformCache();
    const camera = document.querySelector(CAMERA_SELECTOR);
    const cameraLinear = screenLinear(camera, cache);
    const cameraScale = Math.sqrt(
      Math.abs(
        cameraLinear.a * cameraLinear.d - cameraLinear.b * cameraLinear.c
      )
    );
    const cameraOrigin = camera?.getBoundingClientRect() ?? { left: 0, top: 0 };
    const { heightPx } = getLampConfig();

    // Reads, and the shadows they give; the DOM is written afterwards.
    const added: HTMLElement[] = [];
    const filters: [HTMLElement, string][] = [];
    for (const element of casters) {
      const height = Number(element.getAttribute(LAMP_SHADOW_ATTRIBUTE)) || 0;
      let state = states.get(element);
      if (!state) {
        state = {
          applied: "",
          filter: element.style.filter,
          lift: height,
          position: null,
          speed: 0,
          transition: element.style.transition,
        };
        states.set(element, state);
        added.push(element);
      }
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || cameraScale === 0) {
        continue;
      }
      const position = {
        x: (rect.left + rect.width / 2 - cameraOrigin.left) / cameraScale,
        y: (rect.top + rect.height / 2 - cameraOrigin.top) / cameraScale,
      };
      const speed = state.position
        ? Math.hypot(
            position.x - state.position.x,
            position.y - state.position.y
          ) / elapsed
        : 0;
      state.position = position;
      state.speed += (speed - state.speed) * follow;
      const targetLift =
        height +
        (isHovered(element) ? HOVER_LIFT : 0) +
        Math.min(state.speed * FLIGHT_LIFT_PER_SPEED, MAX_FLIGHT_LIFT);
      state.lift += (targetLift - state.lift) * follow;
      const shadow = projectLampShadow({
        center: {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        },
        lamp,
        lampHeight: heightPx,
        lift: state.lift * cameraScale,
        linear: screenLinear(element, cache),
      });
      if (!shadow) {
        continue;
      }
      const filter = `drop-shadow(${shadow.x.toFixed(1)}px ${shadow.y.toFixed(1)}px ${shadow.blur.toFixed(1)}px rgb(0 0 0 / ${shadow.opacity.toFixed(3)}))`;
      if (state.applied !== filter) {
        state.applied = filter;
        filters.push([element, filter]);
      }
    }

    return () => {
      for (const [element, state] of removed) {
        restore(element, state);
      }
      if (settled) {
        for (const element of states.keys()) {
          element.style.transition = "none";
        }
      }
      for (const element of added) {
        // The lamp already eases; a CSS filter transition would lag behind
        // it. Only while the lamp switches on do shadows ease round from the
        // stylesheet's, as the room dims, instead of snapping in one frame.
        element.style.transition = switchingOn ? SWITCH_ON_TRANSITION : "none";
      }
      for (const [element, filter] of filters) {
        element.style.filter = filter;
      }
    };
  });

  return () => {
    unsubscribe();
    for (const [element, state] of states) {
      restore(element, state);
    }
    states.clear();
  };
};

/**
 * The room under the desk lamp: every caster's shadow points away from the
 * lamp, and the room dims around it so the DOM cards share the lit laptop's
 * light. A multiply blend leaves the pool under the lamp untouched and
 * darkens the rest, without repainting anything underneath.
 */
export const DeskLampRoom = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const config = useAtomValue(lampConfigAtom);

  // The lamp's loops run outside React; they read the playground's settings
  // every frame.
  useEffect(() => {
    setLampConfig(config);
  }, [config]);

  useEffect(() => startLampShadows(), []);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    // Fade in after mount so the room dims instead of snapping dark.
    const fade = requestAnimationFrame(() => {
      element.style.opacity = "1";
    });
    let previous = "";
    const unsubscribe = subscribeLamp((lamp) => {
      const x = `${lamp.x.toFixed(1)}px`;
      const y = `${lamp.y.toFixed(1)}px`;
      // The lamp eases forever toward the pointer; skip sub-pixel steps so a
      // resting lamp stops touching the DOM.
      if (`${x} ${y}` === previous) {
        return;
      }
      previous = `${x} ${y}`;
      return () => {
        element.style.setProperty("--lamp-x", x);
        element.style.setProperty("--lamp-y", y);
      };
    });
    return () => {
      cancelAnimationFrame(fade);
      unsubscribe();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 opacity-0 mix-blend-multiply transition-opacity"
      ref={ref}
      style={{
        background: getRoomGradient(
          config,
          "var(--lamp-x, 30vw) var(--lamp-y, 18vh)"
        ),
        transitionDuration: `${ROOM_FADE_MS}ms`,
      }}
    />
  );
};
