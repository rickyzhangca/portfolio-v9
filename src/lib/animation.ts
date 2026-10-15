export const SPRING_PRESETS = {
  snappy: { type: "spring", stiffness: 800, damping: 50, mass: 1 },
  smooth: { type: "spring", stiffness: 250, damping: 30, mass: 0.9 },
  quick: { type: "spring", stiffness: 400, damping: 35, mass: 0.8 },
} as const;

export const TRANSITIONS = {
  opacity: { duration: 0.18 },
  none: { type: "tween", duration: 0 },
} as const;

/** Which way a folder's cards are travelling: out of the folder, or back in. */
export type StackFlight = "in" | "out";

/**
 * Cards leave one after another, top sheet first, and return in reverse. The
 * whole stagger is capped, so a folder of 14 cards does not keep its top card
 * waiting half a second.
 */
const FLIGHT_BASE_DELAY_S = 0.02;
const FLIGHT_STAGGER_S = 0.022;
const MAX_FLIGHT_STAGGER_S = 0.12;
/** Closing should feel quicker than opening. */
const MAX_RETURN_STAGGER_S = 0.08;
/**
 * Going back in, cards pass under the cover, so the ones the closed folder
 * hides fade only as they arrive.
 */
const RETURN_FADE_DELAY_S = 0.17;
/** Long enough for every returning card to land before it unmounts. */
export const STACK_RETURN_MS = 520;
/** The axis that leads a flight, and the one that trails it. */
const FLIGHT_LEAD = {
  type: "spring",
  stiffness: 620,
  damping: 42,
  mass: 1,
} as const;
const FLIGHT_TRAIL = {
  type: "spring",
  stiffness: 400,
  damping: 35,
  mass: 1,
} as const;
const FLIGHT_TRAIL_DELAY_S = 0.03;
/** Lifted cards come a little closer to the camera mid-flight. */
export const FLIGHT_SCALE = 1.03;
const FLIGHT_SCALE_DURATION_S = 0.32;
/** Long enough for the last card to land; then hover moves go back to snappy. */
export const STACK_FLIGHT_MS = 700;

/**
 * Per-property transitions for one card leaving or entering its folder.
 * Out of the folder the sideways move leads and the drop into its row trails,
 * so a card slides out through the notch before it falls into the fan, on an
 * arc rather than a straight line. Back in, the rise to the folder's row leads
 * and the slide under the cover trails.
 */
export const getStackFlightTransition = (
  index: number,
  count: number,
  flight: StackFlight
) => {
  const order = flight === "out" ? index : count - 1 - index;
  const step = Math.min(
    FLIGHT_STAGGER_S,
    (flight === "out" ? MAX_FLIGHT_STAGGER_S : MAX_RETURN_STAGGER_S) /
      Math.max(count - 1, 1)
  );
  const delay = FLIGHT_BASE_DELAY_S + order * step;
  const lead = { ...FLIGHT_LEAD, delay };
  const trail = { ...FLIGHT_TRAIL, delay: delay + FLIGHT_TRAIL_DELAY_S };
  return {
    opacity: {
      ...TRANSITIONS.opacity,
      delay: flight === "out" ? delay : delay + RETURN_FADE_DELAY_S,
    },
    rotate: trail,
    scale: {
      delay,
      duration: FLIGHT_SCALE_DURATION_S,
      ease: "easeInOut" as const,
      times: [0, 0.45, 1],
    },
    x: flight === "out" ? lead : trail,
    y: flight === "out" ? trail : lead,
  };
};
