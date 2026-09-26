import type { CardInstance } from "@/cards/types";
import type { FanConfig } from "@/lib/fan";

export const STACK_OFFSET_PX = 6;
export const EXPAND_MAX_PER_ROW = 3;
export const COLLAPSED_VISIBLE_COUNT = 2;
export const FUN_STACK_LAYOUT = {
  contentWidth: 680,
  contentGap: 24,
  estimatedCardHeight: 120,
  verticalGap: 16,
} as const;
export const SWAG_LAYOUT = {
  columns: 6,
  itemSize: 180,
  imageHeight: 120,
  expandedScale: 1.05,
} as const;

export const getFanTransform = (
  index: number,
  config: FanConfig,
  columns = EXPAND_MAX_PER_ROW
) => {
  const column = index % columns;
  return {
    rotate: (column + 1) * config.rotateStepDeg,
    arcY: (column + 1) ** 2 * config.arcStepPx,
  };
};

export const getSwagPosition = (
  index: number,
  coverWidth: number,
  config: FanConfig
) => {
  const fan = getFanTransform(index, config, SWAG_LAYOUT.columns);
  return {
    x:
      coverWidth +
      config.expandGapPx +
      (index % SWAG_LAYOUT.columns) *
        (SWAG_LAYOUT.itemSize + config.expandGapPx),
    y:
      Math.floor(index / SWAG_LAYOUT.columns) *
        (SWAG_LAYOUT.itemSize + config.expandRowGapPx) +
      fan.arcY,
    rotate: fan.rotate,
  };
};

export const COLLAPSED_POSITIONS = [
  { x: 18, y: 24, rotate: 5 },
  { x: 32, y: 72, rotate: 0 },
];

export const getRotatedBoundingBox = (
  width: number,
  height: number,
  deg: number
) => {
  const theta = (Math.abs(deg) * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  return {
    width: Math.abs(width * cos) + Math.abs(height * sin),
    height: Math.abs(height * cos) + Math.abs(width * sin),
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

  for (let index = 0; index < projects.length; index++) {
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
