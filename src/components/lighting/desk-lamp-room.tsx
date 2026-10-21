import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { lampConfigAtom } from "@/context/atoms";
import { getRoomGradient } from "@/lib/room-gradient";
import {
  contactBoxShadow,
  type LampShadow,
  lampBoxShadow,
  lampShadowFilter,
  projectLampShadow,
} from "@/lib/lamp-shadow";
import {
  areLampShadowsHeld,
  getFrameTransformCache,
  getLampConfig,
  isLampSceneHidden,
  setLampConfig,
  subscribeLamp,
} from "./desk-lamp";
import {
  LAMP_CONTACT_ATTRIBUTE,
  LAMP_DEPTH_ATTRIBUTE,
  LAMP_SHADOW_ATTRIBUTE,
  screenLinear,
} from "./lamp-shadows";

/** How long the room takes to dim when the lamp switches on. */
const ROOM_FADE_MS = 700;
/**
 * Once the entrance lets go of the shadows, they ease round to wherever the
 * lamp has moved meanwhile instead of jumping there.
 */
const RELEASE_EASE_MS = 400;
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
/**
 * Rounded casters moving faster than this, in canvas px per second, take the
 * lamp's shadow as a box-shadow instead of the filter, and go back to it
 * once slower than the second speed. A drop-shadow filter is blurred by the
 * compositor every frame its caster scales or rotates: a folder of 15 prints
 * fanning out, each with its caption, dropped about one frame in eight even
 * with the filters held still. A box-shadow is painted into the card's own
 * layer, which only moves. The filter stays for casters at rest, since a
 * lamp sweep would repaint every box-shadow it changes.
 */
const BOXED_SHADOW_SPEED = 120;
const FILTERED_SHADOW_SPEED = 30;
/**
 * A box-shadow change repaints its card, image and all, so while in flight
 * it is rewritten only once the shadow has moved or softened this far, in the
 * caster's own px, or darkened by the second amount. Rewritten every frame,
 * a folder of 15 prints and their captions still dropped frames opening.
 */
const BOXED_SHADOW_STEP = 3;
const BOXED_OPACITY_STEP = 0.03;
/** The camera's content element from react-zoom-pan-pinch. */
const CAMERA_SELECTOR = ".react-transform-component";

