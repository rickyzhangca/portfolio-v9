/**
 * A folded street map: one sheet of 8 x 2 panels, folded as an accordion
 * along its vertical creases and then once across the middle. This module
 * turns a moment of the open or close motion into a matrix per panel; the
 * streetmap card writes them as CSS `matrix3d` transforms.
 *
 * Coordinates are CSS px: +x right, +y down, +z toward the viewer. Matrices
 * are column-major, like `matrix3d`.
 */

export const FOLD_COLUMNS = 8;
export const FOLD_ROWS = 2;
export const PANEL_WIDTH = 120;
export const PANEL_HEIGHT = 272;
export const SHEET_WIDTH = FOLD_COLUMNS * PANEL_WIDTH;
export const SHEET_HEIGHT = FOLD_ROWS * PANEL_HEIGHT;
const CREASES = FOLD_COLUMNS - 1;

/** Timing and geometry of the fold, tuned in the prototype. */
export const FOLD_PARAMS = {
  /** The cross fold opens after this long (s), on its own spring. */
  crossStart: 0.05,
  crossResponse: 0.42,
  crossBounce: 0.12,
  /**
   * One continuous pull opens the accordion: a half-open target in between
   * made the creases slow down and speed up again, which read as a hitch.
   */
  pullStart: 0.18,
  pullResponse: 0.5,
  pullBounce: 0.08,
  /** The creases open from the top of the stack down, this far apart (s). */
  stagger: 0.03,
  /** Angle (deg) an opened crease keeps: the paper remembers its folds. */
  residual: 6,
  liftResponse: 0.38,
  /** How high the sheet is held above the desk, in sheet px. */
  liftZ: 70,
  /** On a phone the booklet lies turned by this much (deg); square on a desk. */
  restTilt: -5,
  closeFoldDuration: 0.36,
  /**
   * The cross fold swings a whole row, 272 px, over: its edge travels more
   * than twice as far as an accordion panel's, so it takes longer and eases
   * gently, or it reads as a snap next to the creases.
   */
  closeCrossStart: 0.4,
  closeCrossDuration: 0.52,
  dropStart: 0.72,
  dropDuration: 0.38,
  /** The booklet hops this much of its lift as it lands. */
  dropBounce: 0.05,
  /** How quickly a half-open accordion turns toward its mean plane. */
  levelPower: 0.6,
  /** Paper thickness: folded layers stack this far apart (px). */
  thickness: 0.8,
  perspective: 2000,
} as const;

/**
 * A moment of the fold, as progress values: 0 is the folded booklet resting
 * on the desk, 1 the sheet held open. Springs can overshoot past 1.
 */
export interface FoldPose {
  /** Each crease's opening; crease i joins column i and i + 1. */
  creases: readonly number[];
  /** The cross fold's opening. */
  cross: number;
  /** How far the sheet has grown to its focused size. */
  grow: number;
  /** Height above the desk. */
  lift: number;
}

export type Matrix = readonly number[];

export const CLOSED_POSE: FoldPose = Object.freeze({
  creases: Object.freeze(new Array<number>(CREASES).fill(0)),
  cross: 0,
  grow: 0,
  lift: 0,
});

export const OPEN_POSE: FoldPose = Object.freeze({
  creases: Object.freeze(new Array<number>(CREASES).fill(1)),
  cross: 1,
  grow: 1,
  lift: 1,
});

// ---------------------------------------------------------------------------
// Matrices
// ---------------------------------------------------------------------------

const identity = (): number[] => [
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
];

export const multiply = (a: Matrix, b: Matrix): number[] => {
  const out = new Array<number>(16);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[column * 4 + row] =
        a[row] * b[column * 4] +
        a[4 + row] * b[column * 4 + 1] +
        a[8 + row] * b[column * 4 + 2] +
        a[12 + row] * b[column * 4 + 3];
    }
  }
  return out;
};

const translate = (x: number, y: number, z: number): number[] => [
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  x,
  y,
  z,
  1,
];
const scaling = (s: number): number[] => [
  s,
  0,
  0,
  0,
  0,
  s,
  0,
  0,
  0,
  0,
  s,
  0,
  0,
  0,
  0,
  1,
];
const rotateX = (angle: number): number[] => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
};
const rotateY = (angle: number): number[] => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
};
const rotateZ = (angle: number): number[] => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
};

