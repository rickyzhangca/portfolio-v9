export const SPRING_PRESETS = {
  snappy: { type: "spring", stiffness: 800, damping: 50, mass: 1 },
  smooth: { type: "spring", stiffness: 250, damping: 30, mass: 0.9 },
  quick: { type: "spring", stiffness: 400, damping: 35, mass: 0.8 },
} as const;

export const TRANSITIONS = {
  opacity: { duration: 0.18 },
  none: { type: "tween", duration: 0 },
} as const;

/**
 * Matches `AUTO_PAN_DURATION_MS` (360ms) and `AUTO_PAN_EASING` (easeOutCubic)
 * with a 1-frame alignment delay for `panTo`'s rAF so camera pan and item
 * repulsion compose into one straight, monotonic trajectory without reversals.
 */
export const REPULSION_TRANSITION = {
  delay: 0.016,
  duration: 0.36,
  ease: [0.33, 1, 0.68, 1],
} as const;

/** Which way a folder's cards are travelling: out of the folder, or back in. */
export type StackFlight = "in" | "out";

/**
 * Cards leave one after another, top sheet first, and return in reverse. The
 * whole stagger is capped, so a folder of 14 cards does not keep its top card
 * waiting half a second.
 */
const FLIGHT_BASE_DELAY_S = 0.015;
const FLIGHT_STAGGER_S = 0.022;
const MAX_FLIGHT_STAGGER_S = 0.12;
/** Closing should feel quicker than opening. */
const MAX_RETURN_STAGGER_S = 0.05;
/**
 * Fallback fade delay when no path is given; with a path, each hidden card
 * fades once its own x spring slips behind the cover.
 */
const RETURN_FADE_DELAY_S = 0.14;
/** Long enough for every returning card to land before it unmounts. */
export const STACK_RETURN_MS = 600;
/**
 * Opening springs: nearly critically damped so cards glide out as one
 * continuous gesture without rubbery overshoot or mid-flight stalls.
 */
const FLIGHT_LEAD = {
  type: "spring",
  stiffness: 520,
  damping: 43,
  mass: 1,
} as const;
const FLIGHT_TRAIL = {
  type: "spring",
  stiffness: 380,
  damping: 36,
  mass: 1,
} as const;
const FLIGHT_SCALE_SPRING = {
  type: "spring",
  stiffness: 380,
  damping: 37,
  mass: 1,
} as const;
/**
 * Closing springs: brisk and nearly critically damped so cards tuck cleanly
 * back under the cover without bouncing back out.
 */
const RETURN_LEAD = {
  type: "spring",
  stiffness: 640,
  damping: 49,
  mass: 1,
} as const;
const RETURN_TRAIL = {
  type: "spring",
  stiffness: 540,
  damping: 45,
  mass: 1,
} as const;
const RETURN_SCALE_SPRING = {
  type: "spring",
  stiffness: 620,
  damping: 48,
  mass: 1,
} as const;
const FLIGHT_TRAIL_DELAY_S = 0.03;
/**
 * Slight head start for x before scale unfolds on open for row-0 cards,
 * so the first card grows smoothly in motion instead of inflating after stop.
 */
const FLIGHT_SCALE_DELAY_S = 0.02;
/**
 * Lower-row cards start scaling once they have crossed this share of their
 * exit time, keeping their height inside the folder pocket while x < coverWidth.
 */
const LOWER_ROW_SCALE_DELAY_RATIO = 0.68;
/** Long enough for the last card to land; then hover moves go back to snappy. */
export const STACK_FLIGHT_MS = 700;

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
  if (fraction <= 0) {
    return 0;
  }
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

/** How close to the collapsed row y must rise before x enters the cover wall. */
const RETURN_WALL_MARGIN_PX = 18;
/** Share of shrink a returning card finishes by the time x reaches coverWidth. */
const RETURN_SHRINK_AT_WALL = 0.92;
/** Share of cover width a hidden returning card passes before fading out. */
const RETURN_COVER_ENTRY_RATIO = 0.6;
/** Rows closer than this are not worth waiting for. */
const MIN_SEQUENCED_TRAVEL_PX = 24;

