/**
 * The toy time machine's charge-up: how full it is, and the shapes of the
 * electric arcs that crawl over its body as it charges. Pure: the caller
 * passes its own random source, so arcs can be tested.
 */

export interface Point {
  x: number;
  y: number;
}

/** Seconds from empty to full while the pointer rests on the car. */
export const CHARGE_SECONDS = 1.4;
/** Seconds from full to empty once the pointer leaves. */
export const DISCHARGE_SECONDS = 0.45;

/** Moves the charge towards full or empty over `dt` seconds. */
export const stepCharge = (level: number, charging: boolean, dt: number) =>
  charging
    ? Math.min(1, level + dt / CHARGE_SECONDS)
    : Math.max(0, level - dt / DISCHARGE_SECONDS);

/**
 * Arcs a second at a charge: none at first, then a crackle that builds as
 * the car fills. They are short and quick (`MICRO_ARC`), hugging the
 * conduits: long bolts across bare panels read as wire, not the film.
 */
export const getArcRate = (level: number) =>
  level < 0.08 ? 0 : 12 + 48 * level ** 2;

/** The crackle on the conduits: how far a micro-arc jumps, px, and lives, ms. */
export const MICRO_ARC = {
  length: { max: 16, min: 7 },
  life: { max: 90, min: 40 },
} as const;

/**
 * The balls of plasma the conduits shed, pulled into the ball of light
 * ahead of the nose, as the film's are: a second at most while it gathers
 * (`charge`) and as it drives (`drive`); how far their path bows out past
 * the body, px; how long the flight takes, ms; and how much of it their
 * tail trails, ms.
 */
export const MOTES = {
  bow: { max: 30, min: 10 },
  charge: 13,
  drive: 22,
  life: { max: 330, min: 210 },
  tailMs: 80,
} as const;

/**
 * Motes a second: none until the ball ahead has formed, more as it grows,
 * and the most while the car drives into it.
 */
export const getMoteRate = (orb: number, driving: boolean) => {
  if (orb < 0.08) {
    return 0;
  }
  return driving ? MOTES.drive : MOTES.charge * Math.min(1, orb / 0.4);
};

/**
 * Where a mote is, `t` (0 to 1) through its flight from `from` to `to`:
 * on a curve that bows `bow` px out to its side of the car first and runs
 * into its target from behind, gathering pace (`t` to the 1.7), so it is
 * sucked in rather than drifting.
 */
export const getMotePoint = (
  from: Point,
  to: Point,
  bow: number,
  t: number
): Point => {
  const u = Math.min(1, Math.max(0, t)) ** 1.7;
  const run = to.x - from.x;
  const c1 = { x: from.x + run * 0.25, y: from.y + bow };
  const c2 = { x: to.x - run * 0.3, y: to.y + bow * 1.4 };
  const v = 1 - u;
  return {
    x:
      v ** 3 * from.x +
      3 * v * v * u * c1.x +
      3 * v * u * u * c2.x +
      u ** 3 * to.x,
    y:
      v ** 3 * from.y +
      3 * v * v * u * c1.y +
      3 * v * u * u * c2.y +
      u ** 3 * to.y,
  };
};

/**
 * How bright the front bumper's emitter bar burns: it lights early in the
 * charge, and drives off at full.
 */
export const getBumperLevel = (level: number, driving: boolean) => {
  if (driving) {
    return 1;
  }
  const share = Math.min(1, Math.max(0, (level - 0.12) / 0.5));
  return share * share * (3 - 2 * share);
};

/**
 * How far back from the nose the arcs reach, as a fraction of the car's
 * length: they gather at the nose first, as the film's do, and wrap the
 * whole car by full charge.
 */
export const getReach = (level: number) => Math.min(1, 0.22 + level);

/**
 * Whether a pixel belongs to the car's cyan conduits and coils, which light
 * up as it charges.
 */
export const isCoilColor = (r: number, g: number, b: number, a: number) =>
  a > 200 && b > 110 && b > r + 22 && g > r + 8;

/**
 * Points on the outline of an image's opaque area, every `step` px: opaque
 * pixels with a transparent neighbour. `alpha` holds one byte a pixel.
 */
