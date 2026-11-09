import type { Linear2D } from "@/lib/lamp-shadow";

/**
 * Elements that cast a shadow under the desk lamp carry this attribute; its
 * value is their height above the desk in canvas px (scaled by the camera).
 */
export const LAMP_SHADOW_ATTRIBUTE = "data-lamp-shadow";

/**
 * Casters whose outline is their own rounded border box (papers, prints,
 * pills) also take a contact shadow, as a box-shadow: it depends only on
 * how far they are lifted, so it repaints on a hover or drag and stays put
 * while the lamp moves. Chained into the per-frame drop-shadow filter it
 * doubled that filter's cost, and fast sweeps dropped every fifth frame.
 */
export const LAMP_CONTACT_ATTRIBUTE = "data-lamp-contact";

/**
 * Multiplies a caster's lamp shadow opacity: heavy, dark objects (folders)
 * read as thin as a sheet of paper at the shared strength. 1 when absent.
 */
export const LAMP_DEPTH_ATTRIBUTE = "data-lamp-depth";

/** Lamp shadow opacity multipliers for casters heavier than a sheet. */
export const LAMP_DEPTH = {
  /**
   * Folder covers: dark boards with papers inside. Raising their lift
   * instead spread the same darkness thinner, so the shadow next to the
   * cover got lighter; deepening it keeps its shape and reads ~40% darker.
   */
  folder: 1.6,
} as const;

/** Heights above the desk, in canvas px, for each kind of caster. */
export const LAMP_LIFT = {
  /** Caption pills sit on the desk beside their print. */
  caption: 6,
  card: 12,
  dragged: 28,
  /** Papers tucked in a closed folder lie almost flat. */
  flatPaper: 4,
  /** A folder's back panel lies on the desk under its papers. */
  folderBack: 2,
  /** Fun-project icons are thick keycaps standing on the desk. */
  keycap: 6,
  /** A label stuck on a folder barely stands off it. */
  label: 1.5,
  screenshot: 4,
  swag: 3,
} as const;

/**
 * A hovered card's shadow reach in local px. Culling reserves three times
 * this for higher flight lifts and their blur; bitmap margins follow the
 * actual blur instead.
 */
export const LAMP_SHADOW_MARGIN = 72;

type Linear = Linear2D;

const IDENTITY: Linear = { a: 1, b: 0, c: 0, d: 1 };

const multiply = (left: Linear, right: Linear): Linear => ({
  a: left.a * right.a + left.c * right.b,
  b: left.b * right.a + left.d * right.b,
  c: left.a * right.c + left.c * right.d,
  d: left.b * right.c + left.d * right.d,
});

const toLinear = (matrix: DOMMatrix): Linear => ({
  a: matrix.a,
  b: matrix.b,
  c: matrix.c,
  d: matrix.d,
});

export const createTransformCache = () => ({
  bounds: new Map<Element, DOMRect>(),
  linear: new Map<Element, Linear>(),
  matrices: new Map<string, Linear>(),
  styles: new Map<Element, CSSStyleDeclaration>(),
});

type TransformCache = ReturnType<typeof createTransformCache>;

const transformStyle = (element: Element, cache: TransformCache) => {
  let style = cache.styles.get(element);
  if (!style) {
    style = getComputedStyle(element);
    cache.styles.set(element, style);
  }
  return style;
};

const IDENTITY_MATRIX = "matrix(1, 0, 0, 1, 0, 0)";

export const hasOwnTransform = (element: Element, cache: TransformCache) => {
  const style = transformStyle(element, cache);
  return (
    (style.transform !== "none" && style.transform !== IDENTITY_MATRIX) ||
    style.translate !== "none" ||
    style.rotate !== "none" ||
    style.scale !== "none"
  );
};

export const screenBounds = (element: Element, cache: TransformCache) => {
  let rect = cache.bounds.get(element);
  if (!rect) {
    rect = element.getBoundingClientRect();
    cache.bounds.set(element, rect);
  }
  return rect;
};

/** Leave room for shadows that reach on screen while their caster does not. */
export const isLampVisible = (rect: DOMRect, margin = LAMP_SHADOW_MARGIN * 3) =>
  rect.width > 0 &&
  rect.height > 0 &&
  rect.right >= -margin &&
  rect.bottom >= -margin &&
  rect.left <= window.innerWidth + margin &&
  rect.top <= window.innerHeight + margin;

const parseLinear = (value: string, cache: TransformCache) => {
  let linear = cache.matrices.get(value);
  if (!linear) {
    linear = toLinear(new DOMMatrix(value));
    cache.matrices.set(value, linear);
  }
  return linear;
};

// Rotation and scale of one element, ignoring translation: offsets and blur
// are vectors and lengths, so only the linear part of a transform matters.
// CSS applies the individual `rotate` and `scale` properties before
// `transform`, and Tailwind and Motion use both.
const ownLinear = (element: Element, cache: TransformCache): Linear => {
  const style = transformStyle(element, cache);
  let linear = IDENTITY;
  if (style.rotate && style.rotate !== "none") {
    const parts = style.rotate.split(" ");
    const angle = parts.at(-1);
    if (angle) {
      linear = multiply(linear, parseLinear(`rotate(${angle})`, cache));
    }
  }
  if (style.scale && style.scale !== "none") {
    const [x = "1", y = x] = style.scale.split(" ");
    linear = multiply(linear, { a: Number(x), b: 0, c: 0, d: Number(y) });
  }
  if (
    style.transform &&
    style.transform !== "none" &&
    style.transform !== IDENTITY_MATRIX
  ) {
    linear = multiply(linear, parseLinear(style.transform, cache));
  }
  return linear;
};

/**
 * Maps a vector in the element's own CSS px to screen px. `cache` memoizes
 * shared ancestors within one frame.
 */
export const screenLinear = (
  element: Element | null,
  cache: TransformCache
): Linear => {
  if (!element) {
    return IDENTITY;
  }
  const cached = cache.linear.get(element);
  if (cached) {
    return cached;
  }
  const linear = multiply(
    screenLinear(element.parentElement, cache),
    ownLinear(element, cache)
  );
  cache.linear.set(element, linear);
  return linear;
};
