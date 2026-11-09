import { useEffect, useRef } from "react";
import { type CarGlow, createCarGlow } from "./car-glow";
import type { CarMaps } from "./car-renderer";
import { runLitSurface } from "./lit-surface";

/** Room around the car for its shadow, in local px. */
const SHADOW_MARGIN = 64;
/** How high the car's surfaces sit above the desk, on average, in local px. */
const SURFACE_HEIGHT = 24;
const NO_GLOW = createCarGlow();

interface LitCarProps {
  /** The car's own lights, which its effect writes every frame. */
  glow?: CarGlow;
  maps: CarMaps;
  onFail: () => void;
  onReady: () => void;
}

/**
 * Draws the toy time machine with WebGPU under the desk lamp: its photo
 * relit from its normals and surface maps, so highlights slide over the
 * steel and glass as the lamp moves, and its shadow. The DOM image under it
 * stays for alt text and gives way once this has drawn.
 */
export const LitCar = ({ glow, maps, onFail, onReady }: LitCarProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const callbacksRef = useRef({ onFail, onReady });

  useEffect(() => {
    callbacksRef.current = { onFail, onReady };
  }, [onFail, onReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const element = canvas?.parentElement;
    if (!(canvas && element)) {
      return;
    }
    let failed = false;
    const fail = () => {
      // The DOM car stays underneath and shows again.
      if (!failed) {
        failed = true;
        callbacksRef.current.onFail();
      }
    };
    return runLitSurface({
      attach: async (signal) => {
        const { attachCar } = await import("./car-renderer");
        return attachCar(canvas, maps, signal);
      },
      draw: (surface, { height, intensity, light, pixelScale, width }) => {
        const canvasWidth = width + SHADOW_MARGIN * 2;
        const canvasHeight = height + SHADOW_MARGIN * 2;
        const lights = (glow ?? NO_GLOW).lights.map((own) => ({
          ...own,
          x: own.x + SHADOW_MARGIN,
          y: own.y + SHADOW_MARGIN,
        })) as CarGlow["lights"];
        surface.render({
          glow: lights,
          height: canvasHeight,
          intensity,
          light: {
            x: light.x + SHADOW_MARGIN,
            y: light.y + SHADOW_MARGIN,
            z: light.z,
          },
          pixelHeight: Math.round(canvasHeight * pixelScale),
          pixelWidth: Math.round(canvasWidth * pixelScale),
          rect: [SHADOW_MARGIN, SHADOW_MARGIN, width, height],
          surfaceHeight: SURFACE_HEIGHT,
          width: canvasWidth,
        });
      },
      element,
      label: "Time machine lighting",
      onFail: fail,
      onReady: () => callbacksRef.current.onReady(),
      overhang: SHADOW_MARGIN,
      // A change in the car's own lights redraws it, as a lamp move does.
      step: () =>
        glow
          ? glow.lights.flatMap((light) =>
              light.intensity > 0
                ? [light.intensity * 20, light.x / 4, light.y / 4]
                : [0, 0, 0]
            )
          : [],
    });
  }, [glow, maps]);

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
