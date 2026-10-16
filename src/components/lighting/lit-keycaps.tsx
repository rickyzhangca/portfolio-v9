import { useEffect, useRef, useState } from "react";
import type { FunProjectItem, FunProjectKeycap } from "@/cards/registry";
import type { IconLiftEffect } from "@/lib/magnetic-lift";
import type { KeycapFrame } from "./keycaps-renderer";
import { runLitSurface } from "./lit-surface";

/** Marks the DOM icon each keycap stands in for; the lit caps measure it. */
const KEYCAP_ATTRIBUTE = "data-keycap";

interface LitKeycapsProps {
  /** The icons, in the order the DOM lays them out. */
  items: readonly FunProjectItem[];
  /** How the pointer lifts each icon, by index; y is negative, up. */
  lifts: ReadonlyMap<number, IconLiftEffect>;
  /** Loads the caps by title; the lit caps draw once every icon has one. */
  loadCaps: () => Promise<Readonly<Record<string, FunProjectKeycap>>>;
  onReady: () => void;
}

/**
 * Room around the caps for their shadows, in local px: a lifted cap's
 * shadow runs up to 1.6 times its height and blurs past that.
 */
const SHADOW_MARGIN = 96;
/**
 * A cap's shape as shares of its width: its corners (the icons' artwork has
 * 80 px corners on 288 px tops), its thickness, which stands taller than the
 * pictures' walls, and the radii its top rolls over and its foot tucks under
 * with.
 */
const CORNER_SHARE = 80 / 288;
const THICKNESS_SHARE = 0.22;
const ROLL_SHARE = 0.15;
const FOOT_SHARE = 0.05;
/** How quickly a cap follows the pointer's lift, per second. */
const LIFT_RATE = 20;

type Rect = KeycapFrame["top"];

interface CapLayout {
  thickness: number;
  top: Rect;
}

const ease = (value: number, target: number, rate: number, elapsed: number) =>
  value + (target - value) * (1 - Math.exp(-elapsed * rate));

// "#rrggbb" to sRGB channels from 0 to 1.
const hexToRgb = (hex: string) => {
  const channel = (start: number) =>
    Number.parseInt(hex.slice(start, start + 2), 16) / 255;
  return [channel(1), channel(3), channel(5)] as const;
};

// An icon's box in the card, ignoring transforms (its lift).
const offsetIn = (element: HTMLElement, root: HTMLElement) => {
  let x = 0;
  let y = 0;
  let current: HTMLElement | null = element;
  while (current && current !== root) {
    x += current.offsetLeft;
    y += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }
  return [x, y, element.offsetWidth, element.offsetHeight] as const;
};

// Each picture is a square top over its front wall. The cap stands on the
// same spot of the desk, its foot where the picture's ends, and rises above
// the picture by as much as it is thicker.
const measureCaps = (root: HTMLElement): CapLayout[] | null => {
  const icons = [
    ...root.querySelectorAll<HTMLElement>(`[${KEYCAP_ATTRIBUTE}]`),
  ].map((icon) => offsetIn(icon, root));
  // Until every picture has loaded, its box has no height to measure.
  if (
    icons.length === 0 ||
    icons.some(([, , width, height]) => height <= width)
  ) {
    return null;
  }
  return icons.map(([x, y, width, height]) => {
    const thickness = width * THICKNESS_SHARE;
    return {
      thickness,
      top: [x, y + height - width - thickness, width, width] as const,
    };
  });
};

/**
 * Draws the fun-project icons with WebGPU as plastic keycaps printed with
 * their icons, catching the lamp and shading the desk and each other as the
 * pointer lifts them. The DOM icons stay for layout, clicks and alt text.
 */
export const LitKeycaps = ({
  items,
  lifts,
  loadCaps,
  onReady,
}: LitKeycapsProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onReadyRef = useRef(onReady);
  const [caps, setCaps] = useState<readonly FunProjectKeycap[] | null>(null);
  const [isReady, setReady] = useState(false);
  // Read every frame by the drawing loop.
  const liftsRef = useRef(lifts);

  useEffect(() => {
    liftsRef.current = lifts;
  }, [lifts]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    let isCurrent = true;
    loadCaps()
      .then((table) => {
        const found = items.map((item) => table[item.title]);
        // An icon without a cap keeps every icon's picture.
        if (
          isCurrent &&
          found.every((cap): cap is FunProjectKeycap => cap !== undefined)
        ) {
          setCaps(found);
        }
      })
      .catch((error: unknown) => {
        console.warn("Keycaps unavailable", error);
      });
    return () => {
      isCurrent = false;
    };
  }, [items, loadCaps]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const element = canvas?.parentElement;
    if (!(caps && canvas && element)) {
      return;
    }
    const materials = caps.map((cap) => ({
      far: hexToRgb(cap.body[0]),
      grain: cap.grain ?? 0,
      near: hexToRgb(cap.body[1]),
    }));
    const liftAt = (index: number) => -(liftsRef.current.get(index)?.y ?? 0);
    const travel = caps.map((_, index) => liftAt(index));
    let layout = measureCaps(element);
    let layoutVersion = 0;
    let stop: (() => void) | null = null;

    const start = () => {
      if (stop || !layout) {
        return;
      }
      stop = runLitSurface({
        attach: async (signal) => {
          const { attachKeycaps } = await import("./keycaps-renderer");
          return attachKeycaps(
            canvas,
            caps.map((cap) => cap.glyph),
            signal
          );
        },
        draw: (surface, { height, intensity, light, pixelScale, width }) => {
          const current = layout ?? [];
          const size = current[0]?.top[2] ?? 0;
          surface.render({
            caps: current.flatMap((cap, index) => {
              const material = materials[index];
              return material
                ? [
                    {
                      ...material,
                      lift: travel[index] ?? 0,
                      thickness: cap.thickness,
                      top: cap.top,
                    },
                  ]
                : [];
            }),
            cornerRadius: size * CORNER_SHARE,
            foot: size * FOOT_SHARE,
            height,
            intensity,
            light,
            margin: SHADOW_MARGIN,
            pixelHeight: Math.round((height + SHADOW_MARGIN * 2) * pixelScale),
            pixelWidth: Math.round((width + SHADOW_MARGIN * 2) * pixelScale),
            roll: size * ROLL_SHARE,
            width,
          });
        },
        element,
        label: "Keycap lighting",
        onReady: () => {
          setReady(true);
          onReadyRef.current();
        },
        overhang: SHADOW_MARGIN,
        step: (elapsed) => {
          for (const [index, value] of travel.entries()) {
            travel[index] = ease(value, liftAt(index), LIFT_RATE, elapsed);
          }
          return [...travel, layoutVersion];
        },
      });
    };

    // Pictures that load late, or the card's width changing, move the caps.
    const resize = new ResizeObserver(() => {
      const measured = measureCaps(element);
      if (measured) {
        layout = measured;
        layoutVersion += 1;
        start();
      }
    });
    for (const icon of element.querySelectorAll(`[${KEYCAP_ATTRIBUTE}]`)) {
      resize.observe(icon);
    }
    start();

    return () => {
      resize.disconnect();
      stop?.();
    };
  }, [caps]);

  return (
    <canvas
      className="pointer-events-none absolute transition-opacity duration-300"
      ref={canvasRef}
      style={{
        height: `calc(100% + ${SHADOW_MARGIN * 2}px)`,
        left: -SHADOW_MARGIN,
        opacity: isReady ? 1 : 0,
        top: -SHADOW_MARGIN,
        width: `calc(100% + ${SHADOW_MARGIN * 2}px)`,
      }}
    />
  );
};
