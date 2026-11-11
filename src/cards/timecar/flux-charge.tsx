import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";
import carLightUrl from "@/assets/timecar/car-light.webp";
import type { CarGlow } from "@/components/lighting/car-glow";
import {
  getLampConfig,
  type LampPosition,
  setLampFlare,
  subscribeLamp,
  wakeLamp,
} from "@/components/lighting/desk-lamp";
import {
  ARRIVAL,
  CAR_LIGHT,
  CAR_LIGHT_COUNT,
  CAR_LIGHT_TILES,
  CHARGE_ORB,
  DEPARTURE,
  findEdgePoints,
  getArcRate,
  getArrivalLift,
  getBumperLevel,
  getArrivalOffset,
  getDriveDistance,
  getDriveOffset,
  getFlameIntensity,
  getFrost,
  getLaunchLift,
  getChargeOrb,
  getCutBlend,
  getLightBlend,
  getMotePoint,
  getMoteRate,
  getOrb,
  getReach,
  getSliceTimes,
  getSteam,
  getTrailsOutMs,
  getVelocity,
  isCoilColor,
  type LightShare,
  MICRO_ARC,
  MOTES,
  makeArc,
  OPEN_MS,
  type Point,
  RETURN_MS,
  STEAM_SHEET,
  stepCharge,
} from "@/lib/flux-charge";
import type {
  BackingSize,
  TripBounds,
  TripFrame,
  TripRenderer,
  TripTrails,
} from "./trip-renderer";

/**
 * Room around the car for arcs, smoke, the bolts that feed the
 * slice ahead of it, the arrival's flashes and vapour, in px. The shader
 * canvas reaches further left over the trails.
 */
const MARGIN = 130;
/**
 * Where the light ahead of the nose and the slice stand across the car's
 * height, a share of it from its top: a little above its middle line. The
 * trip shader's ORB_Y matches.
 */
const ORB_Y = 0.52;
/** How far past the screen's left edge the fire races, in screen px. */
const OFFSCREEN_PX = 40;
/** Room the trails need above, below and behind their track, local px. */
const TRAIL_MARGIN = { above: 170, behind: 60, below: 40 } as const;
/** The longest the fire races, local px, however far out it is zoomed. */
const MAX_FIRE_PX = 4000;
/** The largest the shader canvas grows over the trails, in canvas px. */
const MAX_SHADER_PX = 4096;
const ARC_LIFE_MS = { max: 220, min: 90 } as const;
/**
 * The filaments that bridge the blazing bumper and the ball of light (then
 * the slice), as the film's funnel: where along the bumper each leaves, as
 * shares of its length, each holding a path this long, ms.
 */
const SLICE_BOLTS = [0.2, 0.5, 0.8] as const;
const SLICE_JAG_MS = { max: 55, min: 26 } as const;
/** The bolts fade into the slice from this far before it to this far past. */
const CUT_FEATHER_PX = { inside: 4, outside: 22 } as const;
/**
 * How long the light takes to squeeze into the slice, ms: long enough to see
 * the one become the other.
 */
const SLICE_OPEN_MS = 140;
/** The flash it snaps shut in lasts this long, ms. */
const SNAP_FLASH_MS = 400;
/** The arrival flashes' forks: how many, and how far they reach, px. */
// They reach past each flash's white core: inside it only their blue edge
// shows, which read as pen lines on paper.
const FLASH_FORKS = [
  { count: 5, reach: 50 },
  { count: 7, reach: 95 },
  { count: 9, reach: 165 },
] as const;
/**
 * The car's lamps, as shares of its box: headlights in its front face,
 * tail lights at the back. Each is a hot lens in blooms (`bloom`: radius,
 * px, and opacity at the lens), and lights the steel around it within
 * `spill` px. A hard-edged wedge of beam read as a cheap cut-out, and soft
 * pools on the daylit desk as flat tinted shapes.
 */
const LAMPS = {
  bloom: [
    { opacity: 0.22, radius: 34 },
    { opacity: 0.85, radius: 9 },
  ],
  heads: [
    { x: 0.025, y: 0.27 },
    { x: 0.025, y: 0.74 },
  ],
  spill: 26,
  tails: [
    { x: 0.955, y: 0.2 },
    { x: 0.955, y: 0.78 },
  ],
} as const;
/**
 * The room dims around the car while it charges and leaves, so its light
 * reads: not at all within `clearPx` of its middle, easing to `outer` by
 * `fullPx`, in a cool night tone; in px of the desk. The dimming eases in
 * over `inSeconds` and out over `outSeconds`. A deep veil in two stops read
 * as a hard vignette and showed 8-bit steps, and one deepest round the car
 * blacked out the screen, so it is gentle, clear round the car, eased
 * through many stops and dithered. Its clear pool is the plasma's light:
 * it follows the plasma and is scaled by `pool` (`min` + `gain` times the
 * plasma's light, up to `max`), so it grows and breathes with it.
 */
const ROOM_DIM = {
  clearPx: 240,
  fullPx: 1150,
  inSeconds: 0.9,
  outer: 0.3,
  outSeconds: 1.4,
  pool: { gain: 0.8, max: 1.7, min: 0.8 },
  rgb: [10, 13, 24],
} as const;
/**
 * The light the plasma throws on the desk round it, under the car and over
 * the room's dim: `radiusPx` in the car's px, as opaque as `opacity` at full
 * strength. It, the dim and the shader's plasma flicker with one pulse, so the
 * room answers the plasma; on its own the plasma flickered beside a dead still
 * room. A veil over the whole page (the lamp sagging) dimmed the plasma too
 * and read as a crude global mask, so the light stays local.
 */
const PLASMA_LIGHT = {
  gradient:
    "radial-gradient(closest-side, rgba(190, 235, 255, 0.7), rgba(110, 185, 255, 0.4) 26%, rgba(70, 135, 255, 0.16) 55%, rgba(60, 120, 255, 0.05) 80%, rgba(60, 120, 255, 0) 100%)",
  opacity: 1,
  radiusPx: 580,
} as const;
/**
 * Under the desk lamp the plasma is a brighter lamp: the room's light moves
 * from the lamp towards it, up to `weight` of the way at full strength, so
 * every shadow on the desk swings away from it and shivers with its flicker.
 * `curve` eases its growth in, so a faint charge leaves the lamp in charge.
 */
const PLASMA_LAMP = { curve: 0.7, weight: 1 } as const;
/**
 * The plasma's flicker: a new level every `holdMs` (a range), eased in over
 * `easeSeconds`, between `min` and `max`.
 */
const PLASMA_FLICKER = {
  easeSeconds: 0.04,
  holdMs: { max: 100, min: 30 },
  max: 1.12,
  min: 0.88,
} as const;
/** Stops the dim's gradient is eased through. */
const DIM_STOPS = 14;
/** After the car leaves, when its steam sheet goes to the GPU, ms. */
const STEAM_UPLOAD_DELAY_MS = 1500;
/** The conduits' glow: the haze around them, px, and pulses' spacing, px. */
const COIL_GLOW = { bloom: 8.5, blur: 2.4, pulseGap: 42 } as const;
/** Driving off, the body shakes up and down this far, px. */
const ROAD_SHAKE_PX = 0.35;
const TWINKLE_LIFE_MS = 220;
/** Body shake at full charge, px. It starts past `SHAKE_FROM`. */
const SHAKE_PX = 0.7;
const SHAKE_FROM = 0.6;
/**
 * The front bumper's emitter bar, as the film lights it: stacked strokes
 * along the nose, widest first (width px, rgb, opacity), a tight electric
 * blue bloom around an overexposed white-hot core, and the light it throws
 * back over the hood, px.
 */
const BUMPER = {
  hood: 34,
  layers: [
    { opacity: 0.05, rgb: "35, 130, 255", width: 12 },
    { opacity: 0.09, rgb: "45, 150, 255", width: 8.5 },
    { opacity: 0.16, rgb: "65, 180, 255", width: 6 },
    { opacity: 0.28, rgb: "115, 210, 255", width: 4 },
    { opacity: 0.52, rgb: "185, 238, 255", width: 2.5 },
    { opacity: 0.95, rgb: "255, 255, 255", width: 1.3 },
  ],
} as const;
/**
 * A mote's look: a thick, full-bodied plasma stream ribbon (never a round
 * head on a skinny string) whose glow sheath and bright white-cyan/lavender
 * spine hold their width along the curved trajectory and feather out softly.
 */
const MOTE_LOOK = {
  layers: [
    { core: false, opacity: 0.24, width: 7.8 },
    { core: false, opacity: 0.44, width: 4.8 },
    { core: true, opacity: 0.72, width: 2.8 },
    { core: true, opacity: 0.98, width: 1.5 },
  ],
  sheath: {
    blue: "85, 200, 255",
    blueCore: "210, 245, 255",
    violet: "225, 125, 255",
    violetCore: "248, 220, 255",
  },
  steps: 8,
  violetShare: 0.42,
} as const;
/**
 * A bolt's glow, widest first: high-luminance cyan and violet so every
 * layer brightens the steel or dimmed desk instead of drawing a dark rim.
 */
const AURA = [
  [5, 0.05],
  [3.3, 0.11],
  [2.1, 0.22],
  [1.35, 0.42],
] as const;
const AURA_BODY = [
  [13, 0.08],
  [7, 0.14],
] as const;
/** Bolt glows, in rgb: high-luminance electric cyan-blue, magenta and violet. */
const AURA_RGB = {
  blue: "110, 215, 255",
  magenta: "235, 140, 255",
  violet: "195, 165, 255",
} as const;
/** A bolt's white core tapers from its root to its tip, px. */
const BOLT_WIDTH = { root: 1.25, tip: 0.32 } as const;
/**
 * A bolt holds its shape this long before it jumps to a new path, ms:
 * re-jagged every frame it read as noise, not as a discharge. Now and then
 * it goes dark for a frame or two between paths, so it strobes.
 */
const JAG_MS = { max: 80, min: 45 } as const;
const STROBE = { chance: 0.3, max: 34, min: 17 } as const;
/** How far a bolt lights the car's body around it, px, and how much. */
const BODY_LIGHT = { opacity: 0.32, radius: 34 } as const;
/**
 * The colour of the baked light on the body (`CAR_LIGHT`): the ball of
 * light, the slice and the exit burn cold white, the bolts cyan.
 */
const CAR_LIGHT_TINT = {
  cold: [170, 222, 255],
  rim: [95, 190, 255],
} as const;
/** How strongly each baked light shows at full strength. */
// Laid over the photo, the light also hides it: at full strength the car
// washed out pale and lost its darks.
const CAR_LIGHT_GAIN = { orb: 0.6, rim: 0.45, slice: 0.65 } as const;
/** How many bolts' worth of light makes a rim map's full strength. */
const RIM_BOLTS = 3;

let carLightMaps: Promise<HTMLCanvasElement[]> | undefined;

/**
 * The baked light maps, each a canvas of its tint with the light as its
 * alpha, so drawing one lays its light over the photo. Split a tile a
 * frame: reading back the whole sheet at once held a frame.
 */
const loadCarLight = () => {
  carLightMaps ??= (async () => {
    const response = await fetch(carLightUrl);
    const bitmap = await createImageBitmap(await response.blob());
    const tileWidth = Math.round(bitmap.width / CAR_LIGHT_COUNT);
    const maps: HTMLCanvasElement[] = [];
    for (let index = 0; index < CAR_LIGHT_COUNT; index += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: one tile a frame, on purpose.
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const tile = document.createElement("canvas");
      tile.width = tileWidth;
      tile.height = bitmap.height;
      const tileContext = tile.getContext("2d", { willReadFrequently: true });
      if (!tileContext) {
        throw new Error("No 2D context for the car's light");
      }
      tileContext.drawImage(
        bitmap,
        index * tileWidth,
        0,
        tileWidth,
        bitmap.height,
        0,
        0,
        tileWidth,
        bitmap.height
      );
      const pixels = tileContext.getImageData(0, 0, tileWidth, bitmap.height);
      const [red, green, blue] =
        index >= CAR_LIGHT_TILES.rimFront
          ? CAR_LIGHT_TINT.rim
          : CAR_LIGHT_TINT.cold;
      const { data } = pixels;
      for (let at = 0; at < data.length; at += 4) {
        data[at + 3] = data[at] ?? 0;
        data[at] = red;
        data[at + 1] = green;
        data[at + 2] = blue;
      }
      tileContext.putImageData(pixels, 0, 0);
      maps.push(tile);
    }
    bitmap.close();
    return maps;
  })();
  return carLightMaps;
};
/** How far the slice lights the car's body, px, and how much. */
const SLICE_LIGHT = { opacity: 0.35, radius: 85 } as const;
/**
 * The exposure the motion blur stands for, ms: about one frame, so a car
 * covering tens of px a frame streaks instead of strobing.
 */
