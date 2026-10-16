import { useEffect, useRef } from "react";
import type { MacbookSticker } from "@/cards/registry";
import { LAMP_HEIGHT, subscribeLamp } from "./desk-lamp";
import type { LitImage, LitQuad, MacbookRenderer } from "./macbook-renderer";

interface LitMacbookProps {
  hoveredSticker: string | null;
  lidSrc: string;
  onFail: () => void;
  onReady: () => void;
  stickers: MacbookSticker[];
}

/** Room around the card for shadows, in local px. */
const CANVAS_MARGIN = 128;
const LID_PAD = 120;
const STICKER_PAD = 24;
const LID_LIFT = 24;
const LID_HOVER_LIFT = 40;
const STICKER_LIFT = 2;
const STICKER_HOVER_LIFT = 9;
const FADE_IN_MS = 700;
const MAX_CANVAS_PIXELS = 4096;
/** Backing-store scale steps, so zooming does not reallocate every frame. */
const PIXEL_SCALE_STEP = 0.25;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Draws the MacBook and its stickers with WebGPU under a desk lamp. It sits
 * inside the card, so it inherits the canvas camera and the card's own
 * transforms; the DOM images underneath stay for hit-testing and alt text.
 */
export const LitMacbook = ({
  hoveredSticker,
  lidSrc,
  onFail,
  onReady,
  stickers,
}: LitMacbookProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoveredRef = useRef(hoveredSticker);
  const callbacksRef = useRef({ onFail, onReady });

  useEffect(() => {
    hoveredRef.current = hoveredSticker;
  }, [hoveredSticker]);

  useEffect(() => {
    callbacksRef.current = { onFail, onReady };
  }, [onFail, onReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!(canvas && container)) {
      return;
    }

    const abort = new AbortController();
    let renderer: MacbookRenderer | null = null;
    let unsubscribe: (() => void) | null = null;
    let cardHovered = false;
    const handleEnter = () => {
      cardHovered = true;
    };
    const handleLeave = () => {
      cardHovered = false;
    };
    container.addEventListener("pointerenter", handleEnter);
    container.addEventListener("pointerleave", handleLeave);

    const images: LitImage[] = [
      { kind: "lid", src: lidSrc },
      ...stickers.map((sticker) => ({
        kind: "sticker" as const,
        src: sticker.src,
      })),
    ];
    let lidLift = LID_LIFT;
    const stickerLifts = stickers.map(() => STICKER_LIFT);

    const fail = (error: unknown) => {
      if (!abort.signal.aborted) {
        console.warn("Desk lamp unavailable, keeping the DOM rendering", error);
        callbacksRef.current.onFail();
      }
    };

    const start = async () => {
      const { createMacbookRenderer } = await import("./macbook-renderer");
      const created = await createMacbookRenderer(canvas, images, abort.signal);
      if (abort.signal.aborted) {
        created.destroy();
        return;
      }
      renderer = created;
      created.lost.then(fail);

      const [lidSize] = created.sizes;
      let previousKey = "";
      let lastTime = performance.now();
      const fadeStart = lastTime;
      let announced = false;

      unsubscribe = subscribeLamp((lamp) => {
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        const rect = container.getBoundingClientRect();
        const screenScale = width ? rect.width / width : 0;
        // Off screen, the laptop keeps its last frame.
        if (
          !lidSize ||
          screenScale < 0.02 ||
          rect.right < 0 ||
          rect.bottom < 0 ||
          rect.left > window.innerWidth ||
          rect.top > window.innerHeight
        ) {
          return;
        }

        const now = performance.now();
        const follow = 1 - Math.exp(-((now - lastTime) / 1000) * 14);
        lastTime = now;
        const lidTarget = cardHovered ? LID_HOVER_LIFT : LID_LIFT;
        lidLift += (lidTarget - lidLift) * follow;
        for (const [index, sticker] of stickers.entries()) {
          const stickerTarget =
            hoveredRef.current === sticker.src
              ? STICKER_HOVER_LIFT
              : STICKER_LIFT;
          stickerLifts[index] += (stickerTarget - stickerLifts[index]) * follow;
        }

        // The lid image is drawn with object-contain, like the DOM image.
        const fit = Math.min(width / lidSize.width, height / lidSize.height);
        const lidWidth = lidSize.width * fit;
        const lidHeight = lidSize.height * fit;
        const quads: LitQuad[] = [
          {
            height: lidHeight,
            lift: lidLift,
            pad: LID_PAD,
            width: lidWidth,
            x: CANVAS_MARGIN + (width - lidWidth) / 2,
            y: CANVAS_MARGIN + (height - lidHeight) / 2,
          },
          ...stickers.map((sticker, index) => ({
            height: sticker.height,
            lift: stickerLifts[index],
            pad: STICKER_PAD,
            width: sticker.width,
            x: CANVAS_MARGIN + (sticker.x / 100) * width - sticker.width / 2,
            y: CANVAS_MARGIN + (sticker.y / 100) * height - sticker.height / 2,
          })),
        ];

        const canvasWidth = width + CANVAS_MARGIN * 2;
        const canvasHeight = height + CANVAS_MARGIN * 2;
        const pixelScale =
          Math.ceil(
            (screenScale * window.devicePixelRatio) / PIXEL_SCALE_STEP
          ) * PIXEL_SCALE_STEP;
        const limit = MAX_CANVAS_PIXELS / Math.max(canvasWidth, canvasHeight);
        const backingScale = Math.min(pixelScale, limit);
        const intensity = easeOutCubic(
          Math.min(1, (now - fadeStart) / FADE_IN_MS)
        );
        const light = {
          x: (lamp.x - rect.left) / screenScale + CANVAS_MARGIN,
          y: (lamp.y - rect.top) / screenScale + CANVAS_MARGIN,
          z: LAMP_HEIGHT / screenScale,
        };

        // Skip frames where nothing visible changed.
        const key = [
          light.x,
          light.y,
          light.z,
          intensity,
          backingScale,
          width,
          height,
          lidLift,
          ...stickerLifts,
        ]
          .map((value) => value.toFixed(1))
          .join();
        if (key === previousKey) {
          return;
        }
        previousKey = key;

        // Drawn after every lamp listener has read layout: resizing the
        // canvas would otherwise force layout for the listeners after it.
        return () => {
          try {
            created.render({
              height: canvasHeight,
              intensity,
              light,
              pixelHeight: Math.round(canvasHeight * backingScale),
              pixelWidth: Math.round(canvasWidth * backingScale),
              quads,
              width: canvasWidth,
            });
          } catch (error) {
            unsubscribe?.();
            fail(error);
            return;
          }
          if (!announced) {
            announced = true;
            callbacksRef.current.onReady();
          }
        };
      });
    };

    start().catch(fail);

    return () => {
      abort.abort();
      unsubscribe?.();
      renderer?.destroy();
      container.removeEventListener("pointerenter", handleEnter);
      container.removeEventListener("pointerleave", handleLeave);
    };
  }, [lidSrc, stickers]);

  return (
    <canvas
      className="pointer-events-none absolute"
      ref={canvasRef}
      style={{
        height: `calc(100% + ${CANVAS_MARGIN * 2}px)`,
        left: -CANVAS_MARGIN,
        top: -CANVAS_MARGIN,
        width: `calc(100% + ${CANVAS_MARGIN * 2}px)`,
      }}
    />
  );
};