export const findEdgePoints = (
  alpha: ArrayLike<number>,
  width: number,
  height: number,
  step = 2,
  threshold = 128
): Point[] => {
  const opaque = (x: number, y: number) =>
    x >= 0 &&
    y >= 0 &&
    x < width &&
    y < height &&
    (alpha[y * width + x] ?? 0) >= threshold;
  const points: Point[] = [];
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (
        opaque(x, y) &&
        !(
          opaque(x - step, y) &&
          opaque(x + step, y) &&
          opaque(x, y - step) &&
          opaque(x, y + step)
        )
      ) {
        points.push({ x, y });
      }
    }
  }
  return points;
};

/**
 * Two outline points for an arc to jump between, `minLength` to
 * `maxLength` px apart, or undefined when none were found in a few tries.
 */
export const pickArcEnds = (
  edges: readonly Point[],
  random: () => number,
  minLength: number,
  maxLength: number
): [Point, Point] | undefined => {
  if (edges.length < 2) {
    return undefined;
  }
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const from = edges[Math.floor(random() * edges.length)];
    const to = edges[Math.floor(random() * edges.length)];
    if (!(from && to)) {
      continue;
    }
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (length >= minLength && length <= maxLength) {
      return [from, to];
    }
  }
  return undefined;
};

/**
 * A lightning path from `from` to `to`: midpoint displacement, each level
 * bending the segment sideways by up to `roughness` of its length and
 * halving the bend for the next, so the bolt is jagged at every scale.
 */
export const makeArc = (
  from: Point,
  to: Point,
  random: () => number,
  roughness = 0.28,
  depth = 4
): Point[] => {
  let points: Point[] = [from, to];
  let bend = roughness;
  for (let level = 0; level < depth; level += 1) {
    const next: Point[] = [];
    for (let index = 0; index < points.length - 1; index += 1) {
      const a = points[index] as Point;
      const b = points[index + 1] as Point;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      // Sideways, a fraction of the segment's own length.
      const offset = (random() * 2 - 1) * bend;
      next.push(a, {
        x: (a.x + b.x) / 2 - dy * offset,
        y: (a.y + b.y) / 2 + dx * offset,
      });
    }
    next.push(points.at(-1) as Point);
    points = next;
    bend *= 0.55;
  }
  return points;
};

/**
 * The departure, in ms from the click, after the film. The charge surges and
 * the car launches, squatting on its rear springs, and gathers speed over a
 * long run. Its conduits pour their charge forward into a ball of light that
 * rides ahead of its nose and grows; where it reaches the spot the car leaves
 * from, it stops and tears open into the time slice, and the car drives
 * into it: it is gone nose first, front to back, at full speed, and the
 * slice snaps shut behind its tail in one flash. As its rear tyres cross the
 * slice, twin fire trails erupt there and race on ahead along the path it
 * would have driven; they burn white-hot and orange, turn blue as they die
 * down, and leave white smoke and charred scorch marks. Behind the slice,
 * the launch leaves only burnt rubber. The time machine opens.
 */
export const DEPARTURE = {
  /** The charge surges this long before the car moves. */
  driveFromMs: 160,
  /**
   * From standing to its tail through the slice, ms: long enough to watch
   * it gather speed, the light squeeze into the slice and the car go
   * through. At 560 the whole departure was over in a blink and the slice
   * stood for about 150ms.
   */
  driveMs: 1000,
  /** The distance grows as time to this power: it accelerates. */
  drivePower: 1.7,
  /** The trails race on ahead of the slice this fast, local px/s. */
  fireSpeed: 1800,
  /**
   * Then it dies down over this long, ms: blue through its first part, as
   * the film's trails turn, then out.
   */
  flameFadeMs: 2600,
  /** Once a spot catches, it burns at full height this long, ms. */
  flameHoldMs: 700,
  /** A spot catches this fast as the fire reaches it. */
  igniteMs: 60,
  /** The squat on launch: the nose lifts this far, local px. */
  launchLiftPx: 2,
  /** The time machine opens this long after the slice has shut. */
  openDelayMs: 1700,
  /** The ball of light moves out to its lead over this long, ms. */
  orbLeadMs: 260,
  /** The ball of light rides this far ahead of the nose once grown, px. */
  orbLeadPx: 64,
  /** Scorch marks fade once the flames are out. */
  scorchFadeMs: 6000,
  /** The slice stands this far ahead of the parked nose, local px. */
  slicePx: 400,
  /** Smoke thins out once the flames are out. */
  smokeFadeMs: 3000,
} as const;

