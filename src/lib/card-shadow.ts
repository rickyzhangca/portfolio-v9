import type { CSSProperties } from "react";
import type { ShadowLightingState } from "./shadow-lighting";

export interface CardShadowContext {
  z?: number;
  objectHeight?: number;
  lighting?: ShadowLightingState;
}

export type CardShadowSurface = "canvas-filter" | "card-box-shadow";

export interface CardShadowOptions {
  surface: CardShadowSurface;
  z?: number;
  objectHeight?: number;
  lighting?: ShadowLightingState;
}

interface ShadowBlueprint {
  blurBase: number;
  blurPerZ: number;
  blurPerElevation: number;
  offsetScale: number;
  opacity: number;
  opacityFalloff: number;
  spread: number;
}

export interface ShadowRecipeLayer {
  x: number;
  y: number;
  blur: number;
  opacity: number;
  spread: number;
}

const DEFAULT_LIGHTING: ShadowLightingState = {
  mode: "live",
  hour: 12,
  angleDeg: 90,
  intensity: 1,
  offsetScale: 1,
  blurScale: 1,
};

const DEFAULT_OBJECT_HEIGHT = 120;
const DEFAULT_Z = 8;

const SHADOW_BLUEPRINT: ShadowBlueprint = {
  blurBase: 4,
  blurPerZ: 0.25,
  blurPerElevation: 10,
  offsetScale: 0.5,
  opacity: 0.145,
  opacityFalloff: 0.85,
  spread: -1,
};

const round = (value: number, precision = 3) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getLighting = (lighting?: ShadowLightingState) =>
  lighting ?? DEFAULT_LIGHTING;

const resolveObjectHeight = (objectHeight?: number) => {
  if (typeof objectHeight === "number" && Number.isFinite(objectHeight)) {
    return Math.max(objectHeight, 1);
  }

  return DEFAULT_OBJECT_HEIGHT;
};

const resolveZ = (z?: number) => {
  if (typeof z === "number" && Number.isFinite(z)) {
    return Math.max(z, 0);
  }

  return DEFAULT_Z;
};

const resolveLayer = (
  lighting: ShadowLightingState,
  z: number,
  objectHeight: number
): ShadowRecipeLayer => {
  const angleInRadians = (lighting.angleDeg * Math.PI) / 180;
  const elevation = clamp(z / objectHeight, 0, 2);
  const offsetDistance = z * lighting.offsetScale * SHADOW_BLUEPRINT.offsetScale;
  const blur =
    (SHADOW_BLUEPRINT.blurBase +
      SHADOW_BLUEPRINT.blurPerZ * z +
      SHADOW_BLUEPRINT.blurPerElevation * elevation) *
    lighting.blurScale;
  const opacity =
    SHADOW_BLUEPRINT.opacity *
    lighting.intensity *
    Math.max(0.16, 1 - elevation * SHADOW_BLUEPRINT.opacityFalloff);

  return {
    x: round(Math.cos(angleInRadians) * offsetDistance),
    y: round(Math.sin(angleInRadians) * offsetDistance),
    blur: round(blur),
    opacity: round(clamp(opacity, 0, 1)),
    spread: SHADOW_BLUEPRINT.spread,
  };
};

const toDropShadow = (layer: ShadowRecipeLayer) =>
  `drop-shadow(${layer.x}px ${layer.y}px ${layer.blur}px rgba(0, 0, 0, ${layer.opacity}))`;

const toBoxShadow = (layer: ShadowRecipeLayer) =>
  `${layer.x}px ${layer.y}px ${layer.blur}px ${layer.spread}px rgba(0, 0, 0, ${layer.opacity})`;

const interpolateLayerValue = (from: number, to: number, progress: number) =>
  round(from + (to - from) * progress);

export const interpolateShadowRecipes = (
  from: ShadowRecipeLayer[],
  to: ShadowRecipeLayer[],
  progress: number
) => {
  const clampedProgress = clamp(progress, 0, 1);

  return from.map((fromLayer, index) => {
    const toLayer = to[index] ?? to[to.length - 1] ?? fromLayer;

    return {
      x: interpolateLayerValue(fromLayer.x, toLayer.x, clampedProgress),
      y: interpolateLayerValue(fromLayer.y, toLayer.y, clampedProgress),
      blur: interpolateLayerValue(fromLayer.blur, toLayer.blur, clampedProgress),
      opacity: interpolateLayerValue(
        fromLayer.opacity,
        toLayer.opacity,
        clampedProgress
      ),
      spread: interpolateLayerValue(
        fromLayer.spread,
        toLayer.spread,
        clampedProgress
      ),
    };
  });
};

export const toShadowFilter = (recipe: ShadowRecipeLayer[]) =>
  recipe.map(toDropShadow).join(" ");

export const toShadowBoxShadow = (recipe: ShadowRecipeLayer[]) =>
  recipe.map(toBoxShadow).join(", ");

export const getShadowRecipe = ({
  z,
  objectHeight,
  lighting,
}: Omit<CardShadowOptions, "surface">): ShadowRecipeLayer[] => {
  const resolvedZ = resolveZ(z);
  const resolvedObjectHeight = resolveObjectHeight(objectHeight);
  const shadowLighting = getLighting(lighting);

  return [resolveLayer(shadowLighting, resolvedZ, resolvedObjectHeight)];
};

export const getCardShadowStyle = ({
  surface,
  z,
  objectHeight,
  lighting,
}: CardShadowOptions): CSSProperties => {
  const recipe = getShadowRecipe({
    z,
    objectHeight,
    lighting,
  });

  if (surface === "canvas-filter") {
    return {
      filter: toShadowFilter(recipe),
    };
  }

  return {
    boxShadow: toShadowBoxShadow(recipe),
  };
};
