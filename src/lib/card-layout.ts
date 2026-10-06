import type { CardInstance } from "@/cards/types";
import type { FanConfig } from "@/lib/fan";
import type { CanvasStackItem } from "@/types/canvas";

export const STACK_OFFSET_PX = 6;
export const EXPAND_MAX_PER_ROW = 3;
export const COLLAPSED_VISIBLE_COUNT = 2;
export const FUN_STACK_LAYOUT = {
  contentGap: 24,
  contentWidth: 680,
  estimatedCardHeight: 120,
  verticalGap: 16,
} as const;
export const SWAG_LAYOUT = {
  columns: 6,
  expandedScale: 1.05,
  imageHeight: 120,
  itemSize: 180,
} as const;

export const getFanTransform = (
  index: number,
  config: FanConfig,
  columns = EXPAND_MAX_PER_ROW
) => {
  const column = index % columns;
  return {
    arcY: (column + 1) ** 2 * config.arcStepPx,
    rotate: (column + 1) * config.rotateStepDeg,
  };
};

export const getSwagPosition = (
  index: number,
  coverWidth: number,
  config: FanConfig
) => {
  const fan = getFanTransform(index, config, SWAG_LAYOUT.columns);
  return {
    rotate: fan.rotate,
    x:
      coverWidth +
      config.expandGapPx +
      (index % SWAG_LAYOUT.columns) *
        (SWAG_LAYOUT.itemSize + config.expandGapPx),
    y:
      Math.floor(index / SWAG_LAYOUT.columns) *
        (SWAG_LAYOUT.itemSize + config.expandRowGapPx) +
      fan.arcY,
  };
};

export const COLLAPSED_POSITIONS = [
  { rotate: 5, x: 18, y: 24 },
  { rotate: 0, x: 32, y: 72 },
];

/** Resting offset between writing cards tucked behind the folder. */
export const WRITING_COLLAPSED_GAP_PX = 8;
/** Hover opens the same stack a little, without changing its alignment. */
export const WRITING_COLLAPSED_HOVER_GAP_PX = 12;
/** Keeps each tucked card slightly shorter than the folder. */
const WRITING_COLLAPSED_INSET_PX = 8;
/** Pulls the tucked stack slightly further under the folder. */
const WRITING_COLLAPSED_SHIFT_X_PX = 4;

export function getWritingCollapsedPose(
  index: number,
  cover: { height: number; width: number },
  card: { height: number; width: number },
  gapPx: number
) {
  const scale = Math.min(
    1,
    (cover.height - WRITING_COLLAPSED_INSET_PX * 2) / card.height,
    (cover.width - WRITING_COLLAPSED_INSET_PX * 2) / card.width
  );
  const visualWidth = card.width * scale;
  const visualHeight = card.height * scale;
  return {
    rotate: 0,
    scale,
    x:
      cover.width -
      visualWidth +
      gapPx * (index + 1) -
      WRITING_COLLAPSED_SHIFT_X_PX,
    y: (cover.height - visualHeight) / 2,
  };
}

export function getStackPage(stack: CanvasStackItem, requestedPage = 0) {
  const pageSize =
    stack.pageSize && Number.isInteger(stack.pageSize) && stack.pageSize > 0
      ? stack.pageSize
      : Math.max(1, stack.stack.length);
  const pageCount = Math.max(1, Math.ceil(stack.stack.length / pageSize));
  const page = Math.min(
    pageCount - 1,
    Math.max(0, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 0)
  );
  return {
    cards: stack.stack.slice(page * pageSize, (page + 1) * pageSize),
    page,
    pageCount,
  };
}

export function getExpandedStackLayout(
  cover: CardInstance | undefined,
  cards: CardInstance[],
  fanConfig: FanConfig
) {
  const offsets = getOffsets(cover, cards, true, fanConfig);
  const placements = cards.map((card, index) => {
    const col = index % EXPAND_MAX_PER_ROW;
    return {
      ...offsets[index],
      card,
      rotate: (col + 1) * fanConfig.rotateStepDeg,
      y: offsets[index].y + (col + 1) ** 2 * fanConfig.arcStepPx,
    };
  });
  const bounds = {
    maxX: cover?.size.width ?? 0,
    maxY: cover ? (cover.size.height ?? 360) : 0,
    minX: 0,
    minY: 0,
  };
  for (const { card, x, y, rotate } of placements) {
    const angle = (rotate * Math.PI) / 180;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const width = card.size.width ?? 350;
    const height = card.size.height ?? 360;
    // CardStack rotates around the top-left corner, so positive rotation
    // extends left of x; a width-only bounding box would miss that edge.
    const corners = [
      [0, 0],
      [width, 0],
      [0, height],
      [width, height],
    ];
    for (const [cornerX, cornerY] of corners) {
      const pointX = x + cornerX * cosine - cornerY * sine;
      const pointY = y + cornerX * sine + cornerY * cosine;
      bounds.minX = Math.min(bounds.minX, pointX);
      bounds.minY = Math.min(bounds.minY, pointY);
      bounds.maxX = Math.max(bounds.maxX, pointX);
      bounds.maxY = Math.max(bounds.maxY, pointY);
    }
  }
  return { bounds, placements };
}

export const getRotatedBoundingBox = (
  width: number,
  height: number,
  deg: number
) => {
  const theta = (Math.abs(deg) * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  return {
    height: Math.abs(height * cos) + Math.abs(width * sin),
    width: Math.abs(width * cos) + Math.abs(height * sin),
  };
};

export const getOffsets = (
  cover: CardInstance | undefined,
  projects: CardInstance[],
  expanded: boolean,
  fanConfig: FanConfig
) => {
  if (!expanded) {
    return projects.map((_, index) => ({
      x: index * STACK_OFFSET_PX,
      y: index * STACK_OFFSET_PX,
    }));
  }

  const offsets = projects.map(() => ({ x: 0, y: 0 }));

  const coverWidth = cover?.size.width ?? 0;
  const baseX = coverWidth + fanConfig.expandGapPx;

  let y = 0;
  let rowMaxHeight = 0;
  let col = 0;
  let x = baseX;
  let prevWidth = 0;
  let prevExtraWidth = 0;
  let hasPrevInRow = false;

  for (let index = 0; index < projects.length; index += 1) {
    const card = projects[index];
    if (!card) {
      continue;
    }

    if (col === EXPAND_MAX_PER_ROW) {
      y += rowMaxHeight + fanConfig.expandRowGapPx;
      x = baseX;
      rowMaxHeight = 0;
      col = 0;
      prevWidth = 0;
      prevExtraWidth = 0;
      hasPrevInRow = false;
    }

    const cardHeight = card.size.height ?? 360;
    const cardWidth = card.size.width ?? 350;
    const rotationDeg = (col + 1) * fanConfig.rotateStepDeg;
    const { width: bboxWidth, height: bboxHeight } = getRotatedBoundingBox(
      cardWidth,
      cardHeight,
      rotationDeg
    );
    const extraWidth = bboxWidth - cardWidth;

    if (hasPrevInRow) {
      // Prevent rotated cards from visually colliding by widening the gap
      // based on their rotated bounding boxes.
      const minGap = (prevExtraWidth + extraWidth) / 2;
      x += prevWidth + Math.max(fanConfig.expandGapPx, minGap);
    }

    offsets[index] = { x, y };
    rowMaxHeight = Math.max(rowMaxHeight, (cardHeight + bboxHeight) / 2);
    prevWidth = cardWidth;
    prevExtraWidth = extraWidth;
    hasPrevInRow = true;
    col += 1;
  }

  return offsets;
};