interface CasterState {
  /** Last filter written; style.filter reads back normalized. */
  applied: string;
  /** Last contact box-shadow written, for casters that take one. */
  appliedContact: string;
  /** The stylesheet's box-shadow, restored when the lamp goes off. */
  boxShadow: string;
  /** Whether the lamp's shadow is written as a box-shadow, while in flight. */
  boxed: boolean;
  /** The lamp shadow last written as a box-shadow, while boxed. */
  boxedShadow: LampShadow | null;
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
 * forces layout between writes. `onCast` runs once the first shadows are
 * written. Returns a function that restores the stylesheet shadows.
 */
const startLampShadows = (onCast: () => void) => {
  const states = new Map<HTMLElement, CasterState>();
  let lastTime = performance.now();
  let held = false;
  let hasCast = false;
  // The lamp already eases; a CSS filter transition would lag behind it.
  // Only while the lamp switches on, or the entrance lets go of the shadows,
  // do they ease round instead of snapping in one frame.
  let easeUntil = lastTime + ROOM_FADE_MS;
  let easeTransition = `filter ${ROOM_FADE_MS}ms ease-out`;
  let appliedTransition = "";

  const restore = (element: HTMLElement, state: CasterState) => {
    element.style.filter = state.filter;
    if (state.appliedContact) {
      element.style.boxShadow = state.boxShadow;
    }
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
      easeUntil = now + RELEASE_EASE_MS;
      easeTransition = `filter ${RELEASE_EASE_MS}ms ease-out`;
      for (const state of states.values()) {
        state.position = null;
      }
    }
    if (isLampSceneHidden()) {
      easeUntil = 0;
    }
    const elapsed = Math.max((now - lastTime) / 1000, 1 / 240);
    const follow = 1 - Math.exp(-elapsed * LIFT_RATE);
    lastTime = now;
    const transition = now < easeUntil ? easeTransition : "none";
    const retransition = transition !== appliedTransition;
    appliedTransition = transition;

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
    const contacts: [HTMLElement, string][] = [];
    for (const element of casters) {
      const height = Number(element.getAttribute(LAMP_SHADOW_ATTRIBUTE)) || 0;
      let state = states.get(element);
      if (!state) {
        state = {
          applied: "",
          appliedContact: "",
          boxShadow: element.style.boxShadow,
          boxed: false,
          boxedShadow: null,
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
        rest: height * cameraScale,
      });
      if (!shadow) {
        continue;
      }
      const depth = Number(element.getAttribute(LAMP_DEPTH_ATTRIBUTE)) || 1;
      const cast = { ...shadow, opacity: shadow.opacity * depth };
      const isRounded = element.hasAttribute(LAMP_CONTACT_ATTRIBUTE);
      // This frame's speed switches at once, as a card takes off; the
      // smoothed speed holds the box-shadow until it has landed.
      state.boxed =
        isRounded &&
        Math.max(speed, state.speed) >
          (state.boxed ? FILTERED_SHADOW_SPEED : BOXED_SHADOW_SPEED);
      const filter = state.boxed ? "none" : lampShadowFilter(cast);
      if (state.applied !== filter) {
        state.applied = filter;
        filters.push([element, filter]);
      }
      if (!state.boxed) {
        state.boxedShadow = null;
      }
      const boxed = state.boxedShadow;
      const holdBoxed =
        boxed !== null &&
        Math.max(
          Math.abs(cast.x - boxed.x),
          Math.abs(cast.y - boxed.y),
          Math.abs(cast.blur - boxed.blur)
        ) < BOXED_SHADOW_STEP &&
        Math.abs(cast.opacity - boxed.opacity) < BOXED_OPACITY_STEP;
      if (isRounded && !holdBoxed) {
        if (state.boxed) {
          state.boxedShadow = cast;
        }
        const contact = state.boxed
          ? `${lampBoxShadow(cast)}, ${contactBoxShadow(shadow)}`
          : contactBoxShadow(shadow);
        if (state.appliedContact !== contact) {
          state.appliedContact = contact;
          contacts.push([element, contact]);
        }
      }
    }

    return () => {
      for (const [element, state] of removed) {
        restore(element, state);
      }
      // Set before the filters, so this frame's change already eases.
      for (const element of retransition ? states.keys() : added) {
        element.style.transition = transition;
      }
      for (const [element, filter] of filters) {
        element.style.filter = filter;
      }
      for (const [element, contact] of contacts) {
        element.style.boxShadow = contact;
      }
      if (!hasCast) {
        hasCast = true;
        onCast();
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

interface DeskLampRoomProps {
  /** Called once the lamp's first shadows are written. */
  onShadowsCast?: () => void;
}

/**
 * The room under the desk lamp: every caster's shadow points away from the
 * lamp, and the room dims around it so the DOM cards share the lit laptop's
 * light. A multiply blend leaves the pool under the lamp untouched and
 * darkens the rest, without repainting anything underneath.
 */
export const DeskLampRoom = ({ onShadowsCast }: DeskLampRoomProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const config = useAtomValue(lampConfigAtom);
  const onShadowsCastRef = useRef(onShadowsCast);

  useEffect(() => {
    onShadowsCastRef.current = onShadowsCast;
  }, [onShadowsCast]);

  // The lamp's loops run outside React; they read the playground's settings
  // every frame.
  useEffect(() => {
    setLampConfig(config);
  }, [config]);

  useEffect(() => startLampShadows(() => onShadowsCastRef.current?.()), []);

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