/** When the car's tail is through the slice, ms from the click. */
export const DRIVE_END_MS = DEPARTURE.driveFromMs + DEPARTURE.driveMs;

/** When the time machine opens, ms from the click. */
export const OPEN_MS = DRIVE_END_MS + DEPARTURE.openDelayMs;

/** How far the nose drives to bring the tail through the slice, local px. */
export const getDriveDistance = (carWidth: number) =>
  DEPARTURE.slicePx + carWidth;

const getDriveProgress = (elapsed: number) =>
  Math.min(
    1,
    Math.max(0, (elapsed - DEPARTURE.driveFromMs) / DEPARTURE.driveMs)
  );

/**
 * The car's offset along the desk, accelerating left until it has covered
 * `distance` px. The trip shader mirrors it.
 */
export const getDriveOffset = (elapsed: number, distance: number) =>
  -distance * getDriveProgress(elapsed) ** DEPARTURE.drivePower;

/** When the car has covered `covered` of its `distance`, ms from the click. */
export const getDriveTime = (covered: number, distance: number) => {
  const { driveFromMs, driveMs, drivePower } = DEPARTURE;
  const share = distance > 0 ? Math.min(1, Math.max(0, covered / distance)) : 1;
  return driveFromMs + driveMs * share ** (1 / drivePower);
};

/**
 * The slice's clock, ms from the click, for a car `carWidth` long whose rear
 * tyres sit `rear` px from its nose: when it tears open, when the nose
 * reaches it, when the rear tyres cross it (the fire erupts) and when the
 * tail is through (it snaps shut).
 */
export const getSliceTimes = (carWidth: number, rear: number) => {
  const { orbLeadPx, slicePx } = DEPARTURE;
  const distance = getDriveDistance(carWidth);
  return {
    goneAt: DRIVE_END_MS,
    igniteAt: getDriveTime(slicePx + rear, distance),
    noseAt: getDriveTime(slicePx, distance),
    // The ball of light reaches the slice's spot ahead of the nose.
    opensAt: getDriveTime(slicePx - orbLeadPx, distance),
  };
};

/**
 * The parked car's charge starts gathering ahead of its nose from `from` of
 * a full charge, into a ball of light that grows to `size` of its departing
 * size and moves out `lead` of its departing lead.
 */
export const CHARGE_ORB = { from: 0.16, lead: 0.88, size: 0.88 } as const;

/** A ball of light: how far ahead of the nose, local px, and how grown. */
export interface OrbState {
  lead: number;
  size: number;
}

/** The ball of light a parked car's charge has gathered, 0 to 1 charged. */
export const getChargeOrb = (level: number): OrbState => {
  if (level <= CHARGE_ORB.from) {
    return { lead: 0, size: 0 };
  }
  const share = Math.min(
    1,
    Math.max(0, (level - CHARGE_ORB.from) / (1 - CHARGE_ORB.from))
  );
  return {
    lead: DEPARTURE.orbLeadPx * CHARGE_ORB.lead,
    size: CHARGE_ORB.size * (0.12 + 0.88 * share ** 1.25),
  };
};

const NO_ORB: OrbState = { lead: 0, size: 0 };

/**
 * The ball of light the charge gathers into ahead of the departing car's
 * nose: where it is, local px from the parked nose (negative is ahead), and
 * how grown, 0 to 1. It carries on from the ball the charge had gathered
 * (`charged`), rides ahead of the nose, moving out to its lead, and stops
 * where the slice will open.
 */
export const getOrb = (
  elapsed: number,
  carWidth: number,
  rear: number,
  charged: OrbState = NO_ORB
) => {
  const { driveFromMs, orbLeadMs, orbLeadPx, slicePx } = DEPARTURE;
  const since = elapsed - driveFromMs;
  if (since < 0) {
    return { size: charged.size, x: -charged.lead };
  }
  const { opensAt } = getSliceTimes(carWidth, rear);
  const grown = Math.min(1, since / (opensAt - driveFromMs));
  const out = Math.sin((Math.min(1, since / orbLeadMs) * Math.PI) / 2);
  const lead = charged.lead + (orbLeadPx - charged.lead) * out;
  const nose = getDriveOffset(elapsed, getDriveDistance(carWidth));
  return {
    size: Math.max(charged.size, grown ** 1.5),
    x: Math.max(-slicePx, nose - lead),
  };
};

