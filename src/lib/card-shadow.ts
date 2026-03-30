import type { CSSProperties } from "react";
import type { ShadowLightingState } from "./shadow-lighting";

export interface CardShadowContext {
  zIndex: number;
  maxZIndex: number;
  lighting?: ShadowLightingState;
}

export type CardShadowSurface = "canvas-filter" | "card-box-shadow";
export type CardShadowRole = "silhouette" | "surface" | "accent";
export type CardShadowTone = "default" | "paper" | "soft" | "raised";
export type CardShadowState = "rest" | "hover" | "expanded" | "focused";

export interface CardShadowOptions {
  surface: CardShadowSurface;
  role: CardShadowRole;
  tone?: CardShadowTone;
  state?: CardShadowState;
  zIndex?: number;
  maxZIndex?: number;
  lighting?: ShadowLightingState;
}

interface ShadowBlueprint {
  blur: number;
  offset: number;
  opacity: number;
  spread?: number;
}

export interface ShadowRecipeLayer {
  x: number;
  y: number;
  blur: number;
  opacity: number;
  spread: number;
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

const SHADOW_STATE_MULTIPLIERS: Record<
  CardShadowState,
  { blur: number; offset: number; opacity: number }
> = {
  rest: { blur: 1, offset: 1, opacity: 1 },
  hover: { blur: 1.05, offset: 1.08, opacity: 1.08 },
  expanded: { blur: 1.03, offset: 1.04, opacity: 1.04 },
  focused: { blur: 1.12, offset: 1.12, opacity: 1.14 },
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

const resolveTone = (role: CardShadowRole, tone?: CardShadowTone) => {
  if (tone) {
    return tone;
  }

  if (role === "accent") {
    return "soft";
  }

  return "default";
};

const getShadowBlueprints = (
  role: CardShadowRole,
  tone: CardShadowTone
): ShadowBlueprint[] => {
  switch (role) {
    case "silhouette":
      return [{ blur: 15.5, offset: 7.75, opacity: 0.138 }];
    case "surface":
      if (tone === "paper") {
        return [
          { blur: 8, offset: 3.6, opacity: 0.06, spread: -1 },
          { blur: 6, offset: 1.9, opacity: 0.08, spread: -2 },
        ];
      }

      return [{ blur: 14.5, offset: 7, opacity: 0.146, spread: -1 }];
    case "accent":
      if (tone === "raised") {
        return [
          { blur: 12.75, offset: 6.1, opacity: 0.154, spread: -1 },
          { blur: 5.5, offset: 2.6, opacity: 0.055, spread: -2 },
        ];
      }

      return [{ blur: 10.5, offset: 5.2, opacity: 0.136, spread: -1 }];
    default:
      return [{ blur: 14.5, offset: 7, opacity: 0.146, spread: -1 }];
  }
};

const resolveLayer = (
  layer: ShadowBlueprint,
  lighting: ShadowLightingState,
  depth: number,
  state: CardShadowState
): ShadowRecipeLayer => {
  const stateMultipliers = SHADOW_STATE_MULTIPLIERS[state];
  const angleInRadians = (lighting.angleDeg * Math.PI) / 180;
  const offsetDistance =
    layer.offset *
    stateMultipliers.offset *
    lighting.offsetScale *
    (1 + depth * 0.12);
  const blur =
    layer.blur *
    stateMultipliers.blur *
    lighting.blurScale *
    (1 + depth * 0.08);
  const opacity =
    layer.opacity *
    stateMultipliers.opacity *
    lighting.intensity *
    (1 + depth * 0.06);

  return {
    x: round(Math.cos(angleInRadians) * offsetDistance),
    y: round(Math.sin(angleInRadians) * offsetDistance),
    blur: round(blur),
    opacity: round(clamp(opacity, 0, 1)),
    spread: round(layer.spread ?? 0),
  };
};

const toDropShadow = (layer: ShadowRecipeLayer) =>
  `drop-shadow(${layer.x}px ${layer.y}px ${layer.blur}px rgba(0, 0, 0, ${layer.opacity}))`;

const toBoxShadow = (layer: ShadowRecipeLayer) =>
  `${layer.x}px ${layer.y}px ${layer.blur}px ${layer.spread}px rgba(0, 0, 0, ${layer.opacity})`;

export const getShadowRecipe = ({
  role,
  tone,
  state = "rest",
  zIndex,
  maxZIndex,
  lighting,
}: Omit<CardShadowOptions, "surface">): ShadowRecipeLayer[] => {
  const depth = getDepth(zIndex, maxZIndex);
  const shadowLighting = getLighting(lighting);
  const resolvedTone = resolveTone(role, tone);

  return getShadowBlueprints(role, resolvedTone).map((layer) =>
    resolveLayer(layer, shadowLighting, depth, state)
  );
};

export const getCardShadowStyle = ({
  surface,
  role,
  tone,
  state = "rest",
  zIndex,
  maxZIndex,
  lighting,
}: CardShadowOptions): CSSProperties => {
  const recipe = getShadowRecipe({
    role,
    tone,
    state,
    zIndex,
    maxZIndex,
    lighting,
  });

  if (surface === "canvas-filter") {
    return {
      filter: recipe.map(toDropShadow).join(" "),
    };
  }

  return {
    boxShadow: recipe.map(toBoxShadow).join(", "),
  };
};
