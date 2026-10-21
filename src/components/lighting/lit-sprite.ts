import type { LampShadow } from "@/lib/lamp-shadow";
import { getFrameTransformCache, subscribeLamp } from "./desk-lamp";
import { screenLinear } from "./lamp-shadows";
import {
  claimLampShadow,
  getClaimedLampShadow,
  markLampShadowReady,
} from "./lit-shadow";

/**
 * Backing px per screen px: the outline is blurred a few px, so a coarse
 * bitmap holds it, a sixteenth of the sticker's pixels on a 2x screen.
 */
const RESOLUTION = 0.5;
/** The bitmap reaches this many blur deviations past the outline. */
const BLUR_REACH = 3;
/**
 * The bitmap holds one blur and one resolution; it is drawn again once the
 * camera zooms this far, or the blur drifts this far. A sticker's blur
 * varies by up to 28% with how far the lamp throws its shadow; redrawn at
 * a quarter, every sticker the lamp swept past drew its bitmap again.
 */
const ZOOM_DRIFT = 0.2;
const BLUR_DRIFT = 0.35;
/** Steps too small to show, in screen px, leave the sprite where it is. */
const SHADOW_STEP = 0.25;
const OPACITY_STEP = 0.002;
/**
 * The DOM shadows' tint and depth (lamp-shadow.ts): rgb(28 36 59), with
 * opacity raised 1.16x so the tint darkens as much as black would.
 */
const SHADOW_COLOR = "rgb(28 36 59)";
const SHADOW_DEPTH = 1.16;
/**
 * Bitmaps drawn per frame across every sticker. Opening the collection
 * mounts a hundred at once; drawn in one frame they held it for 100 ms, and
 * six a frame still made two frames late. Those waiting keep their filter
 * meanwhile, so the last stickers hand over half a second after landing.
 */
const OUTLINES_PER_FRAME = 4;

let outlineFrame = -1;
let outlinesDrawn = 0;

/** Takes one of this frame's bitmap turns, if any are left. */
const takeOutlineTurn = (time: number) => {
  if (time !== outlineFrame) {
    outlineFrame = time;
    outlinesDrawn = 0;
  }
  if (outlinesDrawn >= OUTLINES_PER_FRAME) {
    return false;
  }
  outlinesDrawn += 1;
  return true;
};

/** What casts the shadow, in the caster's own px, and how to fill it. */
interface Shape {
  fill: (context: CanvasRenderingContext2D) => void;
  height: number;
  left: number;
  top: number;
  width: number;
}

/**
 * The outline a sprite casts: the caster's image (a sticker, its alpha as
 * printed with `object-contain`), the rounded border box of its first other
 * child (a card), or an SVG path over its whole box (a folder cover's
 * mask), given with the path's own size.
 */
export type SpriteOutline =
  | "box"
  | "image"
  | { path: string; size: { height: number; width: number } };

/**
 * The caster's image once it has loaded. Read each time: the image loads
 * lazily, off screen, and the sticker's tooltip swaps it for a new element
 * once its module arrives.
 */
const loadedImage = (caster: HTMLElement) => {
  const image = caster.querySelector("img");
  return image?.complete && image.naturalWidth && image.offsetWidth
    ? image
    : null;
};

const imageShape = (caster: HTMLElement): Shape | null => {
  const image = loadedImage(caster);
  if (!image) {
    return null;
  }
  const box = { height: image.offsetHeight, width: image.offsetWidth };
  const ratio = image.naturalWidth / image.naturalHeight;
  const width = Math.min(box.width, box.height * ratio);
  const height = width / ratio;
  return {
    fill: (context) => context.drawImage(image, 0, 0, width, height),
    height,
    left: image.offsetLeft + (box.width - width) / 2,
    top: image.offsetTop + (box.height - height) / 2,
    width,
  };
};

const boxShape = (caster: HTMLElement): Shape | null => {
  const box = [...caster.children].find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.tagName !== "CANVAS"
  );
  if (!box) {
    return null;
  }
  const { height, width } = {
    height: box.offsetHeight,
    width: box.offsetWidth,
  };
  const radius = Number.parseFloat(getComputedStyle(box).borderTopLeftRadius);
  return {
    fill: (context) => {
      context.beginPath();
      context.roundRect(0, 0, width, height, radius || 0);
      context.fill();
    },
    height,
    left: box.offsetLeft,
    top: box.offsetTop,
    width,
  };
};

const pathShape = (
  caster: HTMLElement,
  { path, size }: { path: string; size: { height: number; width: number } }
): Shape => {
  const width = caster.offsetWidth;
  const height = caster.offsetHeight;
  return {
    fill: (context) => {
      context.scale(width / size.width, height / size.height);
      context.fill(new Path2D(path));
    },
    height,
    left: 0,
    top: 0,
    width,
  };
};

/** Reads the outline's place and size; layout, so in a lamp read phase. */
const readShape = (caster: HTMLElement, outline: SpriteOutline) => {
  if (outline === "image") {
    return imageShape(caster);
  }
  return outline === "box" ? boxShape(caster) : pathShape(caster, outline);
};

interface Drawn {
  blur: number;
  height: number;
  /** Bitmap's left and top within the caster, in its own px. */
  left: number;
  /** Screen px per own px when it was drawn. */
  screenScale: number;
  top: number;
  width: number;
}

/**
 * Draws the outline blurred into the canvas, in the shadow's tint. The blur
 * is a canvas shadow cast from a shape drawn off the bitmap: WebKit ignores
 * a 2D context's `filter`, and `shadowBlur` is twice the Gaussian's
 * deviation in both engines.
 */