/**
 * When the fire reaches a spot `distance` px past the slice, ms from the
 * click, given when it erupted. The trip shader mirrors it.
 */
export const getFirePass = (distance: number, igniteAt: number) =>
  igniteAt + (Math.max(0, distance) / DEPARTURE.fireSpeed) * 1000;

/** When the last of trails `length` px long has faded, ms from the click. */
export const getTrailsOutMs = (length: number) =>
  DRIVE_END_MS +
  (length / DEPARTURE.fireSpeed) * 1000 +
  DEPARTURE.flameHoldMs +
  DEPARTURE.flameFadeMs +
  Math.max(DEPARTURE.smokeFadeMs, DEPARTURE.scorchFadeMs);

/**
 * How far the departing car's nose is lifted, local px: it squats on its
 * rear springs as it launches, settling a little as it gathers speed.
 */
export const getLaunchLift = (elapsed: number) => {
  const { driveFromMs, launchLiftPx } = DEPARTURE;
  const squat = Math.min(1, Math.max(0, (elapsed - driveFromMs) / 110));
  const settle = Math.min(
    1,
    Math.max(0, (elapsed - driveFromMs - 110) / (DRIVE_END_MS - driveFromMs))
  );
  return launchLiftPx * Math.sin((squat * Math.PI) / 2) * (1 - 0.5 * settle);
};

/**
 * How high a spot of the trails burns, 0 to 1, `age` ms after the fire
 * reached it. The trip shader mirrors this, getSmoke and getScorch.
 */
export const getFlameIntensity = (age: number) => {
  const { flameFadeMs, flameHoldMs, igniteMs } = DEPARTURE;
  if (age < 0) {
    return 0;
  }
  if (age <= flameHoldMs) {
    return Math.min(1, age / igniteMs);
  }
  return Math.max(0, 1 - (age - flameHoldMs) / flameFadeMs);
};

/**
 * How far a spot's flames have turned from orange to blue, 0 to 1: through
 * the first part of dying down.
 */
export const getFlameBlue = (age: number) => {
  const { flameFadeMs, flameHoldMs } = DEPARTURE;
  const share = Math.min(
    1,
    Math.max(0, (age - flameHoldMs) / (flameFadeMs * 0.45))
  );
  return share * share * (3 - 2 * share);
};

/** How thick the smoke over a spot of the trails is, 0 to 1. */
export const getSmoke = (age: number) => {
  const { flameFadeMs, flameHoldMs, smokeFadeMs } = DEPARTURE;
  if (age < 0) {
    return 0;
  }
  const out = flameHoldMs + flameFadeMs;
  const rising = Math.min(1, age / 500);
  return rising * Math.max(0, 1 - Math.max(0, age - out) / smokeFadeMs);
};

/** How dark a spot's scorch mark is, 0 to 1. */
export const getScorch = (age: number) => {
  const { flameFadeMs, flameHoldMs, scorchFadeMs } = DEPARTURE;
  if (age < 0) {
    return 0;
  }
  const out = flameHoldMs + flameFadeMs;
  if (age <= out) {
    return 1;
  }
  return Math.max(0, 1 - (age - out) / scorchFadeMs);
};

/**
 * The return, in ms from when the time machine lands, after the film: three
 * flashes, each bigger, at one spot ahead of where the car parks, and out of
 * the third the car bursts, nose first, already at speed; it brakes hard to
 * a stop on its spot, diving on its front springs, iced over, its vents
 * pouring white steam and cold vapour rolling off it, and slowly thaws.
 */
