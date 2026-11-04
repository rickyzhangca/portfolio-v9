import {
  FOLD_COLUMNS,
  PANEL_HEIGHT,
  PANEL_WIDTH,
  SHEET_HEIGHT,
  SHEET_WIDTH,
} from "@/lib/map-fold";

/**
 * The street map's printed artwork, in sheet px: the paper, the frame and
 * furniture around the live map on the front, and the index, legend and
 * covers on the back.
 */

export const PAPER = "#f4f1e8";
const INK = "#1d1c1a";
const YELLOW = "#ffd21f";
/** Where nothing is drawn yet: the legend's "Not drawn yet". */
export const UNDRAWN = "#dfe6eb";
const FONT = "Helvetica Neue, Arial, sans-serif";

export interface PrintRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

/**
 * How the front is printed. A portrait sheet (phones held upright) is the
 * same paper turned a quarter: its print is laid out tall, then turned into
 * the sheet, so it reads upright once the open sheet is turned on screen.
 */
export interface PrintLayout {
  columns: number;
  /** The map's frame, in layout px. */
  frame: PrintRect;
  /** Sheet px to layout px, as a 2D matrix [a, b, c, d, e, f]. */
  fromSheet: readonly number[];
  height: number;
  rows: number;
  /** The title block over the lake, bottom left of the frame. */
  titleBlock: PrintRect;
  /** Layout px to sheet px, as a 2D matrix [a, b, c, d, e, f]. */
  toSheet: readonly number[];
  /** Whether the layout is the sheet turned a quarter clockwise. */
  turned: boolean;
  width: number;
}

const createLayout = (
  width: number,
  height: number,
  columns: number,
  rows: number,
  turned: boolean
): PrintLayout => {
  const frame = { height: height - 18 - 12, width: width - 24, x: 12, y: 18 };
  return {
    columns,
    frame,
    fromSheet: turned ? [0, 1, -1, 0, SHEET_HEIGHT, 0] : [1, 0, 0, 1, 0, 0],
    height,
    rows,
    titleBlock: {
      height: 48,
      width: 132,
      x: frame.x + 6,
      y: frame.y + frame.height - 54,
    },
    toSheet: turned ? [0, -1, 1, 0, 0, SHEET_HEIGHT] : [1, 0, 0, 1, 0, 0],
    turned,
    width,
  };
};

export const LANDSCAPE_PRINT = createLayout(
  SHEET_WIDTH,
  SHEET_HEIGHT,
  8,
  4,
  false
);
export const PORTRAIT_PRINT = createLayout(
  SHEET_HEIGHT,
  SHEET_WIDTH,
  4,
  8,
  true
);

const applyMatrix = (
  context: CanvasRenderingContext2D,
  [a, b, c, d, e, f]: readonly number[]
) => {
  context.transform(a, b, c, d, e, f);
};

/** Map metres per world px (Tiny Toronto's 0.293 m/px). */
const METRES_PER_PX = 300 / 1024;
const SCALE_STEPS = [50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10_000];

const STREETS = [
  "Bathurst St",
  "Bay St",
  "Bloor St W",
  "Broadview Ave",
  "Carlaw Ave",
  "College St",
  "Danforth Ave",
  "Dufferin St",
  "Dundas St W",
  "Eglinton Ave",
  "Front St",
  "Gerrard St E",
  "Harbord St",
  "Jarvis St",
  "Jane St",
  "Keele St",
  "King St W",
  "Kingston Rd",
  "Lake Shore Blvd",
  "Lansdowne Ave",
  "Leslie St",
  "Logan Ave",
  "Main St",
  "Ossington Ave",
  "Parliament St",
  "Pape Ave",
  "Queen St E",
  "Queens Quay",
  "Roncesvalles Ave",
  "Sherbourne St",
  "Spadina Ave",
  "St Clair Ave",
  "Sheppard Ave",
  "Steeles Ave",
  "University Ave",
  "Victoria Park",
  "Warden Ave",
  "Wellesley St",
  "Weston Rd",
  "Yonge St",
  "York Mills Rd",
  "Avenue Rd",
  "Bayview Ave",
  "Birchmount Rd",
  "Christie St",
  "Davenport Rd",
  "Don Mills Rd",
  "Eastern Ave",
  "Finch Ave",
  "Islington Ave",
  "Kipling Ave",
  "Lawrence Ave",
  "Markham Rd",
  "Midland Ave",
  "Mount Pleasant",
  "O'Connor Dr",
  "Rogers Rd",
  "Spring Garden",
  "Strachan Ave",
  "Symington Ave",
  "Woodbine Ave",
  "Annette St",
  "Bremner Blvd",
  "Cherry St",
  "Coxwell Ave",
  "Dovercourt Rd",
  "Gladstone Ave",
  "Greenwood Ave",
  "Humber Blvd",
  "Lowther Ave",
  "Manning Ave",
  "Niagara St",
];