export type Vec3 = readonly [number, number, number];

export const transformPoint = (m: Matrix, [x, y, z]: Vec3): Vec3 => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14],
];

export const normalize = ([x, y, z]: Vec3): Vec3 => {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
};

export const transformDirection = (m: Matrix, [x, y, z]: Vec3): Vec3 =>
  normalize([
    m[0] * x + m[4] * y + m[8] * z,
    m[1] * x + m[5] * y + m[9] * z,
    m[2] * x + m[6] * y + m[10] * z,
  ]);

export const dot = (a: Vec3, b: Vec3) =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const toCssMatrix = (m: Matrix) =>
  `matrix3d(${m.map((value) => Math.round(value * 1e5) / 1e5).join(",")})`;

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const radians = (degrees: number) => (degrees * Math.PI) / 180;
const easeIn2 = (p: number) => p * p;
/** Peaks at about 1.6 times its mean speed, against 3 for the cubic. */
const easeInOutSine = (p: number) => (1 - Math.cos(Math.PI * p)) / 2;
const easeInOut3 = (p: number) =>
  p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;

const MAX_DELAY = (CREASES - 1) * FOLD_PARAMS.stagger;

interface Pull {
  at: number;
  bounce: number;
  from: number;
  response: number;
  to: number;
}

/**
 * A damped spring from `from` at rest, pulled toward `to` from `at`
 * seconds; `response` is its undamped period and `bounce` 0 is critically
 * damped. Stepped at 240 Hz so the motion is the same at any frame rate.
 */
const simulate = (t: number, { at, bounce, from, response, to }: Pull) => {
  if (t <= at) {
    return from;
  }
  const w = (2 * Math.PI) / response;
  const k = w * w;
  const c = 2 * (1 - bounce) * w;
  const dt = 1 / 240;
  let x = from;
  let v = 0;
  for (let time = at; time < t; time += dt) {
    const step = Math.min(dt, t - time);
    v += (-k * (x - to) - c * v) * step;
    x += v * step;
  }
  return x;
};

/** How folded a pose still is: 1 for the booklet, 0 once fully open. */
const closedness = (pose: FoldPose) => {
  let open = pose.cross;
  for (const crease of pose.creases) {
    open += crease;
  }
  return clamp01(1 - open / (CREASES + 1));
};

export const getOpenDuration = () =>
  FOLD_PARAMS.pullStart + MAX_DELAY + FOLD_PARAMS.pullResponse * 1.6;

export const getCloseDuration = () =>
  Math.max(
    FOLD_PARAMS.dropStart + FOLD_PARAMS.dropDuration,
    FOLD_PARAMS.closeCrossStart + FOLD_PARAMS.closeCrossDuration
  );

/**
 * `t` seconds into opening from `from`: the booklet lifts and grows, the
 * cross fold turns over, then the creases pull open from the top of the
 * stack down. A sheet caught half folded skips the waits it has passed.
 */
export const getOpenPose = (
  t: number,
  from: FoldPose = CLOSED_POSE
): FoldPose => {
  const wait = closedness(from);
  const creases = from.creases.map((start, i) =>
    simulate(t, {
      at:
        (FOLD_PARAMS.pullStart + (CREASES - 1 - i) * FOLD_PARAMS.stagger) *
        wait,
      bounce: FOLD_PARAMS.pullBounce,
      from: start,
      response: FOLD_PARAMS.pullResponse,
      to: 1,
    })
  );
  const pull = (start: number, at: number, response: number, bounce: number) =>
    simulate(t, { at, bounce, from: start, response, to: 1 });
  return {
    creases,
    cross: pull(
      from.cross,
      FOLD_PARAMS.crossStart * wait,
      FOLD_PARAMS.crossResponse,
      FOLD_PARAMS.crossBounce
    ),
    grow: pull(from.grow, 0, FOLD_PARAMS.liftResponse, 0),
    lift: pull(from.lift, 0, FOLD_PARAMS.liftResponse, 0),
  };
};

/**
 * `t` seconds into closing from `from`: the creases fold up from the bottom
 * of the stack, the cross fold turns the top row over, and the booklet drops
 * back onto the desk with a small hop.
 */
