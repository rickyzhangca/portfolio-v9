import type { CanvasItem, Position } from "@/types/canvas";

/**
 * The scene enters as one wave from the top-left corner, where the camera
 * starts, so neighbouring cards land together and the eye reads the desk in
 * order. Rows count more than columns: the wave runs down the page the way a
 * visitor reads it.
 */
const WAVE_X_WEIGHT = 0.55;
const WAVE_Y_WEIGHT = 1;
/** Milliseconds of delay per pixel of wave distance. */
const WAVE_MS_PER_PX = 0.24;
/** No card starts later than this, however large the scene. */
export const MAX_ENTRANCE_STAGGER_MS = 520;
/** How long one card takes to settle; matches `canvas-item-rise` in CSS. */
export const ENTRANCE_RISE_MS = 820;
/**
 * When a card has visibly landed, for details that follow it: papers sliding
 * out of a folder, icons popping onto a card.
 */
export const ENTRANCE_LANDED_MS = 340;

const FALLBACK_SIZE = { height: 340, width: 240 } as const;

const getItemSize = (item: CanvasItem) => {
  const size =
    item.kind === "stack" || item.kind === "swagstack"
      ? item.cover.size
      : item.card.size;
  return {
    height: size.height ?? FALLBACK_SIZE.height,
    width: size.width ?? FALLBACK_SIZE.width,
  };
};

/** The item's resting center in canvas px; its entrance scales around it. */
export const getEntranceOrigin = (item: CanvasItem): Position => {
  const { height, width } = getItemSize(item);
  return {
    x: item.position.x + width / 2,
    y: item.position.y + height / 2,
  };
};

/**
 * Entrance delay per item, in milliseconds: it grows with the item's distance
 * along the wave from the canvas origin, capped so the far corner of a large
 * scene does not keep visitors waiting.
 */
export const getEntranceDelays = (
  items: Iterable<CanvasItem>
): Map<string, number> =>
  new Map(
    Array.from(items, (item) => {
      const origin = getEntranceOrigin(item);
      const distance = origin.x * WAVE_X_WEIGHT + origin.y * WAVE_Y_WEIGHT;
      return [
        item.id,
        Math.round(
          Math.min(distance * WAVE_MS_PER_PX, MAX_ENTRANCE_STAGGER_MS)
        ),
      ];
    })
  );

/** From the start of the wave until the last card has settled. */
export const ENTRANCE_DURATION_MS = MAX_ENTRANCE_STAGGER_MS + ENTRANCE_RISE_MS;