/** A small seeded generator, so the paper wears the same way every time. */
const createRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 16_807) % 2_147_483_647;
    return state / 2_147_483_647;
  };
};

/** Smooth 1D noise in [0, 1]: seeded values every `period` px, eased between. */
const createNoise = (random: () => number, length: number, period: number) => {
  const values = Array.from({ length: Math.ceil(length / period) + 2 }, random);
  return (t: number) => {
    const at = t / period;
    const i = Math.floor(at);
    const f = at - i;
    const ease = f * f * (3 - 2 * f);
    return values[i] + (values[i + 1] - values[i]) * ease;
  };
};

const PAPER_LIGHT = "255,253,246";
/** Half the width of the paper's rounding over a fold, in sheet px. */
const BAND = 5;
const FIBRE_DARK = "20,18,16";

/**
 * Folds pressed into the paper. A crease is not a dashed rule: the fibres
 * break along one slightly wavering line, the paper rounds over it (a soft
 * light band along a mountain fold, a shaded one along a valley), and ink
 * cracks off the ridge in fine specks, more in some stretches than others
 * and most where folds cross or meet the edge. Accordion folds alternate
 * mountain and valley; the back of the sheet sees each the other way round.
 */
const drawCreases = (
  context: CanvasRenderingContext2D,
  seed: number,
  side: 1 | -1
) => {
  const random = createRandom(seed);
  context.save();
  /** A crease from (x0, y0) along unit (dx, dy), `length` px long. */
  const crease = (
    x0: number,
    y0: number,
    dx: number,
    dy: number,
    length: number,
    mountain: boolean,
    stress: readonly number[]
  ) => {
    const nx = -dy;
    const ny = dx;
    const wander = createNoise(random, length, 40);
    const wear = createNoise(random, length, 18);
    const depth = createNoise(random, length, 70);
    const offset = (t: number) => (wander(t) - 0.5) * 0.7;
    const near = (t: number) => {
      let closest = Number.POSITIVE_INFINITY;
      for (const point of stress) {
        closest = Math.min(closest, Math.abs(t - point));
      }
      return Math.max(0, 1 - closest / 26);
    };
    // The paper rounding over the fold: a soft band either side.
    const step = 4;
    for (let t = 0; t < length; t += step) {
      const strength = 0.55 + 0.45 * depth(t);
      const cx = x0 + dx * t + nx * offset(t);
      const cy = y0 + dy * t + ny * offset(t);
      const gradient = context.createLinearGradient(
        cx - nx * BAND,
        cy - ny * BAND,
        cx + nx * BAND,
        cy + ny * BAND
      );
      const tone = mountain ? PAPER_LIGHT : FIBRE_DARK;
      const peak = (mountain ? 0.08 : 0.07) * strength;
      gradient.addColorStop(0, `rgba(${tone},0)`);
      gradient.addColorStop(0.5, `rgba(${tone},${peak.toFixed(3)})`);
      gradient.addColorStop(1, `rgba(${tone},0)`);
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(cx - nx * BAND, cy - ny * BAND);
      context.lineTo(cx - nx * BAND + dx * step, cy - ny * BAND + dy * step);
      context.lineTo(cx + nx * BAND + dx * step, cy + ny * BAND + dy * step);
      context.lineTo(cx + nx * BAND, cy + ny * BAND);
      context.closePath();
      context.fill();
    }
    // The broken fibres: one hairline, shaded on its far side.
    context.lineWidth = 0.45;
    context.lineCap = "round";
    context.lineJoin = "round";
    const hairline = (shift: number, color: string) => {
      context.strokeStyle = color;
      context.beginPath();
      for (let t = 0; t <= length; t += 6) {
        const o = offset(t) + shift;
        const x = x0 + dx * t + nx * o;
        const y = y0 + dy * t + ny * o;
        if (t === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }
      context.stroke();
    };
    hairline(0, `rgba(${FIBRE_DARK},${mountain ? 0.04 : 0.08})`);
    hairline(mountain ? 0.6 : -0.6, `rgba(${PAPER_LIGHT},0.1)`);
    // Ink cracked off the ridge: specks, clustered by the wear noise.
    const rub = mountain ? 1 : 0.35;
    context.fillStyle = `rgb(${PAPER_LIGHT})`;
    for (let t = 0; t < length; t += 0.6) {
      const worn = wear(t) ** 5 * 0.8 + near(t) * 0.5;
      if (random() > worn * rub) {
        continue;
      }
      // Cracks run along the fold: thin streaks rather than dots.
      const along = 0.5 + random() * 1.6;
      const across = 0.12 + random() * 0.22;
      const o = offset(t) + (random() - 0.5) * 0.6;
      context.globalAlpha = 0.15 + random() * 0.35;
      context.beginPath();
      context.ellipse(
        x0 + dx * t + nx * o,
        y0 + dy * t + ny * o,
        along,
        across,
        Math.atan2(dy, dx),
        0,
        Math.PI * 2
      );
      context.fill();
    }
    context.globalAlpha = 1;
  };
  const crossings: number[] = [];
  for (let column = 1; column < FOLD_COLUMNS; column += 1) {
    crossings.push(column * PANEL_WIDTH);
  }
  for (const [i, x] of crossings.entries()) {
    crease(x, 0, 0, 1, SHEET_HEIGHT, (i % 2 === 0) === side > 0, [
      0,
      PANEL_HEIGHT,
      SHEET_HEIGHT,
    ]);
  }
  crease(0, PANEL_HEIGHT, 1, 0, SHEET_WIDTH, side < 0, [
    0,
    ...crossings,
    SHEET_WIDTH,
  ]);
  // Where folds cross, the paper is worked most: a small rubbed patch.
  for (const x of crossings) {
    const patch = context.createRadialGradient(
      x,
      PANEL_HEIGHT,
      0,
      x,
      PANEL_HEIGHT,
      4
    );
    patch.addColorStop(0, `rgba(${PAPER_LIGHT},0.2)`);
    patch.addColorStop(1, `rgba(${PAPER_LIGHT},0)`);
    context.fillStyle = patch;
    context.fillRect(x - 4, PANEL_HEIGHT - 4, 8, 8);
  }
  context.restore();
};

/** Draws in layout px onto a context whose transform maps them to the sheet. */
export const toSheetSpace = (
  context: CanvasRenderingContext2D,
  layout: PrintLayout
) => {
  applyMatrix(context, layout.toSheet);
};

/**
 * Everything printed on the front except the map itself and its scale:
 * grid, frame, title block and north arrow, in layout px over a
 * transparent print. The fold wear goes on in sheet px.
 */
export const drawFrontPrint = (
  context: CanvasRenderingContext2D,
  layout: PrintLayout
) => {
  const { height, width, x, y } = layout.frame;
  context.save();
  context.strokeStyle = "rgba(20,20,20,0.16)";
  context.lineWidth = 0.5;
  const columnWidth = width / layout.columns;
  const rowHeight = height / layout.rows;
  for (let i = 1; i < layout.columns; i += 1) {
    context.beginPath();
    context.moveTo(x + columnWidth * i, y);
    context.lineTo(x + columnWidth * i, y + height);
    context.stroke();
  }
  for (let i = 1; i < layout.rows; i += 1) {
    context.beginPath();
    context.moveTo(x, y + rowHeight * i);
    context.lineTo(x + width, y + rowHeight * i);
    context.stroke();
  }
  context.fillStyle = INK;
  context.font = `600 7px ${FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const [i, letter] of [
    ..."ABCDEFGH".slice(0, layout.columns),
  ].entries()) {
    context.fillText(letter, x + columnWidth * (i + 0.5), y / 2 + 1);
  }
  for (let i = 0; i < layout.rows; i += 1) {
    context.fillText(String(i + 1), x / 2, y + rowHeight * (i + 0.5));
  }
  context.strokeStyle = INK;
  context.lineWidth = 0.8;
  context.strokeRect(x, y, width, height);

  // Title block, over the lake.
  const block = layout.titleBlock;
  context.fillStyle = "rgba(255,253,246,0.94)";
  context.fillRect(block.x, block.y, block.width, block.height);
  context.fillStyle = YELLOW;
  context.fillRect(block.x, block.y, block.width, 5);
  // Stroked last, so the black rule frames the yellow band too.
  context.strokeRect(block.x, block.y, block.width, block.height);
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = INK;
  context.font = `700 8.5px ${FONT}`;
  context.fillText("toronto.rickyzhang.me", block.x + 9, block.y + 23);

  // North arrow.
  context.save();
  context.translate(x + width - 22, y + 24);
  context.beginPath();
  context.moveTo(0, -12);
  context.lineTo(5, 6);
  context.lineTo(0, 3);
  context.lineTo(-5, 6);
  context.closePath();
  context.fillStyle = INK;
  context.fill();
  context.font = `700 7px ${FONT}`;
  context.textAlign = "center";
  context.fillText("N", 0, -18);
  context.restore();
  context.restore();
  // The creases run across the sheet, however the print sits on it.
  context.save();
  applyMatrix(context, layout.fromSheet);
  drawCreases(context, 7, 1);
  context.restore();
};

/** The scale bar in the title block, for `scale` layout px per world px. */
export const drawScaleBar = (
  context: CanvasRenderingContext2D,
  scale: number,
  layout: PrintLayout
) => {
  const block = layout.titleBlock;
  const maxWidth = block.width - 40;
  const metresPerSheetPx = METRES_PER_PX / scale;
  let [metres] = SCALE_STEPS;
  for (const step of SCALE_STEPS) {
    if (step / metresPerSheetPx <= maxWidth) {
      metres = step;
    }
  }
  const width = metres / metresPerSheetPx;
  const x = block.x + 9;
  const y = block.y + 34;
  context.save();
  // Filled, not stroked: hairline strokes this thin dropped out unevenly.
  const rule = 0.7;
  context.fillStyle = INK;
  context.fillRect(x, y, width / 2, 3);
  context.fillRect(x, y, width, rule);
  context.fillRect(x, y + 3 - rule, width, rule);
  context.fillRect(x + width - rule, y, rule, 3);
  context.font = `600 5.6px ${FONT}`;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText(
    metres >= 1000 ? `${metres / 1000} km` : `${metres} m`,
    x + width + 4,
    y + 1.6
  );
  context.restore();
};

/**
 * The back of the sheet, laid out as seen from behind: back column b sits
 * behind front column 7 - b. `cover` is the booklet's cover artwork.
 */
export const drawSheetBack = (
  context: CanvasRenderingContext2D,
  cover: CanvasImageSource | null
) => {
  context.save();
  context.fillStyle = PAPER;
  context.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT);
  context.textBaseline = "alphabetic";
  context.textAlign = "left";
  const cell = (column: number, row: number) =>
    [column * PANEL_WIDTH, row * PANEL_HEIGHT] as const;

  // Street index across the middle panels.
  let k = 0;
  for (let column = 1; column <= 6; column += 1) {
    for (let row = 0; row < 2; row += 1) {
      const [x, y] = cell(column, row);
      let line = y + 20;
      if (column === 1 && row === 0) {
        context.font = `800 11px ${FONT}`;
        context.fillStyle = INK;
        context.fillText("Street Index", x + 10, line + 4);
        line += 20;
      }
      context.font = `500 6.2px ${FONT}`;
      for (; line < y + PANEL_HEIGHT - 12; line += 8.6) {
        const name = STREETS[k % STREETS.length];
        k += 1;
        context.fillStyle = INK;
        context.textAlign = "left";
        context.fillText(name, x + 10, line);
        context.fillStyle = "#6b6760";
        context.textAlign = "right";
        context.fillText(
          `${"ABCDEFGH"[(k * 5) % 8]}${((k * 3) % 4) + 1}`,
          x + PANEL_WIDTH - 10,
          line
        );
      }
    }
  }
  context.textAlign = "left";

  // Legend: the face on top once the cross fold opens.
  {
    const [x, y] = cell(0, 0);
    context.fillStyle = INK;
    context.fillRect(x, y, PANEL_WIDTH, 30);
    context.fillStyle = YELLOW;
    context.font = `800 11px ${FONT}`;
    context.fillText("Legend", x + 10, y + 20);
    const items = [
      ["#3f8a3a", "Parks & ravines"],
      ["#1f4f8f", "Lake Ontario"],
      ["#7d93b0", "Downtown towers"],
      ["#b9b5ac", "Highways"],
      [UNDRAWN, "Not drawn yet"],
    ] as const;
    context.font = `500 7px ${FONT}`;
    for (const [i, [color, label]] of items.entries()) {
      context.fillStyle = color;
      context.fillRect(x + 10, y + 44 + i * 18, 14, 10);
      context.fillStyle = INK;
      context.fillText(label, x + 30, y + 52 + i * 18);
    }
  }
  {
    const [x, y] = cell(0, 1);
    context.fillStyle = INK;
    context.font = `800 10px ${FONT}`;
    context.fillText("How it was made", x + 10, y + 22);
    context.font = `500 6.6px ${FONT}`;
    const lines = [
      "Every tile of this map was",
      "redrawn by image models from",
      "3D city data, then stitched",
      "into one zoomable picture.",
      "",
      "Explore the full map at",
      "toronto.rickyzhang.me",
    ];
    for (const [i, text] of lines.entries()) {
      context.fillText(text, x + 10, y + 40 + i * 10);
    }
  }
  // Wear first, then the covers over it: the cover's crease is the folded
  // booklet's outer edge, where a worn line read as a white rule.
  drawCreases(context, 11, -1);
  {
    // The cover, upside down: it shows once the top row turns over.
    const [x, y] = cell(7, 0);
    context.save();
    context.translate(x + PANEL_WIDTH, y + PANEL_HEIGHT);
    context.rotate(Math.PI);
    context.fillStyle = YELLOW;
    context.fillRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);
    if (cover) {
      context.drawImage(cover, 0, 0, PANEL_WIDTH, PANEL_HEIGHT);
    }
    context.restore();
  }
  {
    const [x, y] = cell(7, 1);
    context.fillStyle = YELLOW;
    context.fillRect(x, y, PANEL_WIDTH, PANEL_HEIGHT);
    context.fillStyle = INK;
    for (let i = 0; i < 34; i += 1) {
      context.fillRect(x + 22 + i * 2.2, y + 210, [0.6, 1.2, 1.8][i % 3], 30);
    }
    context.font = `600 6px ${FONT}`;
    context.fillText("Made in Toronto", x + 22, y + 252);
  }
  context.restore();
};

/**
 * Prints the map, a canvas of exactly the frame at `resolution` device px
 * per layout px, onto the sheet pixel for pixel: placed on whole device px,
 * never resampled. Printed as drawn, too: tinting it with the paper's cream,
 * washing it and knocking back its saturation made it warmer and duller than
 * the live map, and an off-register ghost plate softened every edge.
 */
export const printMap = (
  context: CanvasRenderingContext2D,
  map: CanvasImageSource,
  layout: PrintLayout,
  resolution: number
) => {
  const [a, b, c, d, e, f] = layout.toSheet;
  context.save();
  context.setTransform(a, b, c, d, e * resolution, f * resolution);
  context.drawImage(
    map,
    Math.round(layout.frame.x * resolution),
    Math.round(layout.frame.y * resolution)
  );
  context.restore();
};
