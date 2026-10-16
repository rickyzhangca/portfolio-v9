import { useEffect, useRef } from "react";
import type { KeyboardLayout } from "./keyboard-renderer";
import { runLitSurface } from "./lit-surface";

/** Marks the DOM keyboard's parts, which the lit keyboard measures. */
const KEYBOARD_PART_ATTRIBUTE = "data-keyboard-part";
type KeyboardPart = "body" | "chassis" | "key" | "knob" | "track";

/** The keyboard's looks, in the order of the toggle's stops. */
export type KeyboardLook = "apple" | "logi" | "mech";
const STOPS: Record<KeyboardLook, number> = { apple: 1, logi: 0, mech: 2 };

interface LitKeyboardProps {
  mode: KeyboardLook;
  onReady: () => void;
}

/** Room around the keyboard for its shadow, in local px. */
const SHADOW_MARGIN = 72;
/** A tap or a key press shows at least this long, in ms. */
const MIN_PRESS_MS = 120;
/** How quickly keys and the caps' change of look follow, per second. */
const KEY_RATE = 40;
const MODE_RATE = 18;
/**
 * The knob clicks between stops: the detent holds it, then it snaps over
 * into the next stop, accelerating, and rebounds a little before settling.
 */
const KNOB_SNAP_MS = 90;
/** Share of the snap's arrival speed that carries into the rebound. */
const KNOB_REBOUND = 0.15;
/** The detent's spring: stiff and lightly damped, so it settles in a blink. */
const KNOB_STIFFNESS = 2600;
const KNOB_DAMPING = 46;
/** Spring substep, in seconds, short enough for its stiffness. */
const KNOB_STEP = 1 / 240;
interface LookShape {
  /** Keycap and chassis corner radii. */
  cap: number;
  chassis: number;
  /** Depth of a round dish in the keycap's top. */
  dish: number;
  /**
   * Keycap heights above the chassis at rest, under the pointer and pressed:
   * low-profile caps travel a little and press nearly flush; mechanical
   * caps stand tall and press down a switch's travel.
   */
  hover: number;
  pressed: number;
  rest: number;
  /** How far the top is inset from the foot: sloped sides. */
  taper: number;
  /** Depth of a cylindrical dish across the top. */
  trough: number;
}

/** Each look's shape, in local px, in the toggle's order. */
const LOOKS: readonly [LookShape, LookShape, LookShape] = [
  // Logitech: round dished caps.
  {
    cap: 16,
    chassis: 16,
    dish: 5.5,
    hover: 6.5,
    pressed: 1,
    rest: 7.5,
    taper: 0,
    trough: 0,
  },
  // Apple: flat caps with small corners.
  {
    cap: 6,
    chassis: 10,
    dish: 0,
    hover: 6.5,
    pressed: 1,
    rest: 7.5,
    taper: 0,
    trough: 0,
  },
  // Mechanical: tall sculpted caps with sloped sides and a cylindrical top.
  {
    cap: 8,
    chassis: 10,
    dish: 0,
    hover: 23,
    pressed: 19,
    rest: 24,
    taper: 9,
    trough: 1.6,
  },
];

// A shape value at a point along the toggle's travel (0 to 2).
const byLook = (stop: number, value: (look: LookShape) => number) => {
  const [logi, apple, mech] = LOOKS;
  return stop <= 1
    ? mix(value(logi), value(apple), stop)
    : mix(value(apple), value(mech), stop - 1);
};

interface KeyState {
  hovered: boolean;
  pressedAt: number | null;
  releasedAt: number;
}

const ease = (value: number, target: number, rate: number, elapsed: number) =>
  value + (target - value) * (1 - Math.exp(-elapsed * rate));

const mix = (from: number, to: number, amount: number) =>
  from + (to - from) * amount;

interface KnobMotion {
  /** Where the snap started, while one is under way. */
  from: number;
  position: number;
  snapStartedAt: number | null;
  target: number;
  velocity: number;
}