export const getClosePose = (
  t: number,
  from: FoldPose = OPEN_POSE
): FoldPose => {
  const creases = from.creases.map(
    (start, i) =>
      start *
      (1 -
        easeInOut3(
          clamp01((t - i * FOLD_PARAMS.stagger) / FOLD_PARAMS.closeFoldDuration)
        ))
  );
  const cross =
    from.cross *
    (1 -
      easeInOutSine(
        clamp01(
          (t - FOLD_PARAMS.closeCrossStart) / FOLD_PARAMS.closeCrossDuration
        )
      ));
  const p = clamp01((t - FOLD_PARAMS.dropStart) / FOLD_PARAMS.dropDuration);
  let lift = 0;
  if (p < 0.78) {
    lift = from.lift * (1 - easeIn2(p / 0.78));
  } else if (p < 1) {
    lift = Math.sin((Math.PI * (p - 0.78)) / 0.22) * FOLD_PARAMS.dropBounce;
  }
  return {
    creases,
    cross,
    grow: from.grow * (1 - easeInOut3(p)),
    lift,
  };
};

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

export interface PanelPlacement {
  column: number;
  /** Panel px to the card's sheet space, centred on the booklet. */
  matrix: number[];
  row: number;
}

/**
 * A matrix per panel, row by row. `focusScale` is the sheet's size once
 * held open, relative to the booklet on the desk; `turn` (deg) is how far
 * the open sheet is turned, as it grows, to stand upright on a tall screen;
 * `restTilt` (deg) is how the booklet lies on the desk.
 */
/** How near flat (of the 0-1 cross fold) the rows are laid in one plane. */
const CROSS_FLAT = 0.005;

export const getPanelPlacements = (
  pose: FoldPose,
  focusScale: number,
  turn = 0,
  restTilt: number = FOLD_PARAMS.restTilt
): PanelPlacement[] => {
  const { levelPower, liftZ, residual, thickness } = FOLD_PARAMS;
  const gammas = pose.creases.map((open) => 180 + (residual - 180) * open);
  // Accordion chain from column 0. Crease i folds column i + 1 toward the
  // viewer (even i) or away (odd i); its axis sits on that side of the paper
  // by half a thickness, so the folded layers stack instead of overlapping.
  const chain: number[][] = [identity()];
  for (let i = 0; i < CREASES; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = (i + 1) * PANEL_WIDTH;
    const z = (-side * thickness) / 2;
    const hinge = multiply(
      translate(x, 0, z),
      multiply(rotateY(radians(side * gammas[i])), translate(-x, 0, -z))
    );
    chain.push(multiply(chain[i], hinge));
  }
  // The cross fold turns the top row over onto the bottom one, over the
  // stack. Its axis sits on top of the stack only while the stack is
  // closed: once the accordion opens the sheet is one layer, and an axis
  // left up there pulls the rows apart into a visible seam.
  const meanGamma = gammas.reduce((sum, g) => sum + g, 0) / CREASES;
  const closed = clamp01((meanGamma - residual) / (180 - residual));
  const crossZ = ((FOLD_COLUMNS - 1) * thickness + thickness / 2) * closed;
  // Within a hair of flat the rows lie in one plane. Chrome splits faces
  // that are nearly but not quite coplanar and draws the pieces a pixel
  // off, so the cross crease jumped as the spring finally came to rest.
  const cross = Math.abs(1 - pose.cross) < CROSS_FLAT ? 1 : pose.cross;
  const crossFold = multiply(
    translate(0, PANEL_HEIGHT, crossZ),
    multiply(
      rotateX(radians(-180 * (1 - cross))),
      translate(0, -PANEL_HEIGHT, -crossZ)
    )
  );
  // Level the sheet as it opens: the chain leaves column 0 flat, so a half
  // open accordion climbs like a staircase; turn it toward its mean plane.
  const end = transformPoint(chain[FOLD_COLUMNS - 1], [SHEET_WIDTH, 0, 0]);
  const level = clamp01(1 - meanGamma / 180) ** levelPower;
  const leveling = rotateY(Math.atan2(end[2], end[0]) * level);

  const local: PanelPlacement[] = [];
  for (let row = 0; row < FOLD_ROWS; row += 1) {
    for (let column = 0; column < FOLD_COLUMNS; column += 1) {
      let m = multiply(
        chain[column],
        translate(column * PANEL_WIDTH, row * PANEL_HEIGHT, 0)
      );
      if (row === 0) {
        m = multiply(crossFold, m);
      }
      local.push({ column, matrix: multiply(leveling, m), row });
    }
  }
  // Keep the sheet centred and floating `lift` above the desk. A folded
  // stack rests on its lowest point; an open sheet on its mean plane:
  // resting it on its lowest point sank it as its creases relaxed.
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  let z0 = Number.POSITIVE_INFINITY;
  let zSum = 0;
  let count = 0;
  for (const { matrix } of local) {
    for (const corner of PANEL_CORNERS) {
      const [x, y, z] = transformPoint(matrix, corner);
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      z0 = Math.min(z0, z);
      zSum += z;
      count += 1;
    }
  }
  const zBase = closed * z0 + (1 - closed) * (zSum / count);
  const scale = 1 + (focusScale - 1) * pose.grow;
  const root = multiply(
    translate(0, 0, liftZ * pose.lift),
    multiply(
      rotateZ(radians(restTilt * (1 - pose.lift) + turn * pose.grow)),
      multiply(
        scaling(scale),
        translate(-(x0 + x1) / 2, -(y0 + y1) / 2, -zBase)
      )
    )
  );
  return local.map((placement) => ({
    ...placement,
    matrix: multiply(root, placement.matrix),
  }));
};

