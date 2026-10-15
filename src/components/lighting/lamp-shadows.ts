import { type Linear2D, projectLampShadow } from "@/lib/lamp-shadow";
import {
  getFrameTransformCache,
  LAMP_HEIGHT,
  subscribeLamp,
} from "./desk-lamp";

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
  /** A folder's back panel lies on the desk under its papers. */
  folderBack: 2,
  /** A label stuck on a folder barely stands off it. */
  label: 1.5,
  /** Papers tucked in a closed folder lie almost flat. */
  flatPaper: 4,
  screenshot: 4,
  swag: 3,
} as const;

/** Extra height while the pointer hovers a caster, as when it is picked up. */
const HOVER_LIFT = 8;
/** How quickly a caster rises or settles, per second. */
const LIFT_RATE = 14;
/**
 * Moving casters ride higher, as a card does when it is picked up and
 * carried: extra height per canvas px/s of travel, up to a ceiling. Speed is
 * measured in canvas space, so camera pans lift nothing.
 */
const FLIGHT_LIFT_PER_SPEED = 0.008;
const MAX_FLIGHT_LIFT = 18;
/** The camera's content element from react-zoom-pan-pinch. */
const CAMERA_SELECTOR = ".react-transform-component";

type Linear = Linear2D;

interface CasterState {
  /** Last filter written; style.filter reads back normalized. */
  applied: string;
  filter: string;
  lift: number;
  /** Center in canvas px last frame, for its speed. */
  position: { x: number; y: number } | null;
  /** Smoothed speed in canvas px per second. */
  speed: number;
  transition: string;
}

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

const isHovered = (element: HTMLElement) =>
  element.matches(":hover") || element.closest(".group:hover") !== null;

/**
 * Points every caster's drop shadow away from the desk lamp. Each frame reads
 * all layout first, then writes the filters, so the pass never forces layout
 * between writes. Returns a function that restores the stylesheet shadows.
 */
export const startLampShadows = () => {
  const states = new Map<HTMLElement, CasterState>();
  let lastTime = performance.now();

  const restore = (element: HTMLElement, state: CasterState) => {
    element.style.filter = state.filter;
    element.style.transition = state.transition;
  };

  const unsubscribe = subscribeLamp((lamp) => {
    const now = performance.now();
    const elapsed = Math.max((now - lastTime) / 1000, 1 / 240);
    const follow = 1 - Math.exp(-elapsed * LIFT_RATE);
    lastTime = now;

    const casters = [
      ...document.querySelectorAll<HTMLElement>(`[${LAMP_SHADOW_ATTRIBUTE}]`),
    ];
    const present = new Set(casters);
    for (const [element, state] of states) {
      if (!present.has(element)) {
        restore(element, state);
        states.delete(element);
      }
    }

    const cache = getFrameTransformCache();
    const camera = document.querySelector(CAMERA_SELECTOR);
    const cameraLinear = screenLinear(camera, cache);
    const cameraScale = Math.sqrt(
      Math.abs(
        cameraLinear.a * cameraLinear.d - cameraLinear.b * cameraLinear.c
      )
    );
    const cameraOrigin = camera?.getBoundingClientRect() ?? { left: 0, top: 0 };

    // Read phase.
    const reads = casters.map((element) => ({
      element,
      height: Number(element.getAttribute(LAMP_SHADOW_ATTRIBUTE)) || 0,
      hovered: isHovered(element),
      linear: screenLinear(element, cache),
      rect: element.getBoundingClientRect(),
    }));

    // Write phase.
    for (const { element, height, hovered, linear, rect } of reads) {
      let state = states.get(element);
      if (!state) {
        state = {
          applied: "",
          filter: element.style.filter,
          lift: height,
          position: null,
          speed: 0,
          transition: element.style.transition,
        };
        states.set(element, state);
        // The lamp already eases; a CSS filter transition would lag behind it.
        element.style.transition = "none";
      }
      if (rect.width === 0 || cameraScale === 0) {
        continue;
      }
      const position = {
        x: (rect.left + rect.width / 2 - cameraOrigin.left) / cameraScale,
        y: (rect.top + rect.height / 2 - cameraOrigin.top) / cameraScale,
      };
      const speed = state.position
        ? Math.hypot(
            position.x - state.position.x,
            position.y - state.position.y
          ) / elapsed
        : 0;
      state.position = position;
      state.speed += (speed - state.speed) * follow;
      const targetLift =
        height +
        (hovered ? HOVER_LIFT : 0) +
        Math.min(state.speed * FLIGHT_LIFT_PER_SPEED, MAX_FLIGHT_LIFT);
      state.lift += (targetLift - state.lift) * follow;
      const shadow = projectLampShadow({
        center: {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        },
        lamp,
        lampHeight: LAMP_HEIGHT,
        lift: state.lift * cameraScale,
        linear,
      });
      if (!shadow) {
        continue;
      }
      const filter = `drop-shadow(${shadow.x.toFixed(1)}px ${shadow.y.toFixed(1)}px ${shadow.blur.toFixed(1)}px rgb(0 0 0 / ${shadow.opacity.toFixed(3)}))`;
      if (state.applied !== filter) {
        state.applied = filter;
        element.style.filter = filter;
      }
    }
  });

  return () => {
    unsubscribe();
    for (const [element, state] of states) {
      restore(element, state);
    }
    states.clear();
  };
};