/** Where one card's flight starts and ends, in the folder's own px. */
export interface StackFlightPath {
  /** The folder cover's width: a card is clear of it once past this x. */
  coverWidth: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

const getStackFlightDelay = (
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
  return FLIGHT_BASE_DELAY_S + order * step;
};

const getOpenClearTime = (path: StackFlightPath) => {
  const travelX = Math.abs(path.to.x - path.from.x);
  if (travelX <= 0) {
    return 0;
  }
  const fraction = Math.min(
    0.92,
    Math.max(0.15, (path.coverWidth - path.from.x) / travelX)
  );
  return getSpringCrossingTime(FLIGHT_LEAD, fraction);
};

/** Extra beat past coverWidth so a caption pill clears even the rounded corner. */
const CAPTION_CLEAR_BUFFER_S = 0.02;

/**
 * Seconds after opening starts when a card's caption should fade in: right as
 * that card clears the folder's right edge, so captions never peek beneath the
 * closed bottom wall of the cover.
 */
export const getStackCaptionDelay = (
  index: number,
  count: number,
  path: StackFlightPath
) =>
  getStackFlightDelay(index, count, "out") +
  getOpenClearTime(path) +
  CAPTION_CLEAR_BUFFER_S;

/**
 * Per-property transitions for one card leaving or entering its folder.
 * A folder is a pocket sealed on top, left and bottom and open only on the
 * right: out of the folder, lower-row cards clear the right edge before
 * dropping below the bottom wall; back in, x is timed so lower-row cards have
 * risen to the pocket opening by the moment they cross the cover's right edge.
 */
export const getStackFlightTransition = (
  index: number,
  count: number,
  flight: StackFlight,
  path?: StackFlightPath
) => {
  const delay = getStackFlightDelay(index, count, flight);
  const lead = {
    ...(flight === "out" ? FLIGHT_LEAD : RETURN_LEAD),
    delay,
  };
  let trailDelay = FLIGHT_TRAIL_DELAY_S;
  let scaleDelay = flight === "out" ? delay + FLIGHT_SCALE_DELAY_S : delay;
  let fadeDelay = flight === "out" ? delay : delay + RETURN_FADE_DELAY_S;
  if (path) {
    const travelX = Math.abs(path.to.x - path.from.x);
    if (flight === "out") {
      const isLowerRow = path.to.y - path.from.y > MIN_SEQUENCED_TRAVEL_PX;
      const clearTime = getOpenClearTime(path);
      trailDelay = isLowerRow ? clearTime : 0;
      scaleDelay =
        delay +
        (isLowerRow
          ? clearTime * LOWER_ROW_SCALE_DELAY_RATIO
          : FLIGHT_SCALE_DELAY_S);
    } else {
      const riseY = path.from.y - path.to.y;
      const isLowerRow = riseY > MIN_SEQUENCED_TRAVEL_PX;
      const yAlignFraction = isLowerRow
        ? Math.min(
            0.985,
            Math.max(0.5, (riseY - RETURN_WALL_MARGIN_PX) / riseY)
          )
        : 0;
      const yAlignTime = isLowerRow
        ? getSpringCrossingTime(RETURN_LEAD, yAlignFraction)
        : 0;
      const xReachWallFraction =
        travelX > 0
          ? Math.min(
              0.92,
              Math.max(0, (path.from.x - path.coverWidth) / travelX)
            )
          : 0;
      const xReachWallTime =
        travelX > 0
          ? getSpringCrossingTime(RETURN_TRAIL, xReachWallFraction)
          : 0;
      trailDelay = isLowerRow ? Math.max(0, yAlignTime - xReachWallTime) : 0;
      const scaleReachTime = getSpringCrossingTime(
        RETURN_SCALE_SPRING,
        RETURN_SHRINK_AT_WALL
      );
      scaleDelay = Math.max(
        delay,
        delay + trailDelay + xReachWallTime - scaleReachTime
      );
      if (travelX > 0) {
        const entryFraction = Math.min(
          0.85,
          Math.max(
            0.45,
            (path.from.x - path.coverWidth * RETURN_COVER_ENTRY_RATIO) / travelX
          )
        );
        fadeDelay =
          delay +
          trailDelay +
          getSpringCrossingTime(RETURN_TRAIL, entryFraction);
      }
    }
  }
  const trail = {
    ...(flight === "out" ? FLIGHT_TRAIL : RETURN_TRAIL),
    delay: delay + trailDelay,
  };
  const scale = {
    ...(flight === "out" ? FLIGHT_SCALE_SPRING : RETURN_SCALE_SPRING),
    delay: scaleDelay,
  };
  return {
    opacity: {
      ...TRANSITIONS.opacity,
      delay: fadeDelay,
    },
    rotate: trail,
    scale,
    x: flight === "out" ? lead : trail,
    y: flight === "out" ? trail : lead,
  };
};