export const ARRIVAL = {
  /** The nose comes through just after the last flash goes off. */
  appearMs: 390,
  /** Braking, the nose dips this far, local px. */
  diveLiftPx: 1.6,
  /** The flashes, one after another, each bigger. */
  flashesMs: [0, 190, 380],
  /** It settles back over this long, ms. */
  reboundMs: 340,
  /** Stopping, the body pitches forward this far on its springs, px. */
  reboundPx: 1.6,
  /** It brakes to a stop over this long, ms. */
  slideMs: 620,
  /**
   * It comes through this far from its spot (from the right, heading
   * left), local px: the exit is here, where its nose is as it appears.
   */
  slidePx: 300,
  /** The vents start as the car comes to a stop, ms. */
  steamFromMs: 900,
  /**
   * Its ice starts melting this long after it lands, ms: at its warm edges
   * first, while the panels hold (in the shader). Holding it all white for
   * longer left the hood frozen for most of the return.
   */
  thawFromMs: 1000,
  /** It is gone after this long, ms: slow enough to watch it go. */
  thawMs: 7300,
} as const;

/** The whole return. */
export const RETURN_MS = ARRIVAL.thawFromMs + ARRIVAL.thawMs;

/**
 * The returning car's offset along the desk: braking evenly to a stop, as a
 * car does, then rocking forward on its springs and back.
 */
export const getArrivalOffset = (sinceReturn: number) => {
  const { appearMs, reboundMs, reboundPx, slideMs, slidePx } = ARRIVAL;
  const since = sinceReturn - appearMs;
  const progress = Math.min(1, Math.max(0, since / slideMs));
  const settle = Math.min(1, Math.max(0, (since - slideMs) / reboundMs));
  return (
    slidePx * (1 - progress) ** 2 -
    reboundPx * Math.sin(Math.PI * settle) * (1 - settle)
  );
};

/**
 * How far the arriving car's nose is lifted, local px: it dives while it
 * brakes, then springs back up past level once stopped and settles.
 */
export const getArrivalLift = (sinceReturn: number) => {
  const { appearMs, diveLiftPx, reboundMs, slideMs } = ARRIVAL;
  const since = sinceReturn - appearMs;
  if (since < 0) {
    return 0;
  }
  const dive = Math.min(1, since / 80) * (since < slideMs ? 1 : 0);
  const settle = Math.min(1, Math.max(0, (since - slideMs) / reboundMs));
  const rebound =
    since >= slideMs ? Math.cos(Math.PI * settle * 1.5) * (1 - settle) : 0;
  return -diveLiftPx * (dive + rebound);
};

/**
 * How fast an offset curve moves at `at` ms, px per ms: for the motion blur
 * of a car that covers tens of px a frame.
 */
export const getVelocity = (offset: (at: number) => number, at: number) =>
  offset(at + 0.5) - offset(at - 0.5);

/**
 * How iced over the returned car is: 1 when it lands, melting to 0 at an
 * even pace, so the ice is seen receding throughout.
 */
export const getFrost = (sinceReturn: number) => {
  const { appearMs, thawFromMs, thawMs } = ARRIVAL;
  if (sinceReturn < appearMs) {
    return 0;
  }
  return Math.min(1, Math.max(0, 1 - (sinceReturn - thawFromMs) / thawMs));
};

/**
 * The steam the landed car pours, simulated and rendered in Blender
 * (`tools/render-steam.py`) into a sheet of frames, `cols` by `rows`, played
 * at `fps` from `ARRIVAL.steamFromMs`. `region` is the desk it covers, CSS
 * px from the middle of the car's photo. `fadeMs` eases out its last frames.
 * Its colour channels are the steam lit by three suns in turn (see
 * `STEAM_LIGHTS` in trip-shader.glsl), its alpha the steam's coverage.
 */
export const STEAM_SHEET = {
  cols: 10,
  fadeMs: 1200,
  fps: 10,
  frames: 60,
  region: { height: 500, left: -170, top: -330, width: 810 },
  rows: 6,
} as const;

/**
 * The trails' simulated fire, `tools/render-fire.py`'s atlas: `frames`
 * looping frames at `fps`, `cols` by `rows`, each showing `tile` px of a
 * burning track (as wide and as tall as that on the desk, its fuel line
 * `base` px above its bottom edge). The trip shader tiles it along each
 * track and colours its heat.
 */
export const FIRE_SHEET = {
  cols: 6,
  fps: 24,
  frames: 36,
  rows: 6,
  tile: { base: 21, height: 120, width: 360 },
} as const;

/** How long the steam sheet plays, ms. */
export const STEAM_MS = (STEAM_SHEET.frames / STEAM_SHEET.fps) * 1000;

