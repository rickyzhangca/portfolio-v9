import type { Linear2D } from "@/lib/lamp-shadow";

/**
 * Elements that cast a shadow under the desk lamp carry this attribute; its
 * value is their height above the desk in canvas px (scaled by the camera).
 */
export const LAMP_SHADOW_ATTRIBUTE = "data-lamp-shadow";

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