const SHUTTER_MS = 16;
/** The longest streak, local px. */
const MAX_BLUR_PX = 90;
/** Streaks shorter than this leave the DOM car sharp; longer, it gives way. */
const BLUR_SHARE_PX = { from: 6, full: 16 } as const;
/** Seconds the charge takes to surge to full once clicked. */
const SURGE_SECONDS = 0.2;
/** Where the tyres meet the desk, as fractions of the car's box. */
const TRACKS = {
  front: 0.21,
  rear: 0.79,
  rows: [0.2, 0.94],
} as const;
/** The landing car's glare fades over this long, ms. */
const GLARE_MS = 120;
/** Its skid marks fade over the end of the return, ms. */
const SKID_FADE_MS = 1600;
/** Room the flashes need around where they go off, local px. */
const FLASH_ROOM = { x: 480, y: 210 } as const;
/** Bolts over the car as it lands. */
const LANDING_BOLTS = 4;
/** How far a landing bolt jumps, px. */
const LANDING_ARC_PX = { max: 45, min: 25 } as const;
/**
 * The lights the effect throws on the car under the desk lamp, in linear
 * rgb: its bolts' cold light (more bolts, brighter, up to `max`), the flash
 * it lands in, and the fire it drove through; each with its height above
 * the desk, local px.
 */
const GLOW = {
  bolts: { color: [0.32, 0.58, 1], max: 1.1, perArc: 0.2, z: 34 },
  fire: { color: [1, 0.52, 0.2], strength: 1.4, z: 20 },
  flash: { color: [0.85, 0.92, 1], strength: 2.4, z: 80 },
} as const;
/** The dimming layer's size, px of the desk: past the screen at any zoom. */
const DIM_SIZE_PX = 40_000;
/** Departures whose trails can burn at once. */
const MAX_TRAILS = 2;
/** The shader's canvas px per CSS px: fire and smoke are soft. */
const SHADER_DENSITY = 0.75;

/** Where the car is in its trip to another version and back. */
export type Trip = "parked" | "departing" | "away" | "returning";

interface Arc {
  born: number;
  /** Dark between two paths, for a strobe. */
  dark: boolean;
  /** Its branch's current path, on arcs that fork. */
  forkPath?: Point[];
  /** A short branch from the middle, as an offset, on some arcs. */
  forks?: Point;
  from: Point;
  /** When it last jumped to a new path, and how long it holds this one. */
  jaggedAt: number;
  jagMs: number;
  life: number;
  path: Point[];
  to: Point;
  violet: boolean;
}

/** A plasma stream a conduit sheds, pouring into the radiance ahead. */
interface Mote {
  absorbed?: boolean;
  born: number;
  /** How far its path bows out past the body, px (its side's sign). */
  bow: number;
  from: Point;
  life: number;
  phase: number;
  scale: number;
  toOffset: Point;
  violet: boolean;
}