/** How strongly the steam shows, 0 to 1: in quickly, out over its end. */
export const getSteam = (sinceReturn: number) => {
  const since = sinceReturn - ARRIVAL.steamFromMs;
  if (since < 0 || since >= STEAM_MS) {
    return 0;
  }
  const rising = Math.min(1, since / 200);
  const easing = Math.min(
    1,
    Math.max(0, (STEAM_MS - since) / STEAM_SHEET.fadeMs)
  );
  return rising * easing;
};

/**
 * The light the charge throws on the car's own body, baked from the model
 * by `tools/render-carlight.py` into `src/assets/timecar/car-light.webp`:
 * grey tiles side by side, each the photo's box at `density` px per CSS px,
 * in this order. `orbAhead` is metres from the nose to the ball of light;
 * `sliceAt` and `exitAt` are where the slice and the exit cut the car, as
 * shares of its length from the nose. `metres` and `pxPerMetre` place the
 * car in its photo.
 */
export const CAR_LIGHT = {
  density: 2,
  exitAt: [0.2, 0.4, 0.6, 0.8, 1],
  metres: 4.216,
  orbAhead: [0.06, 0.35, 0.8, 1.4],
  pxPerMetre: 57.3,
  sliceAt: [0, 0.2, 0.4, 0.6, 0.8],
} as const;

/** Each map's tile in the sheet. */
export const CAR_LIGHT_TILES = {
  exit: CAR_LIGHT.orbAhead.length + CAR_LIGHT.sliceAt.length,
  orb: 0,
  rimFront: CAR_LIGHT.orbAhead.length + CAR_LIGHT.sliceAt.length * 2,
  rimRear: CAR_LIGHT.orbAhead.length + CAR_LIGHT.sliceAt.length * 2 + 1,
  slice: CAR_LIGHT.orbAhead.length,
} as const;

/** How many tiles the sheet holds. */
export const CAR_LIGHT_COUNT = CAR_LIGHT_TILES.rimRear + 1;

/** A map's share of the light: its index within its family and weight. */
export type LightShare = readonly [index: number, weight: number];

/**
 * Blends the two maps either side of `value` along increasing `stops`,
 * holding the end maps beyond them.
 */
export const getLightBlend = (
  stops: readonly number[],
  value: number
): LightShare[] => {
  const last = stops.length - 1;
  if (value <= (stops[0] ?? 0)) {
    return [[0, 1]];
  }
  if (value >= (stops[last] ?? 0)) {
    return [[last, 1]];
  }
  const next = stops.findIndex((stop) => stop > value);
  const from = stops[next - 1] ?? 0;
  const to = stops[next] ?? 1;
  const share = (value - from) / (to - from);
  return [
    [next - 1, 1 - share],
    [next, share],
  ];
};

/** Over how much of the car's length a cut map hands over to the next. */
const CUT_HANDOVER = 0.06;

/**
 * The maps for a cut at `cut` (share of the length from the nose), using
 * only maps whose own cut is hidden behind the screen's: for the slice the
 * car shows behind its cut, so maps cut at or before it (`behind`), for the
 * exit ahead of it, so maps cut at or after it. Each takes over from the
 * last just past its own cut.
 */
export const getCutBlend = (
  stops: readonly number[],
  cut: number,
  behind: boolean
): LightShare[] => {
  if (behind) {
    let index = -1;
    stops.forEach((candidate, at) => {
      if (candidate <= cut) {
        index = at;
      }
    });
    if (index < 0) {
      return [];
    }
    const mark = stops[index] ?? 0;
    const share = index === 0 ? 1 : Math.min(1, (cut - mark) / CUT_HANDOVER);
    return share >= 1
      ? [[index, 1]]
      : [
          [index - 1, 1 - share],
          [index, share],
        ];
  }
  const index = stops.findIndex((candidate) => candidate >= cut);
  if (index < 0) {
    return [];
  }
  const mark = stops[index] ?? 1;
  const last = stops.length - 1;
  const share = index === last ? 1 : Math.min(1, (mark - cut) / CUT_HANDOVER);
  return share >= 1
    ? [[index, 1]]
    : [
        [index + 1, 1 - share],
        [index, share],
      ];
};
