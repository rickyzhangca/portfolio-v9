import { type BoundingBox, getExpandedContentBox } from "@/lib/auto-pan";
import type { CanvasLayout } from "@/lib/canvas-layout";
import type { FanConfig } from "@/lib/fan";
import type { CanvasItem, CanvasSingleItem } from "@/types/canvas";

/** Allowed camera positions (the transform's translate) along one axis. */
export interface PanRange {
  max: number;
  min: number;
}

export interface PanBounds {
  x?: PanRange;
  y?: PanRange;
}

interface Extent {
  max: number;
  min: number;
}

/** Room left below the last card so it is not jammed against the screen edge. */
const SCENE_END_MARGIN_PX = 48;
const DEFAULT_CARD_HEIGHT = 360;
const DEFAULT_FUN_COVER_HEIGHT = 156;

/**
 * Camera range that keeps `content` on screen. The content's start can reach
 * `startMargin` from the screen edge and its end `endMargin`. Content that is
 * shorter than the screen cannot scroll: it stays where the camera reveals it,
 * at the start margin or centered.
 */
export const getPanRange = (
  content: Extent,
  viewportSize: number,
  scale: number,
  margins: { end: number; start: number },
  fit: "start" | "center"
): PanRange => {
  const max = margins.start - content.min * scale;
  const min = viewportSize - margins.end - content.max * scale;
  if (min <= max) {
    return { max, min };
  }
  const pinned =
    fit === "center"
      ? viewportSize / 2 - ((content.min + content.max) / 2) * scale
      : max;
  return { max: pinned, min: pinned };
};

export const clampToRange = (value: number, range: PanRange) =>
  Math.min(range.max, Math.max(range.min, value));

const getItemBottom = (item: CanvasItem) => {
  switch (item.kind) {
    case "single":
      return item.position.y + (item.card.size.height ?? DEFAULT_CARD_HEIGHT);
    case "funstack":
      return (
        item.position.y + (item.card.size.height ?? DEFAULT_FUN_COVER_HEIGHT)
      );
    default:
      return item.position.y + (item.cover.size.height ?? DEFAULT_CARD_HEIGHT);
  }
};

interface CompactPanBoundsOptions {
  expandedStackId: string | null;
  fanConfig: FanConfig;
  focusedItemId: string | null;
  funContentHeights: Readonly<Record<string, number>>;
  getFocusScale: (item: CanvasSingleItem) => number;
  items: ReadonlyMap<string, CanvasItem>;
  layout: CanvasLayout;
  stackPages: Readonly<Record<string, number>>;
  viewport: { height: number; scale: number; width: number };
}

/**
 * Phones show one column, so the camera may not wander into empty canvas: the
 * resting scene scrolls from its top to its last card, an opened folder across
 * its own cards, and the focused laptop across its enlarged body. Sideways
 * movement is otherwise locked, so `x` is only returned for the laptop.
 * Returns null on layouts that keep free panning.
 */
export const getCompactPanBounds = ({
  expandedStackId,
  fanConfig,
  focusedItemId,
  funContentHeights,
  getFocusScale,
  items,
  layout,
  stackPages,
  viewport,
}: CompactPanBoundsOptions): PanBounds | null => {
  if (!layout.compact) {
    return null;
  }
  const { height, scale, width } = viewport;
  const margin = layout.autoPanMargin;
  const focused = focusedItemId ? items.get(focusedItemId) : undefined;
  if (focused?.kind === "single") {
    const focusScale = getFocusScale(focused);
    const cardWidth = focused.card.size.width ?? 0;
    const cardHeight = focused.card.size.height ?? DEFAULT_CARD_HEIGHT;
    // The card grows around its center.
    const centerX = focused.position.x + cardWidth / 2;
    const centerY = focused.position.y + cardHeight / 2;
    const halfWidth = (cardWidth * focusScale) / 2;
    const halfHeight = (cardHeight * focusScale) / 2;
    const margins = { end: margin, start: margin };
    return {
      x: getPanRange(
        { max: centerX + halfWidth, min: centerX - halfWidth },
        width,
        scale,
        margins,
        "center"
      ),
      y: getPanRange(
        { max: centerY + halfHeight, min: centerY - halfHeight },
        height,
        scale,
        margins,
        "center"
      ),
    };
  }
  const expanded = expandedStackId ? items.get(expandedStackId) : undefined;
  const box: BoundingBox | null = expanded
    ? getExpandedContentBox(expanded, {
        fanConfig,
        funContentHeight: funContentHeights[expanded.id],
        layout,
        page: stackPages[expanded.id] ?? 0,
      })
    : null;
  if (box) {
    return {
      y: getPanRange(
        { max: box.maxY, min: box.minY },
        height,
        scale,
        { end: margin, start: margin },
        "start"
      ),
    };
  }
  let sceneBottom = 0;
  for (const item of items.values()) {
    sceneBottom = Math.max(sceneBottom, getItemBottom(item));
  }
  return {
    y: getPanRange(
      { max: sceneBottom, min: 0 },
      height,
      scale,
      { end: SCENE_END_MARGIN_PX, start: 0 },
      "start"
    ),
  };
};
