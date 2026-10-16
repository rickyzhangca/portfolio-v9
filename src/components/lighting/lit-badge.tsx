import type { MotionValue } from "framer-motion";
import { type RefObject, useEffect, useRef } from "react";
import type { BadgeShape } from "./badge-renderer";
import { LAMP_LIFT } from "./lamp-shadows";
import { runLitSurface } from "./lit-surface";

interface LitBadgeProps {
  /** The photo on the front face; the next one is on the back. */
  indexRef: RefObject<number>;
  onReady: () => void;
  photos: string[];
  /** The flip, in degrees, as CSS rotateY. */
  rotation: MotionValue<number>;
}

/** Room around the badge for its shadow, in local px. */
const SHADOW_MARGIN = 72;
/** Matches the DOM flip's CSS perspective. */
const PERSPECTIVE = 1000;
/**
 * Raised a little under the pointer. Less than other cards (lamp-shadows.ts):
 * the lamp then hangs right overhead, and a small round badge's shadow would
 * spread into an even halo around it.
 */
const HOVER_LIFT = 3;
/** Tossed up as it flips: extra height when side on. */
const FLIP_LIFT = 22;
/** How quickly it rises or settles, per second. */
const LIFT_RATE = 14;

/** A pin badge about 7mm thick, with the DOM image's 6px white border. */
const badgeShape = (width: number): BadgeShape => ({
  dome: 2.5,
  halfThickness: 3,
  radius: width / 2,
  rim: 6,
});

/**
 * Draws the profile picture as a round pin badge with WebGPU: thick, domed
 * and glossy, turning in 3D as it flips, with its own shadow on the desk.
 * It sits beside the flipping DOM faces, inside the element that scales on
 * hover, so it follows the camera and the hover but turns only in the shader.
 */
export const LitBadge = ({
  indexRef,
  onReady,
  photos,
  rotation,
}: LitBadgeProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const element = canvas?.parentElement;
    if (!(canvas && element)) {
      return;
    }
    let isHovered = false;
    const handleEnter = () => {
      isHovered = true;
    };
    const handleLeave = () => {
      isHovered = false;
    };
    element.addEventListener("pointerenter", handleEnter);
    element.addEventListener("pointerleave", handleLeave);

    let lift: number = LAMP_LIFT.card;
    let angle = 0;
    let front = 0;

    const stop = runLitSurface({
      attach: async (signal) => {
        const { attachBadge } = await import("./badge-renderer");
        return attachBadge(canvas, photos, signal);
      },
      draw: (surface, { height, intensity, light, pixelScale, width }) =>
        surface.render({
          angle: (angle * Math.PI) / 180,
          back: (front + 1) % photos.length,
          front,
          height,
          intensity,
          lift,
          light,
          margin: SHADOW_MARGIN,
          perspective: PERSPECTIVE,
          pixelHeight: Math.round((height + SHADOW_MARGIN * 2) * pixelScale),
          pixelWidth: Math.round((width + SHADOW_MARGIN * 2) * pixelScale),
          shape: badgeShape(width),
          width,
        }),
      element,
      label: "Badge lighting",
      onReady: () => onReadyRef.current(),
      overhang: SHADOW_MARGIN,
      step: (elapsed) => {
        angle = rotation.get();
        front = indexRef.current;
        const target =
          LAMP_LIFT.card +
          (isHovered ? HOVER_LIFT : 0) +
          Math.abs(Math.sin((angle * Math.PI) / 180)) * FLIP_LIFT;
        lift += (target - lift) * (1 - Math.exp(-elapsed * LIFT_RATE));
        return [angle, lift, front];
      },
    });

    return () => {
      stop();
      element.removeEventListener("pointerenter", handleEnter);
      element.removeEventListener("pointerleave", handleLeave);
    };
  }, [indexRef, photos, rotation]);

  return (
    <canvas
      className="pointer-events-none absolute"
      ref={canvasRef}
      style={{
        height: `calc(100% + ${SHADOW_MARGIN * 2}px)`,
        left: -SHADOW_MARGIN,
        top: -SHADOW_MARGIN,
        width: `calc(100% + ${SHADOW_MARGIN * 2}px)`,
      }}
    />
  );
};
