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
const MAX_RETURN_STAGGER_S = 0.05;
/**
 * Going back in, cards pass under the cover, so the ones the closed folder
 * hides fade only as they arrive.
 */
const RETURN_FADE_DELAY_S = 0.17;
/** Long enough for every returning card to land before it unmounts. */
export const STACK_RETURN_MS = 600;
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
/** Going back in, both moves are brisk: the folder takes its cards quickly. */
const RETURN_SPRING = {
  type: "spring",
  stiffness: 800,
  damping: 50,
  mass: 1,
} as const;
const FLIGHT_TRAIL_DELAY_S = 0.03;
/** Lifted cards come a little closer to the camera mid-flight. */
export const FLIGHT_SCALE = 1.03;
const FLIGHT_SCALE_DURATION_S = 0.32;
/** Long enough for the last card to land; then hover moves go back to snappy. */
export const STACK_FLIGHT_MS = 800;

interface SpringConfig {
  damping: number;
  mass: number;
  stiffness: number;
}

/**
 * Seconds a spring released from rest needs to cover `fraction` of its
 * distance, found by stepping the damped oscillator.
 */
export const getSpringCrossingTime = (
  { damping, mass, stiffness }: SpringConfig,
  fraction: number
) => {
  const dt = 0.001;
  let position = 0;
  let velocity = 0;
  for (let step = 0; step < 2000; step += 1) {
    const force = -stiffness * (position - 1) - damping * velocity;
    velocity += (force / mass) * dt;
    position += velocity * dt;
    if (position >= fraction) {
      return (step + 1) * dt;
    }
  }
  return 2;
};

/** Margin past the folder's edge before a card may start changing rows. */
const FLIGHT_CLEARANCE_PX = 12;
/** How much of its rise a returning card finishes before it slides in. */
const RETURN_RISE_FRACTION = 0.55;
/** A returning card is back to its small size by the time it slides in. */
const RETURN_SHRINK_DURATION_S = 0.06;
/** Rows closer than this are not worth waiting for. */
const MIN_SEQUENCED_TRAVEL_PX = 24;

/** Where one card's flight starts and ends, in the folder's own px. */
export interface StackFlightPath {
  /** The folder cover's width: a card is clear of it once past this x. */
  coverWidth: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

/**
 * Per-property transitions for one card leaving or entering its folder.
 * The folder has walls, so a card crosses them sideways and changes rows only
 * where it is free: out of the folder the sideways move leads and the drop into
 * its row waits until the card has cleared the cover; back in, the rise to the
 * folder's row leads and the slide under the cover waits until it is there.
 * Without a `path` the trailing axis follows after a short fixed delay.
 */
export const getStackFlightTransition = (
  index: number,
  count: number,
  flight: StackFlight,
  path?: StackFlightPath
) => {
  const order = flight === "out" ? index : count - 1 - index;
  const step = Math.min(
    FLIGHT_STAGGER_S,
    (flight === "out" ? MAX_FLIGHT_STAGGER_S : MAX_RETURN_STAGGER_S) /
      Math.max(count - 1, 1)
  );
  const delay = FLIGHT_BASE_DELAY_S + order * step;
  const lead = {
    ...(flight === "out" ? FLIGHT_LEAD : RETURN_SPRING),
    delay,
  };
  let trailDelay = FLIGHT_TRAIL_DELAY_S;
  // A card is small inside the folder and full size outside it, so it only
  // grows once it has cleared the cover, and has shrunk before it goes back in.
  let scaleDelay = delay;
  let scaleDuration = FLIGHT_SCALE_DURATION_S;
  if (path) {
    const travelX = Math.abs(path.to.x - path.from.x);
    const travelY = Math.abs(path.to.y - path.from.y);
    const isRowChange = travelY > MIN_SEQUENCED_TRAVEL_PX;
    if (flight === "out") {
      const clearance = path.coverWidth + FLIGHT_CLEARANCE_PX - path.from.x;
      const clearTime =
        travelX > 0
          ? getSpringCrossingTime(
              FLIGHT_LEAD,
              Math.min(0.9, Math.max(0.2, clearance / travelX))
            )
          : 0;
      trailDelay = isRowChange ? clearTime : 0;
      scaleDelay = delay + clearTime;
    } else {
      const riseTime = isRowChange
        ? getSpringCrossingTime(RETURN_SPRING, RETURN_RISE_FRACTION)
        : 0;
      scaleDuration = RETURN_SHRINK_DURATION_S;
      trailDelay = Math.max(riseTime, RETURN_SHRINK_DURATION_S);
    }
  }
  const trail = {
    ...(flight === "out" ? FLIGHT_TRAIL : RETURN_SPRING),
    delay: delay + trailDelay,
  };
  return {
    opacity: {
      ...TRANSITIONS.opacity,
      delay: flight === "out" ? delay : delay + RETURN_FADE_DELAY_S,
    },
    rotate: trail,
    scale: {
      delay: scaleDelay,
      duration: scaleDuration,
      ease: "easeInOut" as const,
      times: [0, 0.45, 1],
    },
    x: flight === "out" ? lead : trail,
    y: flight === "out" ? trail : lead,
  };
};
