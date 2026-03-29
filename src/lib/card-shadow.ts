import type { CSSProperties } from "react";

export interface CardShadowContext {
  zIndex: number;
  maxZIndex: number;
}

export type CardShadowSurface = "canvas-filter" | "card-box-shadow";
export type CardShadowPreset = "default" | "cover" | "media" | "paper";
export type CardShadowState = "rest" | "hover";

export interface CardShadowOptions {
  surface: CardShadowSurface;
  preset: CardShadowPreset;
  state?: CardShadowState;
  zIndex?: number;
  maxZIndex?: number;
}

interface ShadowLayer {
  blur: number;
  offsetY: number;
  opacity: number;
  spread?: number;
}

const DEFAULT_DEPTH = 0.5;

const round = (value: number, precision = 3) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getDepth = (zIndex?: number, maxZIndex?: number) => {
  if (
    typeof zIndex !== "number" ||
    typeof maxZIndex !== "number" ||
    !Number.isFinite(zIndex) ||
    !Number.isFinite(maxZIndex) ||
    maxZIndex <= 0
  ) {
    return DEFAULT_DEPTH;
  }

  return clamp(zIndex / maxZIndex, 0, 1);
};

const toDropShadow = ({ blur, offsetY, opacity }: ShadowLayer) =>
  `drop-shadow(0 ${round(offsetY)}px ${round(blur)}px rgba(0, 0, 0, ${round(opacity)}))`;

const toBoxShadow = ({ blur, offsetY, opacity, spread = 0 }: ShadowLayer) =>
  `0 ${round(offsetY)}px ${round(blur)}px ${round(spread)}px rgba(0, 0, 0, ${round(opacity)})`;

const getCanvasShadowLayer = (
  preset: CardShadowPreset,
  state: CardShadowState,
  depth: number
): ShadowLayer => {
  const base = (() => {
    if (preset === "cover") {
      return state === "hover"
        ? { blur: 20, offsetY: 12, opacity: 0.32 }
        : { blur: 16, offsetY: 8, opacity: 0.16 };
    }

    return state === "hover"
      ? { blur: 24, offsetY: 12, opacity: 0.24 }
      : { blur: 16, offsetY: 16, opacity: 0.12 };
  })();

  return {
    blur: base.blur + depth * 4,
    offsetY: base.offsetY + depth * 2,
    opacity: base.opacity + depth * 0.02,
  };
};

const getCardShadowLayers = (
  preset: CardShadowPreset,
  state: CardShadowState,
  depth: number
): ShadowLayer[] => {
  switch (preset) {
    case "paper":
      return [
        {
          blur: 6 + depth * 1.5,
          offsetY: 4 + depth,
          opacity: 0.1 + depth * 0.015,
          spread: -1,
        },
        {
          blur: 4 + depth,
          offsetY: 2 + depth * 0.5,
          opacity: 0.1 + depth * 0.01,
          spread: -2,
        },
      ];
    case "media":
      if (state === "hover") {
        return [
          {
            blur: 60 + depth * 8,
            offsetY: 20 + depth * 3,
            opacity: 0.4 + depth * 0.04,
            spread: -15,
          },
        ];
      }

      return [
        {
          blur: 6 + depth * 2,
          offsetY: 2 + depth,
          opacity: 0.12 + depth * 0.02,
        },
      ];
    default:
      return [
        {
          blur: 16 + depth * 4,
          offsetY: 8 + depth * 2,
          opacity: 0.16 + depth * 0.02,
        },
      ];
  }
};

export const getCardShadowStyle = ({
  surface,
  preset,
  state = "rest",
  zIndex,
  maxZIndex,
}: CardShadowOptions): CSSProperties => {
  // Depth weighting stays intentionally conservative for now so this refactor
  // establishes the dynamic lighting seam without re-lighting the whole canvas.
  const depth = getDepth(zIndex, maxZIndex);

  if (surface === "canvas-filter") {
    return {
      filter: toDropShadow(getCanvasShadowLayer(preset, state, depth)),
    };
  }

  return {
    boxShadow: getCardShadowLayers(preset, state, depth)
      .map(toBoxShadow)
      .join(", "),
  };
};
