import type { CanvasItem } from "@/types/canvas";

/** Reading order of the phone scene; ids not listed follow in scene order. */
const COMPACT_ORDER = [
  "profilepic-item",
  "email-item",
  "socials-item",
  "github-stack",
  "wealthsimple-stack",
  "mintlify-stack",
  "rbc-stack",
  "mosaic-stack",
  "writing-stack",
  "resume-item",
  "about-item",
  "macbook-item",
  "fun-projects-stack",
  "swag-stack",
] as const;

/** Single cards that size themselves; measured from the rendered cards. */
const SELF_SIZED_FOOTPRINTS: Record<string, { height: number; width: number }> =
  {
    email: { height: 72, width: 296 },
    socials: { height: 96, width: 300 },
  };
const FUN_COVER_HEIGHT_ESTIMATE = 156;
const DEFAULT_CARD_HEIGHT = 360;
const DEFAULT_CARD_WIDTH = 240;
const PROJECT_CARD_MAX_WIDTH = 350;
const FUN_COVER_MAX_WIDTH = 360;
const SIDE_MARGIN_PX = 16;
const TOP_MARGIN_PX = 32;
const ROW_GAP_PX = 40;
/** Small header cards sit closer together than the large folders below. */
const SMALL_ROW_GAP_PX = 24;
/** Collapsed swag fans out above its cover, so it needs room over the row above. */
const OVERHANG_ABOVE_PX: Readonly<Record<string, number>> = {
  "swag-stack": 80,
};
const SMALL_CARD_MAX_HEIGHT_PX = 120;
/** How far alternating cards drift off the centre line. */
const MAX_SWAY_PX = 20;
const PROFILE_INSET_PX = 24;

interface Footprint {
  height: number;
  width: number;
}

const fitToViewport = (width: number, viewportWidth: number) =>
  Math.min(width, viewportWidth - SIDE_MARGIN_PX * 2);

/** Resize cards that would otherwise be wider than the screen. */
const adaptItem = (item: CanvasItem, viewportWidth: number): CanvasItem => {
  if (item.kind === "stack") {
    return {
      ...item,
      stack: item.stack.map((card) =>
        card.kind === "project"
          ? {
              ...card,
              size: {
                ...card.size,
                width: fitToViewport(
                  card.size.width ?? PROJECT_CARD_MAX_WIDTH,
                  viewportWidth
                ),
              },
            }
          : card
      ),
    };
  }
  if (item.kind === "funstack") {
    return {
      ...item,
      card: {
        ...item.card,
        size: {
          ...item.card.size,
          width: fitToViewport(
            item.card.size.width ?? FUN_COVER_MAX_WIDTH,
            viewportWidth
          ),
        },
      },
    };
  }
  return item;
};

const getFootprint = (item: CanvasItem): Footprint => {
  if (item.kind === "single") {
    const fallback = SELF_SIZED_FOOTPRINTS[item.card.kind];
    return {
      height: item.card.size.height ?? fallback?.height ?? DEFAULT_CARD_HEIGHT,
      width: item.card.size.width ?? fallback?.width ?? DEFAULT_CARD_WIDTH,
    };
  }
  if (item.kind === "funstack") {
    return {
      height: item.card.size.height ?? FUN_COVER_HEIGHT_ESTIMATE,
      width: item.card.size.width ?? DEFAULT_CARD_WIDTH,
    };
  }
  return {
    height: item.cover.size.height ?? DEFAULT_CARD_HEIGHT,
    width: item.cover.size.width ?? DEFAULT_CARD_WIDTH,
  };
};

const getOrderRank = (item: CanvasItem) => {
  const rank = COMPACT_ORDER.indexOf(item.id as (typeof COMPACT_ORDER)[number]);
  return rank === -1 ? COMPACT_ORDER.length : rank;
};

/**
 * Re-flows the desktop scene into a single column that fits a phone: cards
 * alternate slightly left and right of centre so it still reads as a table
 * of cards rather than a list. Collapsed cards and their repulsion keep the
 * same geometry as on desktop.
 */
export const createCompactScene = (
  items: readonly CanvasItem[],
  viewportWidth: number
): CanvasItem[] => {
  const ordered = items
    .map((item, index) => ({ index, item: adaptItem(item, viewportWidth) }))
    .sort(
      (a, b) => getOrderRank(a.item) - getOrderRank(b.item) || a.index - b.index
    );
  let y = TOP_MARGIN_PX;
  return ordered.map(({ item }, position) => {
    const { height, width } = getFootprint(item);
    const slack = viewportWidth - width - SIDE_MARGIN_PX * 2;
    let x: number;
    if (item.id === "profilepic-item") {
      x = PROFILE_INSET_PX;
    } else if (slack <= 0) {
      x = Math.max(0, (viewportWidth - width) / 2);
    } else {
      const sway = Math.min(MAX_SWAY_PX, slack / 2);
      x = SIDE_MARGIN_PX + slack / 2 + (position % 2 === 0 ? -sway : sway);
    }
    y += OVERHANG_ABOVE_PX[item.id] ?? 0;
    const placed = { ...item, position: { x: Math.round(x), y } };
    y +=
      height +
      (height <= SMALL_CARD_MAX_HEIGHT_PX ? SMALL_ROW_GAP_PX : ROW_GAP_PX);
    return placed;
  });
};