// Advances the knob towards its stop: a snap over the detent, then the
// spring that settles it, kept inside the groove.
const stepKnob = (
  knob: KnobMotion,
  target: number,
  range: number,
  now: number,
  elapsed: number
) => {
  if (target !== knob.target) {
    knob.from = knob.position;
    knob.target = target;
    knob.snapStartedAt = now;
    knob.velocity = 0;
  }
  if (knob.snapStartedAt !== null) {
    const progress = Math.min((now - knob.snapStartedAt) / KNOB_SNAP_MS, 1);
    knob.position = knob.from + (knob.target - knob.from) * progress ** 3;
    if (progress >= 1) {
      // An ease-in cubic arrives at three times its average speed.
      const arrival = (3 * (knob.target - knob.from)) / (KNOB_SNAP_MS / 1000);
      knob.velocity = arrival * KNOB_REBOUND;
      knob.snapStartedAt = null;
    }
    return;
  }
  for (let left = elapsed; left > 0; left -= KNOB_STEP) {
    const dt = Math.min(left, KNOB_STEP);
    const pull =
      -KNOB_STIFFNESS * (knob.position - knob.target) -
      KNOB_DAMPING * knob.velocity;
    knob.velocity += pull * dt;
    knob.position += knob.velocity * dt;
    // The groove's ends stop it; it bounces back off them, softly.
    if (knob.position < 0 || knob.position > range) {
      knob.position = Math.min(Math.max(knob.position, 0), range);
      knob.velocity *= -0.3;
    }
  }
};

// A part's box in the card, ignoring transforms (the caps' lift).
const offsetIn = (element: HTMLElement, root: HTMLElement) => {
  let x = 0;
  let y = 0;
  let current: HTMLElement | null = element;
  while (current && current !== root) {
    x += current.offsetLeft;
    y += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }
  return [x, y, element.offsetWidth, element.offsetHeight] as const;
};

const measureLayout = (root: HTMLElement): KeyboardLayout | null => {
  const part = (name: KeyboardPart) =>
    root.querySelector<HTMLElement>(`[${KEYBOARD_PART_ATTRIBUTE}="${name}"]`);
  const chassis = part("chassis");
  const body = part("body");
  const track = part("track");
  const knob = part("knob");
  const [first, second, third] = root.querySelectorAll<HTMLElement>(
    `[${KEYBOARD_PART_ATTRIBUTE}="key"]`
  );
  if (!(chassis && body && track && knob && first && second && third)) {
    return null;
  }
  return {
    chassis: offsetIn(chassis, root),
    depth: body.offsetHeight - chassis.offsetHeight,
    keys: [
      offsetIn(first, root),
      offsetIn(second, root),
      offsetIn(third, root),
    ],
    knob: offsetIn(knob, root),
    track: offsetIn(track, root),
  };
};

/**
 * Draws the socials keyboard with WebGPU: an aluminium chassis whose keycaps
 * and toggle knob catch the lamp and cast shadows, keeping the DOM's oblique
 * view. The DOM keys stay for clicks, focus and labels; their hover and
 * presses drive the caps here.
 */
