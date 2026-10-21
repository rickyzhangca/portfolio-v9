import { useEffect, useRef } from "react";
import type { MacbookSticker } from "@/cards/registry";
import { runLitSurface } from "./lit-surface";
import type { LitImage, LitQuad } from "./macbook-renderer";

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
/** How quickly the lid and stickers follow a hover, per second. */
const LIFT_RATE = 14;

const ease = (value: number, target: number, elapsed: number) =>
  value + (target - value) * (1 - Math.exp(-elapsed * LIFT_RATE));

/**
 * Draws the MacBook and its stickers with WebGPU under a desk lamp. It sits
 * inside the card, so it inherits the canvas camera and the card's own
 * transforms; the DOM images underneath stay for hit-testing and alt text.
 * It takes its turns in the lit surfaces' shared redraw queue: drawing on
 * every lamp step outside it took a turn every frame the others then lacked.
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
    let failed = false;
    const fail = () => {
      // The DOM laptop stays underneath and shows again.
      if (!failed) {
        failed = true;
        callbacksRef.current.onFail();
      }
    };

    const stop = runLitSurface({
      attach: async (signal) => {
        const { createMacbookRenderer } = await import("./macbook-renderer");
        const created = await createMacbookRenderer(canvas, images, signal);
        created.lost.then((info) => {
          if (!signal.aborted) {
            console.warn("MacBook lighting lost its GPU device", info);
            fail();
          }
        });
        return created;
      },
      draw: (renderer, { height, intensity, light, pixelScale, width }) => {
        const [lidSize] = renderer.sizes;
        if (!lidSize) {
          return;
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
            lift: stickerLifts[index] ?? STICKER_LIFT,
            pad: STICKER_PAD,
            width: sticker.width,
            x: CANVAS_MARGIN + (sticker.x / 100) * width - sticker.width / 2,
            y: CANVAS_MARGIN + (sticker.y / 100) * height - sticker.height / 2,
          })),
        ];
        const canvasWidth = width + CANVAS_MARGIN * 2;
        const canvasHeight = height + CANVAS_MARGIN * 2;
        renderer.render({
          height: canvasHeight,
          intensity,
          light: {
            x: light.x + CANVAS_MARGIN,
            y: light.y + CANVAS_MARGIN,
            z: light.z,
          },
          pixelHeight: Math.round(canvasHeight * pixelScale),
          pixelWidth: Math.round(canvasWidth * pixelScale),
          quads,
          width: canvasWidth,
        });
      },
      element: container,
      label: "MacBook lighting",
      onFail: fail,
      onReady: () => callbacksRef.current.onReady(),
      overhang: CANVAS_MARGIN,
      step: (elapsed) => {
        lidLift = ease(
          lidLift,
          cardHovered ? LID_HOVER_LIFT : LID_LIFT,
          elapsed
        );
        for (const [index, sticker] of stickers.entries()) {
          stickerLifts[index] = ease(
            stickerLifts[index] ?? STICKER_LIFT,
            hoveredRef.current === sticker.src
              ? STICKER_HOVER_LIFT
              : STICKER_LIFT,
            elapsed
          );
        }
        return [lidLift, ...stickerLifts];
      },
    });

    return () => {
      stop();
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
