import type { CSSProperties } from "react";
import type { ShadowLightingState } from "./shadow-lighting";

export interface CardShadowContext {
  zIndex: number;
  maxZIndex: number;
  lighting?: ShadowLightingState;
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
  lighting?: ShadowLightingState;
}

interface ShadowLayer {
  blur: number;
  offset: number;
  opacity: number;
  spread?: number;
}

const DEFAULT_DEPTH = 0.5;
const DEFAULT_LIGHTING: ShadowLightingState = {
  mode: "live",
  hour: 12,
  angleDeg: 90,
  intensity: 1,
  offsetScale: 1,
  blurScale: 1,
};

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

const getLighting = (lighting?: ShadowLightingState) =>
  lighting ?? DEFAULT_LIGHTING;

const getShadowOffset = (
  offset: number,
  angleDeg: number,
  offsetScale: number,
  depth: number
) => {
  const angleInRadians = (angleDeg * Math.PI) / 180;
  const distance = offset * offsetScale * (1 + depth * 0.15);

  return {
    x: round(Math.cos(angleInRadians) * distance),
    y: round(Math.sin(angleInRadians) * distance),
  };
};

const getBlur = (blur: number, blurScale: number, depth: number) =>
  round(blur * blurScale * (1 + depth * 0.1));

const getOpacity = (opacity: number, intensity: number, depth: number) =>
  round(clamp(opacity * intensity * (1 + depth * 0.08), 0, 1));

const toDropShadow = (
  layer: ShadowLayer,
  lighting: ShadowLightingState,
  depth: number
) => {
  const { x, y } = getShadowOffset(
    layer.offset,
    lighting.angleDeg,
    lighting.offsetScale,
    depth
  );

  return `drop-shadow(${x}px ${y}px ${getBlur(layer.blur, lighting.blurScale, depth)}px rgba(0, 0, 0, ${getOpacity(layer.opacity, lighting.intensity, depth)}))`;
};

const toBoxShadow = (
  layer: ShadowLayer,
  lighting: ShadowLightingState,
  depth: number
) => {
  const { x, y } = getShadowOffset(
    layer.offset,
    lighting.angleDeg,
    lighting.offsetScale,
    depth
  );

  return `${x}px ${y}px ${getBlur(layer.blur, lighting.blurScale, depth)}px ${round(layer.spread ?? 0)}px rgba(0, 0, 0, ${getOpacity(layer.opacity, lighting.intensity, depth)})`;
};

const getCanvasShadowLayer = (
  preset: CardShadowPreset,
  state: CardShadowState,
  depth: number
): ShadowLayer => {
  const base = (() => {
    if (preset === "cover") {
      return state === "hover"
        ? { blur: 20, offset: 12, opacity: 0.38 }
        : { blur: 16, offset: 8, opacity: 0.2 };
    }

    return state === "hover"
      ? { blur: 24, offset: 12, opacity: 0.24 }
      : { blur: 16, offset: 16, opacity: 0.12 };
  })();

  return {
    blur: base.blur + depth * 4,
    offset: base.offset + depth * 2,
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
          offset: 4 + depth,
          opacity: 0.1 + depth * 0.015,
          spread: -1,
        },
        {
          blur: 4 + depth,
          offset: 2 + depth * 0.5,
          opacity: 0.1 + depth * 0.01,
          spread: -2,
        },
      ];
    case "media":
      if (state === "hover") {
        return [
          {
            blur: 60 + depth * 8,
            offset: 20 + depth * 3,
            opacity: 0.4 + depth * 0.04,
            spread: -15,
          },
        ];
      }

      return [
        {
          blur: 6 + depth * 2,
          offset: 2 + depth,
          opacity: 0.12 + depth * 0.02,
        },
      ];
    default:
      return [
        {
          blur: 16 + depth * 4,
          offset: 8 + depth * 2,
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
  lighting,
}: CardShadowOptions): CSSProperties => {
  // Depth weighting stays intentionally conservative for now so this refactor
  // establishes the dynamic lighting seam without re-lighting the whole canvas.
  const depth = getDepth(zIndex, maxZIndex);
  const shadowLighting = getLighting(lighting);

  if (surface === "canvas-filter") {
    return {
      filter: toDropShadow(
        getCanvasShadowLayer(preset, state, depth),
        shadowLighting,
        depth
      ),
    };
  }

  return {
    boxShadow: getCardShadowLayers(preset, state, depth)
      .map((layer) => toBoxShadow(layer, shadowLighting, depth))
      .join(", "),
  };
};