const drawOutline = (
  canvas: HTMLCanvasElement,
  shape: Shape,
  blur: number,
  pixelScale: number
): Drawn | null => {
  if (!(shape.width && shape.height)) {
    return null;
  }
  const margin = Math.ceil(blur * BLUR_REACH) + 1;
  const width = shape.width + margin * 2;
  const height = shape.height + margin * 2;
  canvas.width = Math.max(1, Math.round(width * pixelScale));
  canvas.height = Math.max(1, Math.round(height * pixelScale));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }
  const away = canvas.width + shape.width * pixelScale;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.shadowColor = SHADOW_COLOR;
  context.shadowBlur = blur * 2 * pixelScale;
  context.shadowOffsetX = away;
  context.fillStyle = SHADOW_COLOR;
  context.save();
  context.translate(margin * pixelScale - away, margin * pixelScale);
  context.scale(pixelScale, pixelScale);
  shape.fill(context);
  context.restore();
  return {
    blur,
    height: shape.height,
    left: shape.left - margin,
    screenScale: pixelScale / RESOLUTION,
    top: shape.top - margin,
    width: shape.width,
  };
};

interface LampSpriteOptions {
  /** Lies inside the caster, under its content. */
  canvas: HTMLCanvasElement;
  caster: HTMLElement;
  outline: SpriteOutline;
}

/**
 * Casts a caster's lamp shadow from a bitmap of its outline, blurred once,
 * in place of its drop-shadow filter (see `claimLampShadow`): each frame
 * only the bitmap's offset and opacity change, which the compositor applies
 * without blurring again. Every frame the lamp moves, the compositor redraws
 * the whole desk, and with it re-blurs every filter on screen, changed or
 * not: an open swag collection of 123 stickers spent a third of the GPU's
 * time on them. While the caster is lifted its blur grows past the
 * bitmap's, and the filter draws it. Returns the cleanup for an effect.
 */
export const runLampSprite = ({
  canvas,
  caster,
  outline,
}: LampSpriteOptions) => {
  let cancelled = false;
  let drawn: Drawn | null = null;
  let written = "";

  const hide = () => {
    if (written !== "hidden") {
      written = "hidden";
      canvas.style.opacity = "0";
    }
  };

  const place = (shadow: LampShadow, screenScale: number) => {
    if (!drawn) {
      return;
    }
    const x = Math.round((drawn.left + shadow.x) * screenScale * 4) / 4;
    const y = Math.round((drawn.top + shadow.y) * screenScale * 4) / 4;
    const opacity = Math.min(shadow.opacity * SHADOW_DEPTH, 1);
    const key = `${x} ${y} ${opacity}`;
    if (key === written) {
      return;
    }
    const [lastX, lastY, lastOpacity] = written.split(" ").map(Number);
    if (
      lastX !== undefined &&
      lastY !== undefined &&
      lastOpacity !== undefined &&
      Math.max(Math.abs(x - lastX), Math.abs(y - lastY)) < SHADOW_STEP &&
      Math.abs(opacity - lastOpacity) < OPACITY_STEP
    ) {
      return;
    }
    written = key;
    canvas.style.transform = `translate(${x / screenScale}px, ${y / screenScale}px)`;
    canvas.style.opacity = opacity.toFixed(3);
  };

  // A card's box or a cover's size can change; an image's cannot once it
  // has loaded, so stickers skip the reads.
  const tracksSize = outline !== "image";

  // The lamp hands over the shadow before the bitmap is ready, so its blur
  // can be matched; the filter keeps drawing until then.
  const release = claimLampShadow(caster, { inside: true, ready: false });
  const unsubscribe = subscribeLamp((_lamp, time) => {
    const linear = screenLinear(caster, getFrameTransformCache());
    const screenScale = Math.sqrt(
      Math.abs(linear.a * linear.d - linear.b * linear.c)
    );
    const zoomed =
      drawn !== null &&
      Math.abs(screenScale / drawn.screenScale - 1) > ZOOM_DRIFT;
    // Layout is read here, with every other listener's reads, and only when
    // a bitmap may be drawn: read after the frame's writes, each bitmap
    // forced a layout of its own.
    let shape =
      !drawn || zoomed || tracksSize ? readShape(caster, outline) : null;
    const reshaped =
      drawn !== null &&
      shape !== null &&
      (Math.abs(shape.width - drawn.width) > 0.5 ||
        Math.abs(shape.height - drawn.height) > 0.5);
    // The lamp hands out this frame's shadow while its listener reads,
    // which may come after this one.
    queueMicrotask(() => {
      if (cancelled) {
        return;
      }
      const shadow = getClaimedLampShadow(caster);
      if (!(shadow && screenScale)) {
        hide();
        return;
      }
      const drifted =
        zoomed ||
        reshaped ||
        (drawn !== null &&
          Math.abs(shadow.blur - drawn.blur) > drawn.blur * BLUR_DRIFT);
      if (drifted && !shape) {
        // The blur drifted with the lamp's settings, which is rare enough
        // to read layout here.
        shape = readShape(caster, outline);
      }
      if (!drawn || drifted) {
        // Not loaded yet, or out of turns: the filter draws the shadow
        // meanwhile, or the old bitmap does.
        if (!(shape && takeOutlineTurn(time))) {
          if (drawn) {
            place(shadow, screenScale);
          }
          return;
        }
        const first = !drawn;
        drawn = drawOutline(
          canvas,
          shape,
          shadow.blur,
          screenScale * RESOLUTION
        );
        written = "";
        if (!drawn) {
          hide();
          return;
        }
        if (first) {
          markLampShadowReady(caster);
          // Shown from the next frame, when the lamp turns the filter off.
          hide();
          return;
        }
      }
      place(shadow, screenScale);
    });
  });

  return () => {
    cancelled = true;
    release();
    unsubscribe();
  };
};
