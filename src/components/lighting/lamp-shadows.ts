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

// Rotation and scale of one element, ignoring translation: offsets and blur
// are vectors and lengths, so only the linear part of a transform matters.
// CSS applies the individual `rotate` and `scale` properties before
// `transform`, and Tailwind and Motion use both.
const ownLinear = (element: Element): Linear => {
  const style = getComputedStyle(element);
  let linear = IDENTITY;
  if (style.rotate && style.rotate !== "none") {
    const parts = style.rotate.split(" ");
    const angle = parts.at(-1);
    if (angle) {
      linear = multiply(linear, toLinear(new DOMMatrix(`rotate(${angle})`)));
    }
  }
  if (style.scale && style.scale !== "none") {
    const [x = "1", y = x] = style.scale.split(" ");
    linear = multiply(linear, toLinear(new DOMMatrix(`scale(${x}, ${y})`)));
  }
  if (style.transform && style.transform !== "none") {
    linear = multiply(linear, toLinear(new DOMMatrix(style.transform)));
  }
  return linear;
};

/**
 * Maps a vector in the element's own CSS px to screen px. `cache` memoizes
 * shared ancestors within one frame.
 */
export const screenLinear = (
  element: Element | null,
  cache: Map<Element, Linear>
): Linear => {
  if (!element) {
    return IDENTITY;
  }
  const cached = cache.get(element);
  if (cached) {
    return cached;
  }
  const linear = multiply(
    screenLinear(element.parentElement, cache),
    ownLinear(element)
  );
  cache.set(element, linear);
  return linear;
};