export const LitKeyboard = ({ mode, onReady }: LitKeyboardProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onReadyRef = useRef(onReady);
  const modeRef = useRef(mode);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const element = canvas?.parentElement;
    const layout = element ? measureLayout(element) : null;
    if (!(canvas && element && layout)) {
      return;
    }
    const keys = [
      ...element.querySelectorAll<HTMLElement>(
        `[${KEYBOARD_PART_ATTRIBUTE}="key"]`
      ),
    ];
    const legends = keys.map((key) => key.querySelector("svg"));
    if (legends.some((legend) => legend === null)) {
      return;
    }

    const states: KeyState[] = keys.map(() => ({
      hovered: false,
      pressedAt: null,
      releasedAt: 0,
    }));
    const listeners = keys.map((key, index) => {
      const state = states[index] as KeyState;
      const release = () => {
        if (state.pressedAt !== null) {
          state.releasedAt = Math.max(
            performance.now(),
            state.pressedAt + MIN_PRESS_MS
          );
          state.pressedAt = null;
        }
      };
      const handlers = {
        // Keyboard activation has no pointer press; show a short one.
        click: () => {
          if (
            state.pressedAt === null &&
            performance.now() > state.releasedAt
          ) {
            state.releasedAt = performance.now() + MIN_PRESS_MS;
          }
        },
        pointercancel: release,
        pointerdown: () => {
          state.pressedAt = performance.now();
        },
        pointerenter: () => {
          state.hovered = true;
        },
        pointerleave: () => {
          state.hovered = false;
          release();
        },
        pointerup: release,
      };
      for (const [type, handler] of Object.entries(handlers)) {
        key.addEventListener(type, handler);
      }
      return () => {
        for (const [type, handler] of Object.entries(handlers)) {
          key.removeEventListener(type, handler);
        }
      };
    });

    let look = STOPS[modeRef.current];
    const rest = byLook(look, (shape) => shape.rest);
    const travel: [number, number, number] = [rest, rest, rest];
    const knobRange = layout.track[3] - layout.knob[3];
    const knobStop = () => (knobRange * STOPS[modeRef.current]) / 2;
    const knob: KnobMotion = {
      from: knobStop(),
      position: knobStop(),
      snapStartedAt: null,
      target: knobStop(),
      velocity: 0,
    };

    const stop = runLitSurface({
      attach: async (signal) => {
        const { attachKeyboard } = await import("./keyboard-renderer");
        return attachKeyboard(canvas, legends as SVGSVGElement[], signal);
      },
      draw: (surface, { height, intensity, light, pixelScale, width }) =>
        surface.render({
          capRadius: byLook(look, (shape) => shape.cap),
          chassisRadius: byLook(look, (shape) => shape.chassis),
          dish: byLook(look, (shape) => shape.dish),
          height,
          intensity,
          knobTravel: knob.position,
          layout,
          light,
          margin: SHADOW_MARGIN,
          mode: look,
          pixelHeight: Math.round((height + SHADOW_MARGIN * 2) * pixelScale),
          pixelWidth: Math.round((width + SHADOW_MARGIN * 2) * pixelScale),
          taper: byLook(look, (shape) => shape.taper),
          travel,
          trough: byLook(look, (shape) => shape.trough),
          width,
        }),
      element,
      label: "Keyboard lighting",
      onReady: () => onReadyRef.current(),
      overhang: SHADOW_MARGIN,
      step: (elapsed) => {
        const now = performance.now();
        look = ease(look, STOPS[modeRef.current], MODE_RATE, elapsed);
        stepKnob(knob, knobStop(), knobRange, now, elapsed);
        for (const [index, state] of states.entries()) {
          const pressed = state.pressedAt !== null || now < state.releasedAt;
          let target = byLook(look, (shape) => shape.rest);
          if (pressed) {
            target = byLook(look, (shape) => shape.pressed);
          } else if (state.hovered) {
            target = byLook(look, (shape) => shape.hover);
          }
          travel[index] = ease(
            travel[index] ?? target,
            target,
            KEY_RATE,
            elapsed
          );
        }
        return [...travel, look, knob.position];
      },
    });

    return () => {
      stop();
      for (const remove of listeners) {
        remove();
      }
    };
  }, []);

  return (
    <canvas
      className="pointer-events-none absolute"
      ref={canvasRef}
      style={{
        height: `calc(100% + ${SHADOW_MARGIN * 2}px)`,
        left: -SHADOW_MARGIN,
        top: -SHADOW_MARGIN,
        width: `calc(100% + ${SHADOW_MARGIN * 2}px)`,
      }}
    />
  );
};
