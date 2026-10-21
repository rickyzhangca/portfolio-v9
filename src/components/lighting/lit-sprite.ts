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

interface ImageRect {
  height: number;
  left: number;
  top: number;
  width: number;
}

interface Outline {
  blur: number;
  /** Screen px per own px when it was drawn. */
  screenScale: number;
  /** Bitmap's left and top within the caster, in its own px. */
  left: number;
  top: number;
}

/** The part of the image box an `object-contain` image covers. */
const containedRect = (image: HTMLImageElement): ImageRect => {
  const box = { height: image.offsetHeight, width: image.offsetWidth };
  const ratio = image.naturalWidth / image.naturalHeight;
  const width = Math.min(box.width, box.height * ratio);
  const height = width / ratio;
  return {
    height,
    left: image.offsetLeft + (box.width - width) / 2,
    top: image.offsetTop + (box.height - height) / 2,
    width,
  };
};

/**
 * Draws the image's outline blurred into the canvas, in the shadow's tint.
 * The blur is a canvas shadow cast from an image drawn off the bitmap:
 * WebKit ignores a 2D context's `filter`, and `shadowBlur` is twice the
 * Gaussian's deviation in both engines.
 */
const drawOutline = (
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  rect: ImageRect,
  blur: number,
  pixelScale: number
): Outline | null => {
  if (!(rect.width && rect.height)) {
    return null;
  }
  const margin = Math.ceil(blur * BLUR_REACH) + 1;
  const width = rect.width + margin * 2;
  const height = rect.height + margin * 2;
  canvas.width = Math.max(1, Math.round(width * pixelScale));
  canvas.height = Math.max(1, Math.round(height * pixelScale));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }
  const away = canvas.width + rect.width * pixelScale;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.shadowColor = SHADOW_COLOR;
  context.shadowBlur = blur * 2 * pixelScale;
  context.shadowOffsetX = away;
  context.drawImage(
    image,
    margin * pixelScale - away,
    margin * pixelScale,
    rect.width * pixelScale,
    rect.height * pixelScale
  );
  return {
    blur,
    left: rect.left - margin,
    screenScale: pixelScale / RESOLUTION,
    top: rect.top - margin,
  };
};

interface LampSpriteOptions {
  /** Lies inside the caster, under its content. */
  canvas: HTMLCanvasElement;
  /** Holds the image whose outline casts the shadow. */
  caster: HTMLElement;
}

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

/**
 * Casts a sticker's lamp shadow from a bitmap of its outline, blurred once,
 * in place of its drop-shadow filter (see `claimLampShadow`): each frame
 * only the bitmap's offset and opacity change, which the compositor applies
 * without blurring again. A swag collection of 123 stickers spent a third of
 * the GPU's time re-blurring their filters as the lamp moved. While a
 * sticker is lifted its blur grows past the bitmap's, and the filter draws
 * it. Returns the cleanup for an effect.
 */
export const runLampSprite = ({ canvas, caster }: LampSpriteOptions) => {
  let cancelled = false;
  let outline: Outline | null = null;
  let written = "";

  const hide = () => {
    if (written !== "hidden") {
      written = "hidden";
      canvas.style.opacity = "0";
    }
  };

  const place = (shadow: LampShadow, screenScale: number) => {
    if (!outline) {
      return;
    }
    const x = Math.round((outline.left + shadow.x) * screenScale * 4) / 4;
    const y = Math.round((outline.top + shadow.y) * screenScale * 4) / 4;
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

  // The lamp hands over the shadow before the bitmap is ready, so its blur
  // can be matched; the filter keeps drawing until then.
  const release = claimLampShadow(caster, { inside: true, ready: false });
  const unsubscribe = subscribeLamp((_lamp, time) => {
    const linear = screenLinear(caster, getFrameTransformCache());
    const screenScale = Math.sqrt(
      Math.abs(linear.a * linear.d - linear.b * linear.c)
    );
    const zoomed =
      outline !== null &&
      Math.abs(screenScale / outline.screenScale - 1) > ZOOM_DRIFT;
    // Layout is read here, with every other listener's reads, and only when
    // a bitmap may be drawn: read after the frame's writes, each bitmap
    // forced a layout of its own.
    let image = !outline || zoomed ? loadedImage(caster) : null;
    let rect = image ? containedRect(image) : null;
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
        (outline !== null &&
          Math.abs(shadow.blur - outline.blur) > outline.blur * BLUR_DRIFT);
      if (drifted && !image) {
        // The blur drifted with the lamp's settings, which is rare enough
        // to read layout here.
        image = loadedImage(caster);
        rect = image ? containedRect(image) : null;
      }
      if (!outline || drifted) {
        // Not loaded yet, or out of turns: the filter draws the shadow
        // meanwhile, or the old bitmap does.
        if (!(image && rect && takeOutlineTurn(time))) {
          if (outline) {
            place(shadow, screenScale);
          }
          return;
        }
        const first = !outline;
        outline = drawOutline(
          canvas,
          image,
          rect,
          shadow.blur,
          screenScale * RESOLUTION
        );
        written = "";
        if (!outline) {
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
