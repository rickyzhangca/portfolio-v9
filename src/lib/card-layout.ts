import type { FanConfig } from "@/lib/fan";
import type { CardData } from "@/types/canvas";

export const STACK_OFFSET_PX = 6;
export const EXPAND_MAX_PER_ROW = 3;
export const COLLAPSED_VISIBLE_COUNT = 2;

export const COLLAPSED_POSITIONS = [
  { x: 24, y: 24, rotate: 5 },
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
  cover: CardData | undefined,
  projects: CardData[],
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
    const rotationDeg = (col + 1) * fanConfig.rotateStepDeg;
    const { width: bboxWidth, height: bboxHeight } = getRotatedBoundingBox(
      card.size.width,
      cardHeight,
      rotationDeg
    );
    const extraWidth = bboxWidth - card.size.width;

    if (hasPrevInRow) {
      // Prevent rotated cards from visually colliding by widening the gap
      // based on their rotated bounding boxes.
      const minGap = (prevExtraWidth + extraWidth) / 2;
      x += prevWidth + Math.max(fanConfig.expandGapPx, minGap);
    }

    offsets[index] = { x, y };
    rowMaxHeight = Math.max(rowMaxHeight, (cardHeight + bboxHeight) / 2);
    prevWidth = card.size.width;
    prevExtraWidth = extraWidth;
    hasPrevInRow = true;
    col += 1;
  }

  return offsets;
};