interface Twinkle {
  born: number;
  size: number;
  violet: boolean;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

/**
 * A bolt from the car's front to the slice: its shape from (0, 0) to
 * (1, 0), laid each frame between where its ends are then, since the car
 * races tens of px a frame towards the slice.
 */
interface SliceBolt {
  endX: number;
  forkAt: number;
  forkOffset: Point;
  forkShape?: Point[];
  jaggedAt: number;
  jagMs: number;
  shape: Point[];
  /** Where it lands on the slice, px from the slice's middle. */
  spread: number;
}

interface FluxChargeProps {
  /** The car and its lighting, shaken, driven and hidden by the effect. */
  bodyRef: RefObject<HTMLDivElement | null>;
  charging: boolean;
  /** The lights it throws on the car, for the desk lamp's relit car. */
  glow?: CarGlow;
  height: number;
  /**
   * The car's photo: arcs jump between points on its outline, its cyan
   * conduits light up, and the shader brings it back and frosts it.
   */
  image: string;
  /** Whether the desk lamp is on: the landing's steam is lit by it. */
  lampOn?: boolean;
  /** True while another canvas item, overlay or reader sits over the desk. */
  obscured?: boolean;
  /** Called once the car has gone and the time machine should open. */
  onDeparted: () => void;
  /** Called once the returned car has thawed. */
  onReturned: () => void;
  trip: Trip;
  width: number;
}

interface Outline {
  /** One byte of opacity a pixel of the car's box. */
  alpha: Uint8Array | undefined;
  coils: Point[];
  edges: Point[];
  image: HTMLImageElement | undefined;
}

const between = (range: { max: number; min: number }) =>
  range.min + Math.random() * (range.max - range.min);

const loadOutline = async (
  src: string,
  width: number,
  height: number
): Promise<Outline> => {
  const image = new Image();
  image.src = src;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return { alpha: undefined, coils: [], edges: [], image };
  }
  context.drawImage(image, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  const alpha = new Uint8Array(width * height);
  for (let index = 0; index < alpha.length; index += 1) {
    alpha[index] = data[index * 4 + 3] ?? 0;
  }
  return {
    alpha,
    coils: findCoils(image, width, height),
    edges: findEdgePoints(alpha, width, height),
    image,
  };
};

/**
 * The cyan conduits' pixels at the photo's own resolution, in local px:
 * thinned to a tube-like ridge so dense cyan patches on the roof box do not
 * bloat into solid cyan marshmallows when blurred.
 */
const findCoils = (image: HTMLImageElement, width: number, height: number) => {
  const density = Math.max(1, Math.round(image.naturalWidth / width));
  const canvas = document.createElement("canvas");
  canvas.width = width * density;
  canvas.height = height * density;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return [];
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  const w = canvas.width;
  const h = canvas.height;
  const isCoilAt = (px: number, py: number) => {
    if (px < 0 || py < 0 || px >= w || py >= h) {
      return false;
    }
    const i = (py * w + px) * 4;
    return isCoilColor(
      data[i] ?? 0,
      data[i + 1] ?? 0,
      data[i + 2] ?? 0,
      data[i + 3] ?? 0
    );
  };
  const seen = new Set<number>();
  const coils: Point[] = [];
  const step = Math.max(1, Math.round(density * 0.75));
  for (let py = 0; py < h; py += 1) {
    for (let px = 0; px < w; px += 1) {
      if (!isCoilAt(px, py)) {
        continue;
      }
      // Skip the deep interior of thick cyan patches (such as the roof
      // vents) so only the perimeter/tube glows like a flux band.
      const deepInterior =
        isCoilAt(px - step * 2, py) &&
        isCoilAt(px + step * 2, py) &&
        isCoilAt(px, py - step * 2) &&
        isCoilAt(px, py + step * 2);
      if (deepInterior) {
        continue;
      }
      const gx = Math.floor(px / step);
      const gy = Math.floor(py / step);
      const cellKey = gy * 4096 + gx;
      if (seen.has(cellKey)) {
        continue;
      }
      seen.add(cellKey);
      coils.push({
        x: (px + 0.5) / density,
        y: (py + 0.5) / density,
      });
    }
  }
  return coils;
};

/**
 * A ribbon along `points` that narrows from `rootWidth` to `tipWidth`, as
 * one closed path: stroking it in tapering pieces doubled the translucent
 * edge where the pieces' caps overlapped.
 */
const traceRibbon = (
  context: CanvasRenderingContext2D,
  points: Point[],
  rootWidth: number,
  tipWidth: number
) => {
  const last = points.length - 1;
  const left: Point[] = [];
  const right: Point[] = [];
  points.forEach((point, index) => {
    const before = points[Math.max(0, index - 1)] as Point;
    const after = points[Math.min(last, index + 1)] as Point;
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const length = Math.hypot(dx, dy) || 1;
    const half =
      (rootWidth + (tipWidth - rootWidth) * (index / Math.max(1, last))) / 2;
    left.push({
      x: point.x - (dy / length) * half,
      y: point.y + (dx / length) * half,
    });
    right.push({
      x: point.x + (dy / length) * half,
      y: point.y - (dx / length) * half,
    });
  });
  context.beginPath();
  for (const [index, point] of left.entries()) {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  }
  for (const point of right.reverse()) {
    context.lineTo(point.x, point.y);
  }
  context.closePath();
};

/**
 * The time machine's trip, after the film. Resting the pointer on it
 * charges it: white-hot bolts gather at the nose and leap into the air ahead
 * of it, then spread back until they wrap the whole car; its conduits light
 * up with a pulse running along them, its lamps come on, stars glint along
 * its edges and the body starts to shake. Clicking surges the charge and the
 * car launches, squatting on its springs; a short way ahead the time slice
 * tears open, fed by bolts from its front corners, and the car drives into
 * it and is gone front to back, its cut edge white-hot, until the slice
 * snaps shut behind its tail in one flash. Twin fire trails erupt where its
 * rear tyres crossed and race on ahead, out of view, while the time
 * machine opens. When it closes, three flashes go off ahead of the car's
 * spot and it bursts out of the last, nose first, braking hard, iced over
 * and steaming. Bolts, lamps and stars are a 2D canvas that rides along with
 * the car; the slice, fire, smoke, flashes, frost and vapour are a WebGL2
 * shader (`trip-shader.glsl`). A frame loop runs only while any of it moves.
 */
export const FluxCharge = ({
  bodyRef,
  charging,
  glow,
  height,
  image,
  lampOn = false,
  obscured = false,
  onDeparted,
  onReturned,
  trip,
  width,
}: FluxChargeProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Where the desk lamp is, client px, while it is on.
  const lampRef = useRef<LampPosition | null>(null);
  const shaderCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chargingRef = useRef(charging && !obscured);
  const obscuredRef = useRef(obscured);
  const tripRef = useRef(trip);
  const callbacksRef = useRef({ onDeparted, onReturned });
  const startRef = useRef<() => void>(() => undefined);
  const quenchRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    callbacksRef.current = { onDeparted, onReturned };
  }, [onDeparted, onReturned]);

  useEffect(() => {
    if (!lampOn) {
      lampRef.current = null;
      return;
    }
    const unsubscribe = subscribeLamp((lamp) => {
      lampRef.current = { x: lamp.x, y: lamp.y };
    });
    return () => {
      unsubscribe();
      lampRef.current = null;
    };
  }, [lampOn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const shaderCanvas = shaderCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!(canvas && shaderCanvas && context)) {
      return;
    }
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let outline: Outline = {
      alpha: undefined,
      coils: [],
      edges: [],
      image: undefined,
    };
    let outlineRequested = false;
    let renderer: TripRenderer | undefined;
    let level = 0;
    let arcBudget = 0;
    let twinkleBudget = 0;
    let arcs: Arc[] = [];
    let sliceBolts: SliceBolt[] = [];
    let motes: Mote[] = [];
    let moteBudget = 0;
    // The bumper's front edge, local px, once the outline has loaded.
    let bumper: Point[] | undefined;
    let twinkles: Twinkle[] = [];
    let frame = 0;
    let last = 0;
    let disposed = false;
    let pixelRatio = 1;
    // The baked light on the body, once split; radial glows until then.
    let lightMaps: HTMLCanvasElement[] | undefined;
    loadCarLight()
      .then((maps) => {
        lightMaps = maps;
      })
      .catch(() => {
        carLightMaps = undefined;
      });
    // The trip's clock: when it left and came back. Each departure's trails
    // keep their own clock, newest first, so they burn on through the
    // return and the next trip.
    let tripSeen: Trip = tripRef.current;
    // The ball of light the charge had gathered when the car set off.
    let chargedOrb = getChargeOrb(0);
    let fedOrb = 0;
    let absorbedMass = 0;
    const impactKick = { x: 0, y: 0 };
    const impactVel = { x: 0, y: 0 };
    let impactSurge = 0;
    // The plasma's flicker and how much light it throws this frame, shared
    // by the shader, the room's dim, the light on the room and the lamp.
    let plasmaFlicker = 1;
    let plasmaFlickerTarget = 1;
    let plasmaFlickerNext = 0;
    let plasmaLight = 0;
    // Where the plasma stands from the car's middle, local px, weighed by
    // its strength: the dim's clear pool follows it.
    let plasmaShift = 0;
    let plasmaLayer: HTMLDivElement | undefined;
    let plasmaWritten = "";
    let steamTimer: number | undefined;
    let departedAt = Number.NEGATIVE_INFINITY;
    let returnedAt = Number.NEGATIVE_INFINITY;
    let departedCalled = false;
    let returnedCalled = false;
    // Each departure's trails stay where they were burnt, on the desk:
    // `anchor` is where the car stood then; `length` is how far the fire
    // races past the slice, out of view.
    let trails: {
      anchor: Point | undefined;
      departedAt: number;
      length: number;
    }[] = [];
    let landingBoltsThrown = false;
    let flashForksThrown = 0;
    // The room dimmed around the car, 0 to 1, and the layer that dims it.
    let dim = 0;
    let dimLayer: HTMLDivElement | undefined;
    let dimWrapper: HTMLElement | undefined;
    let dimWritten = "";
    // The conduits drawn once at the canvas's density, sharp and hazed.
    let coilSprites:
      | {
          bloom: HTMLCanvasElement;
          halo: HTMLCanvasElement;
          scale: number;
          sharp: HTMLCanvasElement;
        }
      | undefined;
    const pulseCanvas = document.createElement("canvas");
    const pulseContext = pulseCanvas.getContext("2d");
    // The drive: from standing until the tail is through the slice.
    const driveDistance = getDriveDistance(width);
    const rear = width * TRACKS.rear;
    const slice = getSliceTimes(width, rear);
    // Coming back, when the tail is through the exit.
    const emergedMs =
      ARRIVAL.appearMs +
      ARRIVAL.slideMs *
        (1 -
          Math.sqrt(Math.max(0, (ARRIVAL.slidePx - width) / ARRIVAL.slidePx)));
    // The trails the shader drew last, with where they lie now.
    let lastBurning: TripTrails[] = [];
    let shaderDrawn = false;
    let shaderBounds = "";
    // The bolts' light on the body, masked to the car before it is drawn.
    const lightCanvas = document.createElement("canvas");
    const lightContext = lightCanvas.getContext("2d");

    const requestOutline = () => {
      if (outlineRequested) {
        return;
      }
      outlineRequested = true;
      loadOutline(image, width, height)
        .then(async (loaded) => {
          outline = loaded;
          if (!loaded.image || disposed) {
            return;
          }
          const { createTripRenderer } = await import("./trip-renderer");
          if (disposed) {
            return;
          }
          const created = await createTripRenderer(shaderCanvas, loaded.image, {
            front: width * TRACKS.front,
            height,
            rear: width * TRACKS.rear,
            rows: [height * TRACKS.rows[0], height * TRACKS.rows[1]],
            width,
          });
          if (disposed) {
            created.destroy();
            return;
          }
          renderer = created;
          if (tripSeen !== "parked") {
            renderer.prepareSteam(tripSeen !== "departing");
          }
        })
        .catch(() => {
          // No outline or no WebGL2: the bolts still charge, and the car
          // still drives off and comes back, without fire or frost.
        });
    };

    const resize = () => {
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const scale = pixelRatio * 1.5;
      const pixelWidth = Math.round((width + MARGIN * 2) * scale);
      const pixelHeight = Math.round((height + MARGIN * 2) * scale);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(scale, 0, 0, scale, MARGIN * scale, MARGIN * scale);
      lightCanvas.width = Math.round(width * scale);
      lightCanvas.height = Math.round(height * scale);
    };

    // The car's offset along the desk as a curve of time, while it moves.
    const getMotion = (): ((at: number) => number) | undefined => {
      if (tripSeen === "departing") {
        return (at) => getDriveOffset(at - departedAt, driveDistance);
      }
      if (tripSeen === "returning") {
        return (at) => getArrivalOffset(at - returnedAt);
      }
      return undefined;
    };

    // How far the car's streak reaches back, and how much of it the
    // shader draws in place of the DOM car.
    const getBlur = (now: number) => {
      const motion = getMotion();
      const reach = motion
        ? Math.max(
            -MAX_BLUR_PX,
            Math.min(MAX_BLUR_PX, -getVelocity(motion, now) * SHUTTER_MS)
          )
        : 0;
      const share = Math.min(
        1,
        Math.max(
          0,
          (Math.abs(reach) - BLUR_SHARE_PX.from) /
            (BLUR_SHARE_PX.full - BLUR_SHARE_PX.from)
        )
      );
      // Without the shader there is no streak to give way to.
      return { reach, share: renderer ? share : 0 };
    };

    // The DOM car shows unless it has gone through the slice, is away, or
    // has not yet come back through.
    const isDomCarShown = (now: number) => {
      if (tripSeen === "departing") {
        return now - departedAt < slice.goneAt;
      }
      if (tripSeen === "away") {
        return false;
      }
      if (tripSeen === "returning") {
        return now - returnedAt >= ARRIVAL.appearMs;
      }
      return true;
    };

    const addArc = (
      now: number,
      from: Point,
      to: Point,
      life = between(ARC_LIFE_MS)
    ) => {
      const forkAngle = Math.random() * Math.PI * 2;
      const forkLength = 8 + Math.random() * 18;
      arcs.push({
        born: now,
        dark: false,
        forks:
          Math.random() < 0.4
            ? {
                x: Math.cos(forkAngle) * forkLength,
                y: Math.sin(forkAngle) * forkLength,
              }
            : undefined,
        from,
        jaggedAt: Number.NEGATIVE_INFINITY,
        jagMs: between(JAG_MS),
        life,
        path: [],
        to,
        violet: Math.random() < 0.12,
      });
    };

    // The charge crackles on the conduits themselves: short, quick arcs
    // within a few px of them, as far back as it has reached, with sparks
    // glinting on them.
    const spawnCharge = (now: number, dt: number) => {
      arcBudget += getArcRate(level) * dt;
      const reach = getReach(level) * width;
      const reachable =
        arcBudget >= 1 || twinkleBudget >= 1
          ? outline.coils.filter((point) => point.x <= reach)
          : [];
      while (arcBudget >= 1) {
        arcBudget -= 1;
        const from = reachable[Math.floor(Math.random() * reachable.length)];
        if (!from) {
          continue;
        }
        // Prefer arcing along the conduits or body edge rather than
        // shooting stiff twigs straight out into empty air.
        let to: Point | undefined;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const candidate =
            reachable[Math.floor(Math.random() * reachable.length)];
          if (!candidate) {
            continue;
          }
          const dist = Math.hypot(candidate.x - from.x, candidate.y - from.y);
          if (
            dist >= MICRO_ARC.length.min &&
            dist <= MICRO_ARC.length.max * 1.45
          ) {
            to = candidate;
            break;
          }
        }
        if (!to) {
          const length = between(MICRO_ARC.length);
          const signY = from.y < height * 0.5 ? -1 : 1;
          const angle = Math.PI + (Math.random() - 0.5) * 1.1 - signY * 0.25;
          to = {
            x: from.x + Math.cos(angle) * length,
            y: from.y + Math.sin(angle) * length * 0.65,
          };
        }
        addArc(now, from, to, between(MICRO_ARC.life));
      }
      twinkleBudget += (level > 0.12 ? 18 * level : 0) * dt;
      while (twinkleBudget >= 1) {
        twinkleBudget -= 1;
        const point = reachable[Math.floor(Math.random() * reachable.length)];
        if (point) {
          const side = point.y < height * 0.5 ? -1 : 1;
          twinkles.push({
            born: now,
            size: 1.8 + Math.random() * 2.4,
            violet: Math.random() < 0.3,
            vx: -12 - Math.random() * 26,
            vy: side * (4 + Math.random() * 14),
            x: point.x + (Math.random() - 0.5) * 3,
            y: point.y + (Math.random() - 0.5) * 3,
          });
        }
      }
    };

    // Once the attractor singularity ahead has opened (`fedOrb > 0`), the
    // conduits shed plasma motes that it pulls in; the instant the pointer
    // leaves (`!chargingRef.current`), new mote emission stops immediately
    // so no mote is ever left flying into an empty void.
    const spawnMotes = (now: number, dt: number) => {
      const elapsed = now - departedAt;
      const driving = tripSeen === "departing";
      const canEmitParked =
        tripSeen === "parked" && chargingRef.current && fedOrb >= 0.05;
      if (
        (driving && elapsed > slice.noseAt) ||
        !(driving || canEmitParked) ||
        outline.coils.length === 0
      ) {
        moteBudget = 0;
        return;
      }
      const spawnSignal = driving
        ? 1
        : Math.max(0.12, (level - CHARGE_ORB.from) / 0.45);
      moteBudget += getMoteRate(spawnSignal, driving) * dt;
      while (moteBudget >= 1) {
        moteBudget -= 1;
        // Of a few conduit px, the one nearest the body's side: most of
        // the conduits' px are in the band across the back, and motes from
        // its middle crossed the hood as lines instead of sweeping round.
        let from: Point | undefined;
        for (let pick = 0; pick < 3; pick += 1) {
          const coil =
            outline.coils[Math.floor(Math.random() * outline.coils.length)];
          if (
            coil &&
            coil.x >= width * 0.12 &&
            (!from ||
              Math.abs(coil.y - height / 2) > Math.abs(from.y - height / 2))
          ) {
            from = coil;
          }
        }
        if (!from) {
          continue;
        }
        const side = from.y < height * 0.5 ? -1 : 1;
        motes.push({
          born: now,
          bow: side * between(MOTES.bow),
          from,
          life: between(MOTES.life),
          phase: Math.random() * Math.PI * 2,
          scale: 0.85 + Math.random() * 0.35,
          toOffset: {
            x: (Math.random() - 0.5) * 9,
            y: side * (1.5 + Math.random() * 6) + (Math.random() - 0.5) * 5,
          },
          violet: Math.random() < MOTE_LOOK.violetShare,
        });
      }
    };

    // White-hot core in a thin blue edge, thick at its root and fine at its
    // tip; a few bolts run violet, as in the film. The edge is a wider
    // ribbon, not shadow blur: blurring each bolt halved the frame rate at
    // full charge.
    // Pulls the points of a bolt along the body that bow out over the bare
    // desk back towards its chord: loose loops read as jump ropes. Bolts
    // leaping ahead of the nose start off the body and are left alone.
    const isOnBody = (point: Point) => {
      const x = Math.round(point.x);
      const y = Math.round(point.y);
      return (
        x >= 0 &&
        y >= 0 &&
        x < width &&
        y < height &&
        (outline.alpha?.[y * width + x] ?? 0) >= 128
      );
    };

    const hugBody = (path: Point[]) => {
      const [first] = path;
      const end = path.at(-1);
      if (!(outline.alpha && first && end && isOnBody(end))) {
        return path;
      }
      return path.map((point, index) => {
        if (isOnBody(point)) {
          return point;
        }
        const t = index / Math.max(1, path.length - 1);
        const chord = {
          x: first.x + (end.x - first.x) * t,
          y: first.y + (end.y - first.y) * t,
        };
        return {
          x: chord.x + (point.x - chord.x) * 0.25,
          y: chord.y + (point.y - chord.y) * 0.25,
        };
      });
    };

    const fillAura = (
      target: CanvasRenderingContext2D,
      layers: readonly (readonly [number, number])[],
      path: Point[],
      alpha: number,
      aura: string
    ) => {
      for (const [widthScale, opacity] of layers) {
        traceRibbon(
          target,
          path,
          BOLT_WIDTH.root * widthScale,
          BOLT_WIDTH.tip * widthScale
        );
        target.fillStyle = `rgba(${aura}, ${opacity * alpha})`;
        target.fill();
      }
    };

    const fillBolt = (
      path: Point[],
      alpha: number,
      rootWidth: number,
      tipWidth: number,
      aura: string
    ) => {
      fillAura(context, AURA, path, alpha, aura);
      traceRibbon(context, path, rootWidth, tipWidth);
      context.fillStyle = `rgba(250, 252, 255, ${alpha})`;
      context.fill();
    };

    const drawArc = (arc: Arc, now: number) => {
      const fade = 1 - (now - arc.born) / arc.life;
      // Bolts hold a path for a few frames, then jump to a new one, and
      // flicker in brightness between.
      if (now - arc.jaggedAt >= arc.jagMs) {
        arc.jaggedAt = now;
        arc.dark =
          !arc.dark && arc.path.length > 0 && Math.random() < STROBE.chance;
        arc.jagMs = arc.dark ? between(STROBE) : between(JAG_MS);
        if (arc.dark) {
          return;
        }
        // Fine at every scale: long straight stretches read as wire.
        arc.path = hugBody(makeArc(arc.from, arc.to, Math.random, 0.36, 5));
        const fork = arc.path[Math.floor(arc.path.length / 2)];
        arc.forkPath =
          fork && arc.forks
            ? makeArc(
                fork,
                { x: fork.x + arc.forks.x, y: fork.y + arc.forks.y },
                Math.random,
                0.3,
                4
              )
            : undefined;
      }
      if (arc.dark) {
        return;
      }
      // Bright until late in its life, then gone.
      const alpha = Math.sqrt(fade) * (0.8 + Math.random() * 0.2);
      const aura = arc.violet ? AURA_RGB.violet : AURA_RGB.blue;
      context.save();
      context.globalCompositeOperation = "lighter";
      fillBolt(arc.path, alpha, BOLT_WIDTH.root, BOLT_WIDTH.tip, aura);
      if (arc.forkPath) {
        // A branch leaves the bolt as wide as the bolt is there.
        const middle = (BOLT_WIDTH.root + BOLT_WIDTH.tip) / 2;
        fillBolt(arc.forkPath, alpha * 0.78, middle, BOLT_WIDTH.tip, aura);
      }
      context.restore();
    };

    // The conduits, drawn once at the canvas's density: a crisp white-hot
    // core in an electric cyan-blue neon haze.
    const getCoilSprites = () => {
      const scale = pixelRatio * 1.5;
      if (coilSprites?.scale === scale || outline.coils.length === 0) {
        return coilSprites;
      }
      const sharp = document.createElement("canvas");
      const halo = document.createElement("canvas");
      const bloom = document.createElement("canvas");
      sharp.width = Math.round(width * scale);
      sharp.height = Math.round(height * scale);
      for (const sprite of [halo, bloom]) {
        sprite.width = sharp.width;
        sprite.height = sharp.height;
      }
      const sharpContext = sharp.getContext("2d");
      const haloContext = halo.getContext("2d");
      const bloomContext = bloom.getContext("2d");
      if (!(sharpContext && haloContext && bloomContext)) {
        return;
      }
      sharpContext.setTransform(scale, 0, 0, scale, 0, 0);
      sharpContext.fillStyle = "rgb(252, 254, 255)";
      for (const coil of outline.coils) {
        sharpContext.beginPath();
        sharpContext.arc(coil.x, coil.y, 0.52, 0, Math.PI * 2);
        sharpContext.fill();
      }
      haloContext.shadowColor = "rgb(55, 195, 255)";
      haloContext.shadowBlur = COIL_GLOW.blur * 2 * scale;
      haloContext.shadowOffsetX = sharp.width;
      for (let pass = 0; pass < 2; pass += 1) {
        haloContext.drawImage(sharp, -sharp.width, 0);
      }
      bloomContext.shadowColor = "rgb(30, 135, 255)";
      bloomContext.shadowBlur = COIL_GLOW.bloom * 2 * scale;
      bloomContext.shadowOffsetX = sharp.width;
      for (let pass = 0; pass < 2; pass += 1) {
        bloomContext.drawImage(halo, -sharp.width, 0);
      }
      pulseCanvas.width = sharp.width;
      pulseCanvas.height = sharp.height;
      coilSprites = { bloom, halo, scale, sharp };
      return coilSprites;
    };

    // The conduits light up with the charge, as far as the bolts reach, with
    // pulses of light running along them: back from the nose as it charges,
    // and forward, faster and faster, as it drives off and pours its charge
    // into the light ahead of it.
    const drawCoils = (now: number) => {
      const sprites = getCoilSprites();
      if (level <= 0 || !sprites || !pulseContext) {
        return;
      }
      const departing = tripSeen === "departing";
      const drive = departing
        ? Math.min(
            1,
            Math.max(
              0,
              (now - departedAt - DEPARTURE.driveFromMs) /
                (slice.noseAt - DEPARTURE.driveFromMs)
            )
          )
        : 0;
      const reach = departing ? width : getReach(level) * width;
      context.save();
      context.beginPath();
      context.rect(-MARGIN, -MARGIN, reach + MARGIN, height + MARGIN * 2);
      context.clip();
      context.globalCompositeOperation = "lighter";
      context.globalAlpha = Math.min(1, level) * (0.55 + 0.35 * drive);
      context.drawImage(sprites.bloom, 0, 0, width, height);
      context.globalAlpha = Math.min(1, level) * (0.85 + 0.15 * drive);
      context.drawImage(sprites.halo, 0, 0, width, height);
      // Pulses px a ms: back along the car, or forward at speed.
      const speed = departing ? -(0.28 + 0.75 * drive) : 0.14;
      const gap = COIL_GLOW.pulseGap * (departing ? 1 - 0.4 * drive : 1);
      const phase = (((now * speed) % gap) + gap) % gap;
      pulseContext.setTransform(sprites.scale, 0, 0, sprites.scale, 0, 0);
      pulseContext.globalCompositeOperation = "source-over";
      pulseContext.clearRect(0, 0, width, height);
      for (let x = phase - gap; x < width + gap; x += gap) {
        const band = pulseContext.createLinearGradient(x - 14, 0, x + 14, 0);
        band.addColorStop(0, "rgba(255, 255, 255, 0)");
        band.addColorStop(0.5, "rgba(255, 255, 255, 1)");
        band.addColorStop(1, "rgba(255, 255, 255, 0)");
        pulseContext.fillStyle = band;
        pulseContext.fillRect(x - 14, 0, 28, height);
      }
      pulseContext.globalCompositeOperation = "destination-in";
      pulseContext.drawImage(sprites.halo, 0, 0, width, height);
      context.globalAlpha = Math.min(1, level);
      context.drawImage(pulseCanvas, 0, 0, width, height);
      // White-hot tube core, added so it blazes over the blue bloom.
      context.globalAlpha = Math.min(1, level) * (0.88 + 0.12 * drive);
      context.drawImage(sprites.sharp, 0, 0, width, height);
      context.restore();
    };

    // The bumper's front edge: the first opaque px of each row, from the
    // left, where that is at the very front of the car.
    const getBumper = () => {
      if (bumper || !outline.alpha) {
        return bumper;
      }
      const edge: Point[] = [];
      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width * 0.06; x += 1) {
          if ((outline.alpha[y * width + x] ?? 0) >= 128) {
            edge.push({ x: x + 1.2, y });
            break;
          }
        }
      }
      // The nose's rounded corners curve away; keep the face.
      const front = Math.min(...edge.map((point) => point.x));
      bumper = edge.filter((point) => point.x <= front + 2.5);
      return bumper;
    };

    const getBumperGlow = (now: number) => {
      const driving =
        tripSeen === "departing" && now - departedAt < slice.goneAt;
      const base = getBumperLevel(level, driving);
      if (base <= 0) {
        return 0;
      }
      if (driving) {
        const run = (now - departedAt) / slice.noseAt;
        return (
          Math.min(1, 0.6 + (run / 0.35) * 0.4) * (0.9 + Math.random() * 0.2)
        );
      }
      return base * (0.78 + 0.12 * Math.sin(now / 41) + Math.random() * 0.1);
    };

    // The front bumper's emitter bar blazes white in a soft electric-blue bloom.
    const drawBumper = (now: number) => {
      const edge = getBumper();
      const burn = getBumperGlow(now);
      if (!edge || edge.length < 2 || burn <= 0.01) {
        return;
      }
      const [first] = edge;
      const lastPt = edge.at(-1);
      context.save();
      context.globalCompositeOperation = "lighter";
      if (first && lastPt) {
        const midX = (first.x + lastPt.x) / 2;
        const midY = (first.y + lastPt.y) / 2;
        const spanY = Math.max(18, Math.abs(lastPt.y - first.y) * 0.65);
        context.save();
        context.translate(midX, midY);
        context.scale(0.55, 1);
        const halo = context.createRadialGradient(0, 0, 0, 0, 0, spanY);
        halo.addColorStop(0, `rgba(110, 205, 255, ${0.42 * burn})`);
        halo.addColorStop(0.35, `rgba(50, 150, 255, ${0.22 * burn})`);
        halo.addColorStop(0.7, `rgba(35, 120, 255, ${0.07 * burn})`);
        halo.addColorStop(1, "rgba(35, 120, 255, 0)");
        context.fillStyle = halo;
        context.beginPath();
        context.arc(0, 0, spanY, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
      context.lineCap = "round";
      context.lineJoin = "round";
      context.beginPath();
      for (const [index, point] of edge.entries()) {
        if (index === 0) {
          context.moveTo(point.x, point.y);
        } else {
          context.lineTo(point.x, point.y);
        }
      }
      for (const layer of BUMPER.layers) {
        context.lineWidth = layer.width * (0.8 + 0.2 * burn);
        context.strokeStyle = `rgba(${layer.rgb}, ${Math.min(1, layer.opacity * burn)})`;
        context.stroke();
      }
      context.restore();
    };

    // Strokes a curved sub-segment of `points` from the head (`0`) to
    // `reach` (`0..1`) using native round caps and joins so tight curves
    // never self-intersect or notch.
    const strokeStreamSegment = (points: Point[], reach: number) => {
      const count = Math.max(2, Math.round(points.length * reach));
      context.beginPath();
      for (let idx = 0; idx < count; idx += 1) {
        const pt = points[idx];
        if (!pt) {
          continue;
        }
        if (idx === 0) {
          context.moveTo(pt.x, pt.y);
        } else {
          context.lineTo(pt.x, pt.y);
        }
      }
      context.stroke();
    };

    // Lush, full-bodied plasma light streams that curve off the coils and
    // pour into the boiling radiance ahead. Stacking progressive round-capped
    // sub-strokes from the head along the curved trajectory gives true
    // arc-length brightness falloff and a thick, smooth cometary tail with
    // zero chord-gradient distortion or self-intersection cusps.
    const drawMotes = (now: number, offset: number) => {
      const rift = getRift(now);
      const parkedLead = DEPARTURE.orbLeadPx * CHARGE_ORB.lead;
      const focalX = tripSeen === "parked" ? -parkedLead : rift.x;
      const baseTo = { x: focalX - offset, y: height * ORB_Y };
      context.save();
      context.globalCompositeOperation = "lighter";
      context.lineCap = "round";
      context.lineJoin = "round";
      const sampleSteps = 28;
      for (const mote of motes) {
        const t = (now - mote.born) / mote.life;
        const to = {
          x: baseTo.x + mote.toOffset.x,
          y: baseTo.y + mote.toOffset.y,
        };
        const tHead = Math.min(1, t * 1.06);
        const absorb = Math.max(0, (t - 0.8) / 0.2);
        const targetLenPx =
          (15 + 11 * Math.sin(Math.min(1, t) * Math.PI)) *
          mote.scale *
          (1 - 0.7 * absorb);

        const tail: Point[] = [];
        let accLen = 0;
        for (let stepIdx = 0; stepIdx <= sampleSteps; stepIdx += 1) {
          const tAt = Math.max(0, tHead - (stepIdx / sampleSteps) * 0.36);
          const pt = getMotePoint(mote.from, to, mote.bow, tAt);
          const prev = tail.at(-1);
          if (prev) {
            const seg = Math.hypot(pt.x - prev.x, pt.y - prev.y);
            if (seg < 0.2) {
              continue;
            }
            if (accLen + seg >= targetLenPx) {
              const remain = (targetLenPx - accLen) / seg;
              tail.push({
                x: prev.x + (pt.x - prev.x) * remain,
                y: prev.y + (pt.y - prev.y) * remain,
              });
              accLen = targetLenPx;
              break;
            }
            accLen += seg;
          }
          tail.push(pt);
        }

        const [head, behind] = tail;
        if (!(head && behind && accLen > 2.5)) {
          continue;
        }
        const distToCore = Math.hypot(head.x - baseTo.x, head.y - baseTo.y);
        const coreMerge = Math.min(1, Math.max(0.16, (distToCore - 4) / 22));
        const alpha =
          Math.min(1, t / 0.1) *
          (1 - Math.max(0, (t - 0.82) / 0.18)) *
          coreMerge;
        if (alpha <= 0.01) {
          continue;
        }
        const sheath = mote.violet
          ? MOTE_LOOK.sheath.violet
          : MOTE_LOOK.sheath.blue;
        const innerTint = mote.violet
          ? MOTE_LOOK.sheath.violetCore
          : MOTE_LOOK.sheath.blueCore;

        const taperCount = MOTE_LOOK.steps;
        for (const [layerIndex, layer] of MOTE_LOOK.layers.entries()) {
          const isInnermost = layerIndex === MOTE_LOOK.layers.length - 1;
          const stepAlpha = (layer.opacity * alpha) / taperCount;
          if (stepAlpha <= 0.002) {
            continue;
          }
          for (let step = 1; step <= taperCount; step += 1) {
            const reach = step / taperCount;
            const widthShare =
              1 - 0.58 * ((step - 1) / (taperCount - 1)) ** 1.05;
            let rgb: string = sheath;
            if (isInnermost) {
              rgb = step <= 5 ? "255, 255, 255" : innerTint;
            } else if (layer.core) {
              rgb = step <= 4 ? innerTint : sheath;
            }
            context.strokeStyle = `rgba(${rgb}, ${stepAlpha.toFixed(4)})`;
            context.lineWidth = layer.width * widthShare * mote.scale;
            strokeStreamSegment(tail, reach);
          }
        }
      }
      context.restore();
    };

    // The cyan light the bolts throw on the car's body, masked to its
    // silhouette, so the steel and glass under a bolt light up.
    const drawBodyLight = (now: number, offset: number) => {
      const photo = outline.image;
      const rift = getRift(now);
      const riftLight = Math.max(rift.open, rift.heat, rift.orb * 0.85);
      const { heads } = getLampLevels(now);
      const bumperGlow = getBumperGlow(now);
      if (
        !(
          photo &&
          lightContext &&
          (arcs.length > 0 || riftLight > 0 || heads > 0.01 || bumperGlow > 0)
        )
      ) {
        return;
      }
      const scale = pixelRatio * 1.5;
      lightContext.setTransform(scale, 0, 0, scale, 0, 0);
      lightContext.globalCompositeOperation = "source-over";
      lightContext.clearRect(0, 0, width, height);
      if (riftLight > 0 && lightMaps) {
        drawRiftLight(lightMaps, rift, offset);
      } else if (riftLight > 0) {
        // The slice floods the near end of the car with cold white light.
        const x = rift.x - offset;
        const y = height * ORB_Y;
        const reach = SLICE_LIGHT.radius;
        const gradient = lightContext.createRadialGradient(
          x,
          y,
          0,
          x,
          y,
          reach
        );
        const strength = SLICE_LIGHT.opacity * riftLight;
        gradient.addColorStop(0, `rgba(235, 250, 255, ${strength})`);
        gradient.addColorStop(0.4, `rgba(120, 215, 255, ${strength * 0.55})`);
        gradient.addColorStop(1, "rgba(120, 215, 255, 0)");
        lightContext.fillStyle = gradient;
        lightContext.fillRect(x - reach, y - reach, reach * 2, reach * 2);
      }
      // The bumper's bar lights the hood's leading edge behind it.
      const edge = getBumper();
      if (bumperGlow > 0 && edge?.[0]) {
        const front = edge[0].x;
        const wash = lightContext.createLinearGradient(
          front,
          0,
          front + BUMPER.hood,
          0
        );
        wash.addColorStop(0, `rgba(190, 235, 255, ${0.6 * bumperGlow})`);
        wash.addColorStop(0.3, `rgba(120, 205, 255, ${0.22 * bumperGlow})`);
        wash.addColorStop(1, "rgba(120, 205, 255, 0)");
        lightContext.fillStyle = wash;
        lightContext.fillRect(front - 2, 0, BUMPER.hood + 2, height);
      }
      // The headlights light the nose and bumper around them.
      if (heads > 0.01) {
        for (const lamp of LAMPS.heads) {
          const x = lamp.x * width;
          const y = lamp.y * height;
          const spill = lightContext.createRadialGradient(
            x,
            y,
            0,
            x,
            y,
            LAMPS.spill
          );
          spill.addColorStop(0, `rgba(255, 244, 220, ${0.55 * heads})`);
          spill.addColorStop(0.3, `rgba(255, 238, 205, ${0.2 * heads})`);
          spill.addColorStop(1, "rgba(255, 238, 205, 0)");
          lightContext.fillStyle = spill;
          lightContext.fillRect(
            x - LAMPS.spill,
            y - LAMPS.spill,
            LAMPS.spill * 2,
            LAMPS.spill * 2
          );
        }
      }
      for (const arc of arcs) {
        if (arc.dark || arc.path.length === 0) {
          continue;
        }
        const fade = Math.sqrt(1 - (now - arc.born) / arc.life);
        const x = (arc.from.x + arc.to.x) / 2;
        const y = (arc.from.y + arc.to.y) / 2;
        const radius =
          BODY_LIGHT.radius +
          Math.hypot(arc.to.x - arc.from.x, arc.to.y - arc.from.y) / 3;
        const gradient = lightContext.createRadialGradient(
          x,
          y,
          0,
          x,
          y,
          radius
        );
        const rgb = arc.violet ? "190, 175, 255" : "170, 225, 255";
        gradient.addColorStop(0, `rgba(${rgb}, ${BODY_LIGHT.opacity * fade})`);
        gradient.addColorStop(1, `rgba(${rgb}, 0)`);
        lightContext.fillStyle = gradient;
        lightContext.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        fillAura(
          lightContext,
          AURA_BODY,
          arc.path,
          fade,
          arc.violet ? AURA_RGB.violet : AURA_RGB.blue
        );
        if (arc.forkPath) {
          fillAura(
            lightContext,
            AURA_BODY,
            arc.forkPath,
            fade * 0.8,
            arc.violet ? AURA_RGB.violet : AURA_RGB.blue
          );
        }
      }
      if (lightMaps) {
        drawRimLight(lightMaps, now);
      }
      lightContext.globalCompositeOperation = "destination-in";
      lightContext.drawImage(photo, 0, 0, width, height);
      context.drawImage(lightCanvas, 0, 0, width, height);
    };

    const drawMaps = (
      maps: HTMLCanvasElement[],
      first: number,
      shares: LightShare[],
      strength: number
    ) => {
      if (!lightContext) {
        return;
      }
      for (const [index, weight] of shares) {
        const map = maps[first + index];
        const alpha = Math.min(1, strength * weight);
        if (map && alpha > 0.004) {
          lightContext.globalAlpha = alpha;
          lightContext.drawImage(map, 0, 0, width, height);
        }
      }
      lightContext.globalAlpha = 1;
    };

    // The ball of light, the slice or the exit lights the body from where
    // it stands, as the model's own surfaces catch it.
    const drawRiftLight = (
      maps: HTMLCanvasElement[],
      rift: ReturnType<typeof getRift>,
      offset: number
    ) => {
      const carPx = CAR_LIGHT.metres * CAR_LIGHT.pxPerMetre;
      const nose = (width - carPx) / 2;
      const at = rift.x - offset;
      const flicker = 0.9 + Math.random() * 0.1;
      if (tripSeen === "returning") {
        const strength = Math.max(rift.heat, rift.open);
        drawMaps(
          maps,
          CAR_LIGHT_TILES.exit,
          getCutBlend(CAR_LIGHT.exitAt, (at - nose) / carPx, false),
          strength * CAR_LIGHT_GAIN.slice * flicker
        );
        return;
      }
      if (at <= nose) {
        const strength = Math.min(1, rift.orb * 1.6 + rift.open);
        drawMaps(
          maps,
          CAR_LIGHT_TILES.orb,
          getLightBlend(CAR_LIGHT.orbAhead, (nose - at) / CAR_LIGHT.pxPerMetre),
          strength * CAR_LIGHT_GAIN.orb * flicker
        );
        return;
      }
      const strength = Math.max(rift.heat, rift.open, rift.orb);
      drawMaps(
        maps,
        CAR_LIGHT_TILES.slice,
        getCutBlend(CAR_LIGHT.sliceAt, (at - nose) / carPx, true),
        strength * CAR_LIGHT_GAIN.slice * flicker
      );
    };

    // The bolts over the body catch its edges, front or back, as they are.
    const drawRimLight = (maps: HTMLCanvasElement[], now: number) => {
      let front = 0;
      let back = 0;
      for (const arc of arcs) {
        if (arc.dark) {
          continue;
        }
        const fade = Math.sqrt(Math.max(0, 1 - (now - arc.born) / arc.life));
        if ((arc.from.x + arc.to.x) / 2 < width / 2) {
          front += fade;
        } else {
          back += fade;
        }
      }
      drawMaps(
        maps,
        CAR_LIGHT_TILES.rimFront,
        [[0, Math.min(1, front / RIM_BOLTS)]],
        CAR_LIGHT_GAIN.rim
      );
      drawMaps(
        maps,
        CAR_LIGHT_TILES.rimRear,
        [[0, Math.min(1, back / RIM_BOLTS)]],
        CAR_LIGHT_GAIN.rim
      );
    };

    // A drifting plasma spark: a white-hot pinpoint in a cyan or violet
    // micro-bloom, floating off the coils.
    const drawTwinkle = (twinkle: Twinkle, now: number) => {
      const elapsed = (now - twinkle.born) / 1000;
      const t = (now - twinkle.born) / TWINKLE_LIFE_MS;
      const strength = Math.sin(Math.PI * t);
      const size = twinkle.size * (0.45 + 0.65 * strength);
      const x = twinkle.x + twinkle.vx * elapsed;
      const y = twinkle.y + twinkle.vy * elapsed;
      const tint = twinkle.violet ? "195, 105, 255" : "55, 190, 255";
      context.save();
      context.globalCompositeOperation = "lighter";
      const bloom = context.createRadialGradient(x, y, 0, x, y, size * 1.6);
      bloom.addColorStop(0, `rgba(255, 255, 255, ${0.98 * strength})`);
      bloom.addColorStop(0.28, `rgba(225, 248, 255, ${0.75 * strength})`);
      bloom.addColorStop(0.58, `rgba(${tint}, ${0.38 * strength})`);
      bloom.addColorStop(1, `rgba(${tint}, 0)`);
      context.fillStyle = bloom;
      context.fillRect(x - size * 1.6, y - size * 1.6, size * 3.2, size * 3.2);
      context.restore();
    };

    // The conical energy funnel and branching lightning filaments bridging
    // the blazing front bumper and the focal orb (then the slice), topped
    // by an additive white-hot focal flare at the convergence apex.
    const drawSliceBolts = (now: number, offset: number) => {
      const elapsed = now - departedAt;
      const rift = getRift(now);
      if (
        tripSeen !== "departing" ||
        rift.orb < 0.04 ||
        elapsed > slice.noseAt
      ) {
        return;
      }
      const edge = getBumper();
      if (!edge || edge.length === 0) {
        return;
      }
      const target = { x: rift.x - offset, y: height * ORB_Y };
      const { open } = rift;
      const strength = Math.min(1, rift.orb * 1.55 + open);
      context.save();
      context.globalCompositeOperation = "lighter";

      // Subtle filaments from the bumper into the outer confluence rim
      // (three faint ones, ending before the white heart so they never
      // scribble colored lines across the overexposed core).
      SLICE_BOLTS.forEach((share, index) => {
        let bolt = sliceBolts[index];
        if (!bolt || now - bolt.jaggedAt >= bolt.jagMs) {
          const shape = makeArc(
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            Math.random,
            0.22,
            4
          );
          bolt = {
            endX: 8 + Math.random() * 12,
            forkAt: 0,
            forkOffset: { x: 0, y: 0 },
            jaggedAt: now,
            jagMs: between(SLICE_JAG_MS),
            shape,
            spread: (Math.random() - 0.5) * (16 + 26 * open),
          };
          sliceBolts[index] = bolt;
        }
        const from = edge[Math.round(share * (edge.length - 1))] as Point;
        const to = {
          x: target.x + bolt.endX,
          y: target.y + bolt.spread,
        };
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        if (dx > -4) {
          return;
        }
        const path = bolt.shape.map((point) => ({
          x: from.x + dx * point.x - dy * point.y,
          y: from.y + dy * point.x + dx * point.y,
        }));
        const alpha = (0.22 + Math.random() * 0.14) * strength;
        const isViolet = index === 1;
        fillAura(
          context,
          AURA,
          path,
          alpha,
          isViolet ? AURA_RGB.magenta : AURA_RGB.blue
        );
        traceRibbon(context, path, 0.7 * strength, 0.25);
        context.fillStyle = `rgba(250, 253, 255, ${0.75 * alpha})`;
        context.fill();
      });

      context.restore();
    };

    // A soft oval of light on the desk, brightest towards `toward` (+1 its
    // right end, -1 its left), as a lamp's pool falls off away from it.
    // How bright the lamps are now: headlights on as it charges and drives
    // off and as it lands, tail lights glowing, brake lights bright as it
    // skids in; then off.
    const getLampLevels = (now: number) => {
      if (tripSeen === "departing" && isDomCarShown(now)) {
        return { heads: 1, tails: 0.6 };
      }
      if (tripSeen === "returning") {
        const landed = now - returnedAt - ARRIVAL.appearMs;
        const off = landed - ARRIVAL.slideMs - 1500;
        const on = landed < 0 ? 0 : 1 - Math.min(1, Math.max(0, off / 600));
        return { heads: on, tails: landed < ARRIVAL.slideMs ? 1 : on * 0.6 };
      }
      return { heads: level * 0.8, tails: level * 0.5 };
    };

    // A lamp as a source of light, not a shape: a white-hot filament in its
    // lens, a tight bloom and a faint wide one, every stop following an
    // inverse-square falloff. Pools thrown on the daylit desk could only
    // tint it and read as flat cut-outs; the light it throws on the car's
    // own nose is in `drawBodyLight`.
    const drawLens = (x: number, y: number, rgb: string, strength: number) => {
      for (const { radius, opacity } of LAMPS.bloom) {
        const bloom = context.createRadialGradient(x, y, 0, x, y, radius);
        for (const share of [0, 0.15, 0.35, 0.6, 1]) {
          const falloff = 1 / (1 + (share * 6) ** 2) - share * 0.027;
          bloom.addColorStop(
            share,
            `rgba(${rgb}, ${Math.max(0, opacity * strength * falloff).toFixed(4)})`
          );
        }
        context.fillStyle = bloom;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      const core = context.createRadialGradient(x, y, 0, x, y, 2.6);
      core.addColorStop(0, `rgba(255, 255, 255, ${strength})`);
      core.addColorStop(0.5, `rgba(255, 255, 250, ${0.85 * strength})`);
      core.addColorStop(1, "rgba(255, 255, 250, 0)");
      context.save();
      context.translate(x, y);
      context.scale(0.6, 1);
      context.translate(-x, -y);
      context.fillStyle = core;
      context.fillRect(x - 3, y - 3, 6, 6);
      context.restore();
    };

    const drawLamps = (now: number) => {
      const { heads, tails } = getLampLevels(now);
      if (heads <= 0.01 && tails <= 0.01) {
        return;
      }
      for (const lamp of LAMPS.heads) {
        drawLens(lamp.x * width, lamp.y * height, "255, 240, 205", heads);
      }
      for (const lamp of LAMPS.tails) {
        drawLens(lamp.x * width, lamp.y * height, "255, 45, 35", tails * 0.8);
      }
    };

    // Each arrival flash throws jagged forks out of its middle.
    const throwFlashForks = (now: number, offset: number) => {
      const since = now - returnedAt;
      ARRIVAL.flashesMs.forEach((at, index) => {
        const forks = FLASH_FORKS[index];
        if (!forks || since < at || flashForksThrown > index) {
          return;
        }
        flashForksThrown = index + 1;
        const middle = { x: ARRIVAL.slidePx - offset, y: height * 0.56 };
        for (let fork = 0; fork < forks.count; fork += 1) {
          const angle = Math.random() * Math.PI * 2;
          const reach = forks.reach * (0.6 + Math.random() * 0.4);
          addArc(
            now,
            middle,
            {
              x: middle.x + Math.cos(angle) * reach,
              y: middle.y + Math.sin(angle) * reach * 0.7,
            },
            60 + Math.random() * 40
          );
        }
      });
    };

    // The slice now: where it stands, local px, how far open, ms since it
    // snapped shut (-1 for none), and how hot the car's cut edge glows.
    const getRift = (now: number) => {
      if (tripSeen === "departing") {
        const elapsed = now - departedAt;
        const open =
          elapsed >= slice.opensAt && elapsed < slice.goneAt
            ? Math.min(1, (elapsed - slice.opensAt) / SLICE_OPEN_MS)
            : 0;
        const since = elapsed - slice.goneAt;
        // The ball of light rides ahead of the nose until it opens.
        const orb = getOrb(elapsed, width, rear, chargedOrb);
        return {
          heat: elapsed >= slice.noseAt && elapsed < slice.goneAt ? 1 : 0,
          open,
          orb: elapsed < slice.goneAt ? orb.size : 0,
          since: since >= 0 && since < SNAP_FLASH_MS ? since : -1,
          x: orb.x,
        };
      }
      if (tripSeen === "returning") {
        const since = now - returnedAt;
        const [, , lastFlash = 0] = ARRIVAL.flashesMs;
        const open =
          since >= lastFlash
            ? Math.min(1, (since - lastFlash) / SLICE_OPEN_MS) *
              (1 - Math.min(1, Math.max(0, (since - emergedMs) / 90)))
            : 0;
        return {
          heat:
            since >= ARRIVAL.appearMs && since < emergedMs
              ? 1
              : Math.max(0, 1 - (since - emergedMs) / 90),
          open,
          orb: 0,
          since: -1,
          x: ARRIVAL.slidePx,
        };
      }
      if (tripSeen === "parked") {
        // Opens first as a small attractor seed, then grows continuously
        // with each absorbed mote and stays alive until the last in-flight
        // mote is swallowed.
        const lead = DEPARTURE.orbLeadPx * CHARGE_ORB.lead;
        const size =
          fedOrb > 0 ? Math.min(1.25, fedOrb + impactSurge * 0.12) : 0;
        return { heat: 0, open: 0, orb: size, since: -1, x: -lead };
      }
      return { heat: 0, open: 0, orb: 0, since: -1, x: 0 };
    };

    // The plasma's pulse: its flicker, swelling as motes slam into it.
    const getPulse = () => plasmaFlicker * (1 + 0.2 * impactSurge);

    const stepFlicker = (now: number, dt: number) => {
      if (now >= plasmaFlickerNext) {
        const { holdMs, max, min } = PLASMA_FLICKER;
        plasmaFlickerTarget = min + Math.random() * (max - min);
        plasmaFlickerNext =
          now + holdMs.min + Math.random() * (holdMs.max - holdMs.min);
      }
      plasmaFlicker +=
        (plasmaFlickerTarget - plasmaFlicker) *
        (1 - Math.exp(-dt / PLASMA_FLICKER.easeSeconds));
    };

    // How strong the plasma is now, 0 to 1, and where along the car's x it
    // stands, local px: the light gathering ahead of the nose, the slice and
    // its snap, and the arrival's flashes.
    const getPlasma = (now: number) => {
      const rift = getRift(now);
      if (tripSeen === "parked" || tripSeen === "departing") {
        const snap = rift.since >= 0 ? Math.max(0, 1 - rift.since / 260) : 0;
        return {
          energy: Math.max(Math.min(1, rift.orb), rift.open, snap),
          x: rift.x,
        };
      }
      if (tripSeen === "returning") {
        const since = now - returnedAt;
        let flash = 0;
        ARRIVAL.flashesMs.forEach((at, index) => {
          if (since >= at) {
            flash = Math.max(
              flash,
              (0.55 + 0.25 * index) * Math.exp(-(since - at) / 110)
            );
          }
        });
        return { energy: Math.max(flash, rift.open), x: ARRIVAL.slidePx };
      }
      return { energy: 0, x: 0 };
    };

    const removePlasmaLayer = () => {
      plasmaLayer?.remove();
      plasmaLayer = undefined;
      plasmaWritten = "";
    };

    // The plasma's light on the desk round it, with its pulse.
    const writePlasmaLight = (now: number) => {
      const plasma =
        reducedMotion || obscuredRef.current
          ? { energy: 0, x: 0 }
          : getPlasma(now);
      const pulse = getPulse();
      plasmaLight = plasma.energy * pulse;
      plasmaShift = (plasma.x - width / 2) * Math.min(1, plasma.energy * 3);
      const button = bodyRef.current?.parentElement;
      const host = button?.closest<HTMLElement>(
        ".canvas-entrance-item"
      )?.parentElement;
      if (obscuredRef.current || plasmaLight < 0.01 || !(button && host)) {
        removePlasmaLayer();
        setLampFlare(null);
        return;
      }
      const rect = button.getBoundingClientRect();
      const zoom = rect.width / width;
      if (!(zoom > 0)) {
        return;
      }
      setLampFlare({
        brightness: plasma.energy ** PLASMA_LAMP.curve * pulse,
        weight: PLASMA_LAMP.weight * plasma.energy ** PLASMA_LAMP.curve,
        x: rect.left + plasma.x * zoom,
        y: rect.top + height * ORB_Y * zoom,
      });
      if (!plasmaLayer) {
        const { radiusPx } = PLASMA_LIGHT;
        plasmaLayer = document.createElement("div");
        plasmaLayer.setAttribute("aria-hidden", "true");
        Object.assign(plasmaLayer.style, {
          background: PLASMA_LIGHT.gradient,
          height: `${radiusPx * 2}px`,
          left: "0",
          opacity: "0",
          pointerEvents: "none",
          position: "absolute",
          top: "0",
          width: `${radiusPx * 2}px`,
          willChange: "transform, opacity",
          // Over the room's dim, under the travelling car (100000).
          zIndex: "99999",
        });
        host.append(plasmaLayer);
      }
      const { radiusPx } = PLASMA_LIGHT;
      // In the canvas's own px, so it rides with the camera.
      const hostRect = host.getBoundingClientRect();
      const x = (rect.left - hostRect.left) / zoom + plasma.x - radiusPx;
      const y = (rect.top - hostRect.top) / zoom + height * ORB_Y - radiusPx;
      const opacity = Math.min(1, plasmaLight * PLASMA_LIGHT.opacity).toFixed(
        3
      );
      const transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      const written = `${opacity} ${transform}`;
      if (written !== plasmaWritten) {
        plasmaLayer.style.opacity = opacity;
        plasmaLayer.style.transform = transform;
        plasmaWritten = written;
      }
    };

    // The car shows only between these x, local px.
    const getClip = () => {
      if (tripSeen === "departing") {
        return { from: -DEPARTURE.slicePx, to: Number.MAX_SAFE_INTEGER };
      }
      if (tripSeen === "returning") {
        return { from: Number.MIN_SAFE_INTEGER, to: ARRIVAL.slidePx };
      }
      return { from: Number.MIN_SAFE_INTEGER, to: Number.MAX_SAFE_INTEGER };
    };

    // What the shader draws now, or undefined when it has nothing to draw.
    const getTripFrame = (
      now: number,
      offset: number
    ): TripFrame | undefined => {
      lastBurning = [];
      const live = trails.filter(
        (trail) => now - trail.departedAt < getTrailsOutMs(trail.length)
      );
      const here = live.length > 0 ? measureDeskPoint() : undefined;
      const burning: TripTrails[] = live.map((trail) => ({
        elapsed: now - trail.departedAt,
        length: trail.length,
        shift:
          trail.anchor && here
            ? { x: trail.anchor.x - here.x, y: trail.anchor.y - here.y }
            : { x: 0, y: 0 },
      }));
      lastBurning = burning;
      const since = now - returnedAt;
      const arriving = tripSeen === "returning" && since < RETURN_MS;
      const rift = getRift(now);
      const gathering = tripSeen === "parked" && rift.orb > 0;
      if (burning.length === 0 && !arriving && !gathering) {
        return;
      }
      const landed = arriving ? since - ARRIVAL.appearMs : -1;
      const frost = arriving ? getFrost(since) : 0;
      const steam = arriving ? getSteam(since) : 0;
      return {
        arrival: arriving ? since : -1,
        bounds: getBounds(
          burning,
          arriving,
          tripSeen === "departing",
          gathering ? rift.x : undefined
        ),
        car: {
          blur: getBlur(now),
          frost,
          glare: landed >= 0 ? Math.max(0, 1 - landed / GLARE_MS) : 0,
          offset,
          standing: isDomCarShown(now),
        },
        clip: getClip(),
        impact: {
          kickX: impactKick.x,
          kickY: impactKick.y,
          pulse: getPulse(),
          surge: impactSurge,
        },
        rift,
        scale: 0,
        skid: arriving
          ? Math.min(1, Math.max(0, (RETURN_MS - since) / SKID_FADE_MS))
          : 0,
        lamp: steam > 0 ? measureLamp() : undefined,
        steam: arriving
          ? { amount: steam, since: since - ARRIVAL.steamFromMs }
          : { amount: 0, since: 0 },
        time: now / 1000,
        trails: burning,
        vapour: landed >= 0 ? Math.min(1, landed / 200) * frost : 0,
      };
    };

    // The shader canvas covers the car's margin, the slice and its flash or
    // the arrival's, and the desk each set of trails lies on, wherever the
    // car has been dragged since.
    const getBounds = (
      burning: TripTrails[],
      arriving: boolean,
      departing: boolean,
      orbAt?: number
    ): TripBounds => {
      let left = -MARGIN;
      let top = -MARGIN;
      let right = width + MARGIN;
      let bottom = height + MARGIN;
      if (orbAt !== undefined) {
        left = Math.min(left, orbAt - 190);
        top = Math.min(top, height * ORB_Y - 175);
        bottom = Math.max(bottom, height * ORB_Y + 175);
      }
      let flashAt: number | undefined;
      if (arriving) {
        flashAt = ARRIVAL.slidePx;
      } else if (departing) {
        flashAt = -DEPARTURE.slicePx;
      }
      if (flashAt !== undefined) {
        left = Math.min(left, flashAt - FLASH_ROOM.x);
        right = Math.max(right, flashAt + FLASH_ROOM.x);
        top = Math.min(top, height * ORB_Y - FLASH_ROOM.y);
        bottom = Math.max(bottom, height * ORB_Y + FLASH_ROOM.y);
      }
      if (arriving) {
        const { region } = STEAM_SHEET;
        left = Math.min(left, width / 2 + region.left);
        right = Math.max(right, width / 2 + region.left + region.width);
        top = Math.min(top, height / 2 + region.top);
        bottom = Math.max(bottom, height / 2 + region.top + region.height);
      }
      for (const trail of burning) {
        if (trail.elapsed < slice.igniteAt - 30) {
          continue;
        }
        left = Math.min(
          left,
          trail.shift.x - DEPARTURE.slicePx - trail.length - TRAIL_MARGIN.behind
        );
        right = Math.max(right, trail.shift.x + width + TRAIL_MARGIN.behind);
        top = Math.min(
          top,
          trail.shift.y + height * TRACKS.rows[0] - TRAIL_MARGIN.above
        );
        bottom = Math.max(
          bottom,
          trail.shift.y + height * TRACKS.rows[1] + TRAIL_MARGIN.below
        );
      }
      // Whole px, so a still canvas is not laid out again every frame.
      const x = Math.floor(left);
      const y = Math.floor(top);
      return {
        height: Math.ceil(bottom) - y,
        width: Math.ceil(right) - x,
        x,
        y,
      };
    };

    // Its density drops on very long trails.
    // The desk lamp in the car's local px, where the shader's canvas is
    // laid out, and its height, or undefined while it is off.
    const measureLamp = () => {
      const lamp = lampRef.current;
      const parent = shaderCanvas.parentElement;
      if (!(lamp && parent && parent.offsetWidth > 0)) {
        return;
      }
      const box = parent.getBoundingClientRect();
      const zoom = box.width / parent.offsetWidth;
      return {
        height: getLampConfig().heightPx / zoom,
        x: (lamp.x - box.left) / zoom,
        y: (lamp.y - box.top) / zoom,
      };
    };

    const getShaderScale = (bounds: TripBounds) =>
      Math.min(
        pixelRatio * SHADER_DENSITY,
        MAX_SHADER_PX / bounds.width,
        MAX_SHADER_PX / bounds.height
      );

    // The frame fills the bottom-left of the backing store, which may be
    // larger (see `reserve` in trip-renderer.ts): the canvas is laid out so
    // that corner covers the frame's bounds.
    const placeShaderCanvas = (tripFrame: TripFrame, backing: BackingSize) => {
      const { bounds, scale } = tripFrame;
      const cssWidth = backing.width / scale;
      const cssHeight = backing.height / scale;
      const top =
        bounds.y - (backing.height - Math.round(bounds.height * scale)) / scale;
      const key = `${bounds.x},${top},${cssWidth},${cssHeight}`;
      if (key === shaderBounds) {
        return;
      }
      shaderBounds = key;
      shaderCanvas.style.left = `${bounds.x}px`;
      shaderCanvas.style.top = `${top}px`;
      shaderCanvas.style.width = `${cssWidth}px`;
      shaderCanvas.style.height = `${cssHeight}px`;
    };

    const renderShader = (now: number, offset: number) => {
      const tripFrame = renderer ? getTripFrame(now, offset) : undefined;
      if (renderer && tripFrame) {
        tripFrame.scale = getShaderScale(tripFrame.bounds);
        placeShaderCanvas(tripFrame, renderer.render(tripFrame));
        shaderDrawn = true;
        return true;
      }
      if (shaderDrawn) {
        // Clear the last frame once there is nothing left to draw.
        shaderCanvas.width = 0;
        shaderCanvas.height = 0;
        shaderBounds = "";
        shaderDrawn = false;
      }
      return false;
    };

    // How far the nose is lifted on the springs now, px.
    const getLift = (now: number) => {
      if (tripSeen === "departing") {
        return getLaunchLift(now - departedAt);
      }
      if (tripSeen === "returning") {
        return getArrivalLift(now - returnedAt);
      }
      return 0;
    };

    // The car, and the bolts riding along with it: driven, pitched on its
    // springs (seen from above and a little from the front, the nose
    // lifting moves it up the screen), shaken, and cut off where it has
    // gone through the slice or not yet come out of one.
    const writeBody = (now: number, offset: number) => {
      canvas.style.transform = offset === 0 ? "" : `translateX(${offset}px)`;
      const rift = getRift(now);
      const departing = tripSeen === "departing";
      let cut: number | undefined;
      if (departing) {
        cut = -DEPARTURE.slicePx - offset;
      } else if (tripSeen === "returning") {
        cut = ARRIVAL.slidePx - offset;
      }
      const coming =
        tripSeen === "returning" &&
        now - returnedAt >= ARRIVAL.appearMs &&
        cut !== undefined &&
        cut < width + MARGIN;
      // The bolts fade out into the slice over a few px rather than ending
      // on a ruled line: the shader cuts the car along a wavering tear.
      let mask = "";
      if (departing && cut !== undefined && cut > -MARGIN && rift.since < 0) {
        const at = MARGIN + cut;
        mask = `linear-gradient(to right, transparent ${at - CUT_FEATHER_PX.inside}px, #000 ${at + CUT_FEATHER_PX.outside}px)`;
      } else if (coming && cut !== undefined) {
        const at = MARGIN + cut;
        mask = `linear-gradient(to right, #000 ${at - CUT_FEATHER_PX.outside}px, transparent ${at + CUT_FEATHER_PX.inside}px)`;
      }
      canvas.style.maskImage = mask;
      canvas.style.setProperty("-webkit-mask-image", mask);
      const body = bodyRef.current;
      if (!body) {
        return;
      }
      if (departing && cut !== undefined && cut > 0) {
        body.style.clipPath = `inset(0 0 0 ${Math.min(width, cut)}px)`;
      } else if (tripSeen === "returning" && cut !== undefined && cut < width) {
        body.style.clipPath = `inset(0 ${width - Math.max(0, cut)}px 0 0)`;
      } else {
        body.style.clipPath = "";
      }
      const share = isDomCarShown(now) ? getBlur(now).share : 1;
      body.style.opacity = share > 0 ? String(1 - share) : "";
      const shake = reducedMotion
        ? 0
        : (SHAKE_PX * Math.max(0, level - SHAKE_FROM)) / (1 - SHAKE_FROM);
      const moving = Math.abs(getBlur(now).reach) > 0.5 ? ROAD_SHAKE_PX : 0;
      const x = offset + (Math.random() * 2 - 1) * shake;
      const y = (Math.random() * 2 - 1) * (shake + moving);
      const lift = getLift(now);
      const skew = (Math.atan(lift / (width / 2)) * 180) / Math.PI;
      body.style.transform =
        x !== 0 || y !== 0 || skew !== 0
          ? `translate(${x}px, ${y - lift * 0.3}px) skewY(${skew}deg)`
          : "";
    };

    // The glare still on the car as it lands, 0 to 1.
    const getGlare = (now: number) => {
      const landed = now - returnedAt - ARRIVAL.appearMs;
      return tripSeen === "returning" && landed >= 0
        ? Math.max(0, 1 - landed / GLARE_MS)
        : 0;
    };

    // How bright the fire burns where it erupted, the nearest of it to the
    // car, and where, in the car's px.
    const getFireNear = (offset: number) => {
      let best = { intensity: 0, x: 0, y: 0 };
      for (const trail of lastBurning) {
        const intensity = getFlameIntensity(trail.elapsed - slice.igniteAt);
        const x = trail.shift.x - DEPARTURE.slicePx - offset;
        // Its light falls off with distance from the car's nose.
        const near = intensity * Math.exp(-Math.max(0, -x) / 120);
        if (near > best.intensity) {
          best = { intensity: near, x, y: height * 0.55 + trail.shift.y };
        }
      }
      return best;
    };

    // The lights the effect throws on the lamp-lit car this frame.
    const writeGlow = (now: number, offset: number) => {
      if (!glow) {
        return;
      }
      const [cold, warm] = glow.lights;
      let sumX = 0;
      let sumY = 0;
      for (const arc of arcs) {
        sumX += (arc.from.x + arc.to.x) / 2;
        sumY += (arc.from.y + arc.to.y) / 2;
      }
      const bolts =
        arcs.length > 0
          ? Math.min(GLOW.bolts.max, arcs.length * GLOW.bolts.perArc) *
            (0.7 + Math.random() * 0.3)
          : 0;
      const rift = getRift(now);
      // With the baked light laid over the body, the lamp-lit car takes
      // only part of it again.
      const riftLight =
        Math.max(rift.open, rift.heat, rift.orb * 0.7) *
        GLOW.flash.strength *
        (lightMaps ? 0.5 : 1);
      const flash = getGlare(now) * GLOW.flash.strength;
      if (riftLight > Math.max(bolts, flash)) {
        Object.assign(cold, {
          color: GLOW.flash.color,
          intensity: riftLight * Math.min(1.2, getPulse()),
          x: rift.x - offset,
          y: height * ORB_Y,
          z: GLOW.bolts.z,
        });
      } else if (flash > bolts) {
        Object.assign(cold, {
          color: GLOW.flash.color,
          intensity: flash,
          x: width / 2,
          y: height * 0.56,
          z: GLOW.flash.z,
        });
      } else {
        Object.assign(cold, {
          color: GLOW.bolts.color,
          intensity: bolts,
          x: arcs.length > 0 ? sumX / arcs.length : width / 2,
          y: arcs.length > 0 ? sumY / arcs.length : height / 2,
          z: GLOW.bolts.z,
        });
      }
      const fire = getFireNear(offset);
      // Flames flicker, and so does their light.
      const flicker = 0.8 + 0.2 * Math.sin(now * 0.031) * Math.sin(now * 0.017);
      Object.assign(warm, {
        color: GLOW.fire.color,
        intensity: fire.intensity * GLOW.fire.strength * flicker,
        x: fire.x,
        y: fire.y,
        z: GLOW.fire.z,
      });
    };

    // The car lands crackling: bolts run over its body once it is through.
    // Thrown from one point they read as a bow tie.
    const throwLandingBolts = (now: number) => {
      if (landingBoltsThrown || now - returnedAt < emergedMs) {
        return;
      }
      landingBoltsThrown = true;
      // Short jumps from the body's edge in to its flux bands.
      for (let index = 0; index < LANDING_BOLTS * 4; index += 1) {
        if (arcs.length >= LANDING_BOLTS) {
          break;
        }
        const from =
          outline.edges[Math.floor(Math.random() * outline.edges.length)];
        const to =
          outline.coils[Math.floor(Math.random() * outline.coils.length)];
        const length =
          from && to ? Math.hypot(to.x - from.x, to.y - from.y) : 0;
        if (
          from &&
          to &&
          length >= LANDING_ARC_PX.min &&
          length <= LANDING_ARC_PX.max
        ) {
          addArc(now, from, to);
        }
      }
    };

    // Where the car's middle is on the desk, in its px: dragging the car
    // moves it there, panning and zooming the canvas do not. Undefined
    // outside a canvas.
    const measureDeskPoint = (): Point | undefined => {
      const body = bodyRef.current;
      const desk = body?.closest<HTMLElement>(".react-transform-component");
      if (!(body && desk && desk.offsetWidth > 0)) {
        return;
      }
      const deskRect = desk.getBoundingClientRect();
      const zoom = deskRect.width / desk.offsetWidth;
      const rect = (body.parentElement ?? body).getBoundingClientRect();
      if (zoom <= 0) {
        return;
      }
      return {
        x: (rect.left + rect.width / 2 - deskRect.left) / zoom,
        y: (rect.top + rect.height / 2 - deskRect.top) / zoom,
      };
    };

    // How far, in local px, the fire races past the slice to leave the
    // screen on the left.
    const measureFireLength = () => {
      const rect = bodyRef.current?.getBoundingClientRect();
      const zoom = rect ? rect.width / width : 0;
      if (!(rect && zoom > 0)) {
        return 0;
      }
      return Math.min(
        MAX_FIRE_PX,
        Math.max(0, (rect.left + OFFSCREEN_PX) / zoom - DEPARTURE.slicePx)
      );
    };

    // How dim the room should be: with the charge while it charges, fully
    // while it leaves and its fire burns, and while it comes back and stops.
    const getDimTarget = (now: number) => {
      if (reducedMotion) {
        return 0;
      }
      if (tripSeen === "departing") {
        return 1;
      }
      if (tripSeen === "away") {
        const [trail] = trails;
        const flamesOut = trail
          ? trail.departedAt +
            slice.igniteAt +
            (Math.min(trail.length, 1200) / DEPARTURE.fireSpeed) * 1000 +
            DEPARTURE.flameHoldMs +
            DEPARTURE.flameFadeMs
          : 0;
        return now < flamesOut ? 1 : 0;
      }
      if (tripSeen === "returning") {
        return 0;
      }
      return level;
    };

    // The car's wrapper rises over the rest of the desk while it travels
    // (`data-time-travel` in index.css), over the dimmed room and with the
    // steam it pours on landing: under the cards beside it, the steam was
    // cut off at their edges.
    const raise = (raised: boolean) => {
      if (!raised) {
        if (dimWrapper) {
          delete dimWrapper.dataset.timeTravel;
        }
        dimWrapper = undefined;
        return;
      }
      if (dimWrapper) {
        return;
      }
      const wrapper = bodyRef.current?.parentElement?.closest<HTMLElement>(
        ".canvas-entrance-item"
      );
      if (wrapper) {
        wrapper.dataset.timeTravel = "";
        dimWrapper = wrapper;
      }
    };

    // Dithering for the dim: its colour at a few levels of alpha, so the
    // gradient's 8-bit steps break up.
    const getDitherUrl = () => {
      const tile = document.createElement("canvas");
      tile.width = 64;
      tile.height = 64;
      const tileContext = tile.getContext("2d");
      if (!tileContext) {
        return "";
      }
      const pixels = tileContext.createImageData(64, 64);
      const [red, green, blue] = ROOM_DIM.rgb;
      for (let index = 0; index < pixels.data.length; index += 4) {
        pixels.data[index] = red;
        pixels.data[index + 1] = green;
        pixels.data[index + 2] = blue;
        pixels.data[index + 3] = Math.floor(Math.random() * 5);
      }
      tileContext.putImageData(pixels, 0, 0);
      return `url(${tile.toDataURL()})`;
    };

    // The dim's gradient: clear around the car, easing out across the desk.
    const getDimGradient = () => {
      const { clearPx, fullPx, outer, rgb } = ROOM_DIM;
      const stops: string[] = [];
      for (let index = 0; index <= DIM_STOPS; index += 1) {
        const share = index / DIM_STOPS;
        const eased = share * share * (3 - 2 * share);
        const radius = clearPx + (fullPx - clearPx) * share;
        stops.push(
          `rgba(${rgb.join(", ")}, ${(outer * eased).toFixed(4)}) ${radius.toFixed(1)}px`
        );
      }
      return `radial-gradient(circle at 50% 50%, ${stops.join(", ")})`;
    };

    // The layer that dims the room: a dark veil over the whole desk, clear
    // around the car. Undefined outside a canvas.
    const ensureDimLayer = () => {
      if (dimLayer) {
        return dimLayer;
      }
      const button = bodyRef.current?.parentElement;
      const wrapper = button?.closest<HTMLElement>(".canvas-entrance-item");
      const host = wrapper?.parentElement;
      if (!(button && wrapper && host)) {
        return;
      }
      const rect = button.getBoundingClientRect();
      const zoom = rect.width / width;
      if (!(zoom > 0)) {
        return;
      }
      const hostRect = host.getBoundingClientRect();
      const x = (rect.left + rect.width / 2 - hostRect.left) / zoom;
      const y = (rect.top + rect.height / 2 - hostRect.top) / zoom;
      const layer = document.createElement("div");
      layer.setAttribute("aria-hidden", "true");
      const dither = getDitherUrl();
      Object.assign(layer.style, {
        background: dither
          ? `${dither}, ${getDimGradient()}`
          : getDimGradient(),
        height: `${DIM_SIZE_PX}px`,
        left: `${x - DIM_SIZE_PX / 2}px`,
        opacity: "0",
        pointerEvents: "none",
        position: "absolute",
        top: `${y - DIM_SIZE_PX / 2}px`,
        width: `${DIM_SIZE_PX}px`,
        willChange: "opacity, transform",
        zIndex: "99998",
      });
      host.append(layer);
      dimLayer = layer;
      dimWritten = "";
      return layer;
    };

    const removeDimLayer = () => {
      dimLayer?.remove();
      dimLayer = undefined;
      dimWritten = "";
    };

    const writeDim = (now: number, dt: number) => {
      if (obscuredRef.current) {
        dim = 0;
        removeDimLayer();
        raise(false);
        return;
      }
      const target = getDimTarget(now);
      const seconds = target > dim ? ROOM_DIM.inSeconds : ROOM_DIM.outSeconds;
      dim += (target - dim) * (1 - Math.exp(-dt / seconds));
      if (target === 0 && dim < 0.004) {
        dim = 0;
      }
      raise(
        level > 0 ||
          Boolean(plasmaLayer) ||
          tripSeen === "departing" ||
          (tripSeen === "returning" && now - returnedAt < RETURN_MS)
      );
      if (dim === 0) {
        removeDimLayer();
        return;
      }
      const layer = ensureDimLayer();
      // The pool of light the dim leaves is the plasma's: it follows the
      // light, grows with it and breathes with its flicker, pushing the dark
      // back on a flare and letting it close in as it ebbs. Scaling the dim's
      // opacity instead changed the far room most and the lit desk not at
      // all, the reverse of a light, and read as a mask.
      const { pool } = ROOM_DIM;
      const scale = Math.min(
        pool.max,
        Math.max(pool.min, pool.min + pool.gain * plasmaLight)
      );
      const written = `${dim.toFixed(3)} translate(${plasmaShift.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
      if (layer && written !== dimWritten) {
        layer.style.opacity = dim.toFixed(3);
        layer.style.transform = written.slice(written.indexOf(" ") + 1);
        dimWritten = written;
      }
    };

    // Follows the trip the card asks for and keeps its clock.
    const followTrip = (now: number) => {
      const next = tripRef.current;
      if (next === tripSeen) {
        return;
      }
      tripSeen = next;
      clearTimeout(steamTimer);
      if (next === "away") {
        // The sheet goes to the GPU once the time machine has opened over
        // the desk: uploading it during the drive or the opening dropped
        // a frame.
        steamTimer = window.setTimeout(() => {
          renderer?.prepareSteam(true);
          // The return's canvas, while the time machine covers the desk and
          // the lamp is paused: growing it as the car lands waited on a GPU
          // busy relighting the desk.
          const bounds = getBounds(lastBurning, true, false);
          const scale = getShaderScale(bounds);
          renderer?.reserve(
            Math.round(bounds.width * scale),
            Math.round(bounds.height * scale)
          );
        }, STEAM_UPLOAD_DELAY_MS);
      }
      if (next === "departing") {
        const parkedOrb = getChargeOrb(level);
        chargedOrb = {
          lead: DEPARTURE.orbLeadPx * CHARGE_ORB.lead,
          size: Math.max(fedOrb, parkedOrb.size),
        };
        renderer?.prepareSteam(false);
        departedAt = now;
        departedCalled = false;
        sliceBolts = [];
        trails = [
          {
            anchor: measureDeskPoint(),
            departedAt: now,
            length: measureFireLength(),
          },
          ...trails,
        ].slice(0, MAX_TRAILS);
      } else if (next === "returning") {
        renderer?.prepareSteam(true);
        returnedAt = now;
        returnedCalled = false;
        landingBoltsThrown = false;
        flashForksThrown = 0;
        level = 0;
      }
    };

    const step = (now: number, dt: number) => {
      const elapsed = now - departedAt;
      const departing = tripSeen === "departing";
      const returning = tripSeen === "returning";
      let offset = 0;
      if (departing) {
        offset = getDriveOffset(elapsed, driveDistance);
      } else if (returning) {
        offset = getArrivalOffset(now - returnedAt);
      }
      if (returning) {
        throwFlashForks(now, offset);
        throwLandingBolts(now);
      }

      if (departing && isDomCarShown(now)) {
        level = Math.min(1, level + dt / SURGE_SECONDS);
      } else if (isDomCarShown(now)) {
        level = stepCharge(level, chargingRef.current, dt);
      } else {
        level = 0;
        if (!returning) {
          arcs = [];
        }
      }
      if (departing && elapsed >= OPEN_MS && !departedCalled) {
        departedCalled = true;
        callbacksRef.current.onDeparted();
      }
      if (
        tripSeen === "returning" &&
        now - returnedAt >= RETURN_MS &&
        !returnedCalled
      ) {
        returnedCalled = true;
        callbacksRef.current.onReturned();
      }
      if (isDomCarShown(now)) {
        spawnCharge(now, dt);
        spawnMotes(now, dt);
      } else {
        motes = [];
      }
      arcs = arcs.filter((arc) => now - arc.born < arc.life);
      motes = motes.filter((mote) => now - mote.born < mote.life);
      twinkles = twinkles.filter(
        (twinkle) => now - twinkle.born < TWINKLE_LIFE_MS
      );
      if (tripSeen === "parked") {
        const parkedLead = DEPARTURE.orbLeadPx * CHARGE_ORB.lead;
        for (const mote of motes) {
          const t = (now - mote.born) / mote.life;
          if (!mote.absorbed && t >= 0.78) {
            mote.absorbed = true;
            absorbedMass = Math.min(1.05, absorbedMass + 0.082);
            const to = {
              x: -parkedLead + mote.toOffset.x,
              y: height * ORB_Y + mote.toOffset.y,
            };
            const pBefore = getMotePoint(mote.from, to, mote.bow, 0.66);
            const pHit = getMotePoint(mote.from, to, mote.bow, 0.78);
            const dx = pHit.x - pBefore.x;
            const dy = pHit.y - pBefore.y;
            const len = Math.hypot(dx, dy) || 1;
            impactVel.x += (dx / len) * 78;
            impactVel.y += (dy / len) * 92;
            impactSurge = Math.min(1.1, impactSurge + 0.48);
          }
        }
        const springK = 155;
        const damping = 13;
        impactVel.x += (-springK * impactKick.x - damping * impactVel.x) * dt;
        impactVel.y += (-springK * impactKick.y - damping * impactVel.y) * dt;
        impactKick.x = Math.max(
          -9,
          Math.min(9, impactKick.x + impactVel.x * dt)
        );
        impactKick.y = Math.max(
          -9,
          Math.min(9, impactKick.y + impactVel.y * dt)
        );
        impactSurge *= Math.exp(-dt * 7.5);

        if (chargingRef.current) {
          if (level >= CHARGE_ORB.from) {
            // 1. Seed ignites first (0.11) to pull motes in;
            // 2. Then grows continuously from 0.11 to 1.16 as each mote is absorbed!
            const seed = 0.11 * Math.min(1, (level - CHARGE_ORB.from) / 0.07);
            const target = seed + absorbedMass;
            fedOrb += (target - fedOrb) * Math.min(1, dt * 14);
          }
        } else {
          // Causal collapse: while any in-flight mote is still approaching
          // the singularity, the singularity stays open to swallow it, and
          // only implodes to 0 once the last mote has entered!
          const hasInFlightMote = motes.some(
            (mote) => (now - mote.born) / mote.life < 0.92
          );
          if (hasInFlightMote) {
            fedOrb = Math.max(0.22, fedOrb - dt * 0.18);
          } else {
            fedOrb = Math.max(0, fedOrb - dt / 0.26);
            absorbedMass = Math.max(0, absorbedMass - dt / 0.26);
          }
        }
      } else {
        // Motes pouring into the light ahead of the moving car surge it too.
        for (const mote of motes) {
          if (!mote.absorbed && (now - mote.born) / mote.life >= 0.78) {
            mote.absorbed = true;
            impactSurge = Math.min(1.1, impactSurge + 0.3);
          }
        }
        fedOrb = 0;
        absorbedMass = 0;
        impactKick.x = 0;
        impactKick.y = 0;
        impactVel.x = 0;
        impactVel.y = 0;
        impactSurge *= Math.exp(-dt * 10);
      }
      return offset;
    };

    const draw = (now: number, offset: number) => {
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.restore();
      context.lineCap = "round";
      context.lineJoin = "round";
      if (isDomCarShown(now)) {
        drawLamps(now);
        drawBodyLight(now, offset);
        drawCoils(now);
        drawBumper(now);
      }
      drawSliceBolts(now, offset);
      drawMotes(now, offset);
      for (const arc of arcs) {
        drawArc(arc, now);
      }
      for (const twinkle of twinkles) {
        drawTwinkle(twinkle, now);
      }
      return renderShader(now, offset);
    };

    const tick = (now: number) => {
      frame = 0;
      if (disposed) {
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      followTrip(now);
      if (reducedMotion) {
        level = 0;
        writeBody(now, 0);
        return;
      }
      stepFlicker(now, dt);
      const offset = step(now, dt);
      const shading = draw(now, offset);
      writeBody(now, offset);
      writeGlow(now, offset);
      writePlasmaLight(now);
      writeDim(now, dt);
      const particles = arcs.length + twinkles.length + motes.length;
      const settled =
        level === 0 &&
        dim === 0 &&
        !plasmaLayer &&
        particles === 0 &&
        !shading &&
        tripSeen !== "departing" &&
        !(tripSeen === "returning" && !returnedCalled);
      if (!settled) {
        frame = requestAnimationFrame(tick);
      }
    };

    startRef.current = () => {
      requestOutline();
      if (frame || disposed) {
        return;
      }
      resize();
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const body = bodyRef.current;
    // Yields the desk at once when a stack, focus item, reader or drag covers
    // the car, before the foreground item's first frame paints.
    quenchRef.current = () => {
      dim = 0;
      plasmaLight = 0;
      removeDimLayer();
      removePlasmaLayer();
      setLampFlare(null);
      raise(false);
      if (tripSeen === "parked") {
        level = 0;
        fedOrb = 0;
        absorbedMass = 0;
        impactSurge = 0;
        impactKick.x = 0;
        impactKick.y = 0;
        impactVel.x = 0;
        impactVel.y = 0;
        arcs = [];
        motes = [];
        twinkles = [];
        sliceBolts = [];
        let hadGlow = false;
        for (const light of glow?.lights ?? []) {
          if (light.intensity > 0) {
            light.intensity = 0;
            hadGlow = true;
          }
        }
        if (hadGlow) {
          wakeLamp();
        }
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.restore();
        if (body) {
          body.style.transform = "";
          body.style.opacity = "";
          body.style.clipPath = "";
        }
        if (trails.length === 0) {
          if (shaderDrawn) {
            shaderCanvas.width = 0;
            shaderCanvas.height = 0;
            shaderBounds = "";
            shaderDrawn = false;
          }
          cancelAnimationFrame(frame);
          frame = 0;
        }
      }
    };
    if (
      (chargingRef.current && !obscuredRef.current) ||
      tripRef.current !== "parked"
    ) {
      startRef.current();
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      clearTimeout(steamTimer);
      startRef.current = () => undefined;
      quenchRef.current = () => undefined;
      renderer?.destroy();
      removeDimLayer();
      removePlasmaLayer();
      setLampFlare(null);
      raise(false);
      for (const light of glow?.lights ?? []) {
        light.intensity = 0;
      }
      canvas.style.transform = "";
      canvas.style.maskImage = "";
      canvas.style.setProperty("-webkit-mask-image", "");
      if (body) {
        body.style.transform = "";
        body.style.opacity = "";
        body.style.clipPath = "";
      }
    };
  }, [bodyRef, glow, height, image, width]);

  useLayoutEffect(() => {
    obscuredRef.current = obscured;
    if (obscured) {
      chargingRef.current = false;
      quenchRef.current();
    }
  }, [obscured]);

  useEffect(() => {
    chargingRef.current = charging && !obscuredRef.current;
    tripRef.current = trip;
    if (chargingRef.current || trip !== "parked") {
      startRef.current();
    }
  }, [charging, trip]);

  const style = {
    height: height + MARGIN * 2,
    left: -MARGIN,
    top: -MARGIN,
    width: width + MARGIN * 2,
  };
  return (
    <>
      <canvas
        aria-hidden
        className="pointer-events-none absolute"
        ref={shaderCanvasRef}
        style={style}
      />
      <canvas
        aria-hidden
        className="pointer-events-none absolute"
        ref={canvasRef}
        style={style}
      />
    </>
  );
};