export const PANEL_CORNERS: readonly Vec3[] = [
  [0, 0, 0],
  [PANEL_WIDTH, 0, 0],
  [PANEL_WIDTH, PANEL_HEIGHT, 0],
  [0, PANEL_HEIGHT, 0],
];

/** Whether two poses are the same moment, within a hair. */
export const isPoseSettled = (pose: FoldPose, target: FoldPose) =>
  Math.abs(pose.cross - target.cross) < 1e-3 &&
  Math.abs(pose.lift - target.lift) < 1e-3 &&
  Math.abs(pose.grow - target.grow) < 1e-3 &&
  pose.creases.every(
    (crease, i) => Math.abs(crease - target.creases[i]) < 1e-3
  );

// ---------------------------------------------------------------------------
// Light
// ---------------------------------------------------------------------------

/** Light falling on the desk from the upper left when no lamp is on. */
const AMBIENT_LIGHT: Vec3 = normalize([-0.25, -0.45, 1]);

/** Direction from `point` toward the light: the lamp's position, or ambient. */
export const getLightDirection = (point: Vec3, lamp: Vec3 | null): Vec3 =>
  lamp
    ? normalize([lamp[0] - point[0], lamp[1] - point[1], lamp[2] - point[2]])
    : AMBIENT_LIGHT;

const SHADE_STRENGTH = 1.1;
/** Uncoated paper scatters: only a faint, broad sheen, never a hot spot. */
const SHEEN = 0.02;
const SHEEN_POWER = 6;
/** Facing the light brightens paper only a little; it never glows. */
const MAX_LIGHTEN = 0.1;

/**
 * The tint over a face whose visible side points along `normal`: how much
 * darker or lighter it is than flat paper under the same light, plus a
 * faint sheen where it mirrors the light toward the viewer. A sharp
 * specular highlight made the sheet read as plastic.
 */
export const getFaceTint = (normal: Vec3, light: Vec3, lampOn: boolean) => {
  const diffuse = Math.max(0, dot(normal, light));
  const ratio = diffuse / Math.max(0.15, light[2]);
  const half = normalize([light[0], light[1], light[2] + 1]);
  const sheen =
    Math.max(0, dot(normal, half)) ** SHEEN_POWER * SHEEN * (lampOn ? 1 : 0.4);
  const strength = SHADE_STRENGTH * (lampOn ? 1 : 0.8);
  const dark = Math.min(0.85, Math.max(0, (1 - ratio) * strength * 0.7));
  const lighten = Math.min(
    MAX_LIGHTEN,
    Math.max(0, (ratio - 1) * strength * 0.3) + sheen
  );
  return lighten > dark
    ? `rgba(246,242,232,${(lighten - dark).toFixed(3)})`
    : `rgba(18,14,10,${(dark - lighten).toFixed(3)})`;
};
