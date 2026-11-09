/**
 * Geometry for the time machine, modelled as one camera over a row of
 * windows. Every version is a window of the same size (the screen inset by
 * the same padding at the sides and top, and by more below, where an open
 * window's controls sit), laid out left to right from the present
 * into the past in world px. The camera says which world point sits in the
 * middle of the screen and how far it has zoomed out:
 *
 * - closed: scale 1 on the present, whose window then fills the screen;
 * - timeline: zoomed out, the present in the middle, earlier versions to its
 *   right, scrolled by sliding the camera;
 * - an earlier version open: scale 1 on its window, inset by the padding.
 *
 * Moving between these is moving the camera, so neighbours slide in and out
 * along the row instead of fading over each other.
 */

export interface Size {
  height: number;
  width: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

/** The world point shown in the middle of the screen, and the zoom. */
export interface Camera extends Point {
  scale: number;
}

/** Visual corner radius of every window, at any zoom. */
export const WINDOW_RADIUS_PX = 40;
/**
 * Room under each timeline window for its label and the step buttons beside
 * it (a gap and a 56px button), in screen px.
 */
export const LABEL_SPACE_PX = 76;
/** Added below an open window for its controls, in screen px. */
export const CONTROLS_SPACE_PX = 88;
/** Timeline windows stay within these shares of the screen. */
const MAX_TIMELINE_WIDTH_SHARE = 0.56;
const MAX_TIMELINE_HEIGHT_SHARE = 0.58;
/** Squircle (superellipse, exponent 4) handle length, as a share of radius. */
const SQUIRCLE_HANDLE = 0.909;

export interface TimelineGeometry {
  /** World px between an open window and the screen's bottom edge. */
  bottomPadding: number;
  /** Scroll that centers the last window; scroll runs from 0 to this. */
  maxScroll: number;
  /** World px between an open window and the screen's other edges. */
  padding: number;
  /** How far neighbours are pushed apart while one window is close. */
  push: number;
  /** World px from one window to the next. */
  step: number;
  /** Camera zoom of the timeline. */
  timelineScale: number;
  viewport: Size;
  /** Every window's size, in world px. */
  window: Size;
}

/** The gap at an open window's sides and top. */
export const getWindowPadding = ({ height, width }: Size) =>
  Math.round(Math.min(40, Math.max(20, Math.min(width, height) * 0.045)));

export const getTimelineGeometry = (
  viewport: Size,
  count: number
): TimelineGeometry => {
  const padding = getWindowPadding(viewport);
  const bottomPadding = padding + CONTROLS_SPACE_PX;
  const window = {
    height: Math.max(1, viewport.height - padding - bottomPadding),
    width: Math.max(1, viewport.width - padding * 2),
  };
  const timelineScale = Math.min(
    (viewport.width * MAX_TIMELINE_WIDTH_SHARE) / window.width,
    (viewport.height * MAX_TIMELINE_HEIGHT_SHARE) / window.height
  );
  // The gap reads the same on screen at any size; in world px it is wider
  // than the padding, so an open window's neighbours sit off screen.
  const gap = Math.max(40, viewport.width * 0.035) / timelineScale;
  const step = window.width + gap;
  return {
    bottomPadding,
    maxScroll: Math.max(0, count - 1) * step,
    padding,
    push: window.width * 0.22,
    step,
    timelineScale,
    viewport,
    window,
  };
};

/** Window `index`'s rectangle in world px; the present is 0. */
export const getWindowRect = (
  geometry: TimelineGeometry,
  index: number
): Rect => ({
  ...geometry.window,
  x: geometry.padding + index * geometry.step,
  y: geometry.padding,
});

/**
 * The camera with the screen filled by window `index`, inset by the padding
 * (the controls' room below it). Window 0 then rests as the whole canvas.
 */
export const getWindowCamera = (
  geometry: TimelineGeometry,
  index: number
): Camera => {
  const rect = getWindowRect(geometry, index);
  return {
    scale: 1,
    x: rect.x - geometry.padding + geometry.viewport.width / 2,
    y: rect.y - geometry.padding + geometry.viewport.height / 2,
  };
};

/**
 * The camera over the timeline, scrolled `scroll` world px into the past.
 * The row sits a little above the middle, leaving room for the labels.
 */
export const getTimelineCamera = (
  geometry: TimelineGeometry,
  scroll: number
): Camera => {
  const present = getWindowRect(geometry, 0);
  return {
    scale: geometry.timelineScale,
    x: present.x + present.width / 2 + scroll,
    y:
      present.y +
      present.height / 2 +
      LABEL_SPACE_PX / 2 / geometry.timelineScale,
  };
};

/** Where a world point lands on screen. */
export const toScreen = (
  viewport: Size,
  camera: Camera,
  point: Point
): Point => ({
  x: viewport.width / 2 + (point.x - camera.x) * camera.scale,
  y: viewport.height / 2 + (point.y - camera.y) * camera.scale,
});

/** The world point under a screen point. */
export const toWorld = (
  viewport: Size,
  camera: Camera,
  point: Point
): Point => ({
  x: camera.x + (point.x - viewport.width / 2) / camera.scale,
  y: camera.y + (point.y - viewport.height / 2) / camera.scale,
});

/** The window under a screen point, or null over empty space. */
export const getWindowAt = (
  geometry: TimelineGeometry,
  camera: Camera,
  point: Point,
  count: number
) => {
  const world = toWorld(geometry.viewport, camera, point);
  const index = Math.round(
    (world.x - geometry.padding - geometry.window.width / 2) / geometry.step
  );
  if (index < 0 || index >= count) {
    return null;
  }
  const rect = getWindowRect(geometry, index);
  const isInside =
    world.x >= rect.x &&
    world.x <= rect.x + rect.width &&
    world.y >= rect.y &&
    world.y <= rect.y + rect.height;
  return isInside ? index : null;
};

/** Whether window `index` lies wholly on screen, within half a px. */
export const isWindowInView = (
  geometry: TimelineGeometry,
  camera: Camera,
  index: number
) => {
  const rect = getWindowRect(geometry, index);
  const left = toScreen(geometry.viewport, camera, rect).x;
  const right = left + rect.width * camera.scale;
  return left >= -0.5 && right <= geometry.viewport.width + 0.5;
};

export const clampScroll = (scroll: number, max: number) =>
  Math.min(max, Math.max(0, scroll));

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * An SVG path of a rectangle with squircle corners (superellipse, exponent
 * 4, as CSS `corner-shape: squircle`), for `clip-path: path()`.
 */
export const getSquirclePath = (rect: Rect, radius: number) => {
  const { x, y, width, height } = rect;
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const k = r * SQUIRCLE_HANDLE;
  const right = x + width;
  const bottom = y + height;
  return [
    `M${round(x + r)} ${round(y)}`,
    `H${round(right - r)}`,
    `C${round(right - r + k)} ${round(y)} ${round(right)} ${round(y + r - k)} ${round(right)} ${round(y + r)}`,
    `V${round(bottom - r)}`,
    `C${round(right)} ${round(bottom - r + k)} ${round(right - r + k)} ${round(bottom)} ${round(right - r)} ${round(bottom)}`,
    `H${round(x + r)}`,
    `C${round(x + r - k)} ${round(bottom)} ${round(x)} ${round(bottom - r + k)} ${round(x)} ${round(bottom - r)}`,
    `V${round(y + r)}`,
    `C${round(x)} ${round(y + r - k)} ${round(x + r - k)} ${round(y)} ${round(x + r)} ${round(y)}`,
    "Z",
  ].join(" ");
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** "2025-01" → "Jan 2025". */
export const formatVersionDate = (date: string) => {
  const [year, month] = date.split("-");
  const name = MONTHS[Number(month) - 1];
  return name && year ? `${name} ${year}` : date;
};
