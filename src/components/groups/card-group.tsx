import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { Card } from "@/components/cards/card";
import { fanConfigAtom } from "@/context/atoms";
import { useDraggable } from "@/hooks/use-draggable";
import type { FanConfig } from "@/lib/fan";
import { cn } from "@/lib/utils";
import type { CardGroupData, Position } from "@/types/canvas";

const CARD_MASK_DATA_URI = `url("data:image/svg+xml,%3Csvg viewBox='0 0 240 360' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 302.4C0 322.562 0 332.643 3.92377 340.344C7.37521 347.117 12.8825 352.625 19.6563 356.076C27.3572 360 37.4381 360 57.6 360H188.8C206.722 360 215.683 360 222.528 356.512C228.549 353.444 233.444 348.549 236.512 342.528C240 335.683 240 326.722 240 308.8V279.367C240 272.913 240 269.686 239.454 266.587C238.753 262.606 237.386 258.771 235.411 255.243C233.873 252.498 231.832 249.999 227.75 245C223.668 240.001 221.627 237.502 220.089 234.757C218.114 231.229 216.747 227.394 216.046 223.413C215.5 220.314 215.5 217.087 215.5 210.633V149.367C215.5 142.913 215.5 139.686 216.046 136.587C216.747 132.606 218.114 128.771 220.089 125.243C221.627 122.498 223.668 119.999 227.75 115C231.832 110.001 233.873 107.502 235.411 104.757C237.386 101.229 238.753 97.3944 239.454 93.4129C240 90.3142 240 87.0873 240 80.6335V51.2C240 33.2783 240 24.3175 236.512 17.4723C233.444 11.4511 228.549 6.55574 222.528 3.48779C215.683 0 206.722 0 188.8 0H57.6C37.4381 0 27.3572 0 19.6563 3.92377C12.8825 7.37521 7.37521 12.8825 3.92377 19.6563C0 27.3572 0 37.4381 0 57.6V302.4Z' fill='black'/%3E%3C/svg%3E")`;

const STACK_OFFSET_PX = 6;
const EXPAND_MAX_PER_ROW = 3;

const getRotatedBoundingBox = (width: number, height: number, deg: number) => {
  const theta = (Math.abs(deg) * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  return {
    width: Math.abs(width * cos) + Math.abs(height * sin),
    height: Math.abs(height * cos) + Math.abs(width * sin),
  };
};

const getOffsets = (
  cards: CardGroupData["cards"],
  expanded: boolean,
  fanConfig: FanConfig
) => {
  if (!expanded) {
    return cards.map((_, index) => ({
      x: index * STACK_OFFSET_PX,
      y: index * STACK_OFFSET_PX,
    }));
  }

  const offsets = cards.map(() => ({ x: 0, y: 0 }));

  const coverWidth = cards[0]?.size.width ?? 0;
  const baseX = coverWidth + fanConfig.expandGapPx;

  let y = 0;
  let rowMaxHeight = 0;
  let col = 0;
  let x = baseX;
  let prevWidth = 0;
  let prevExtraWidth = 0;
  let hasPrevInRow = false;

  for (let index = 1; index < cards.length; index++) {
    const card = cards[index];
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

    const rotationDeg = (col + 1) * fanConfig.rotateStepDeg;
    const { width: bboxWidth, height: bboxHeight } = getRotatedBoundingBox(
      card.size.width,
      card.size.height,
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
    rowMaxHeight = Math.max(rowMaxHeight, (card.size.height + bboxHeight) / 2);
    prevWidth = card.size.width;
    prevExtraWidth = extraWidth;
    hasPrevInRow = true;
    col += 1;
  }

  return offsets;
};

interface CardGroupProps {
  group: CardGroupData;
  scale: number;
  isExpanded: boolean;
  dimmed: boolean;
  dragDisabled: boolean;
  repulsionOffset: Position;
  onBringToFront: () => void;
  onToggleExpanded: () => void;
  onPositionUpdate: (position: Position) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  setRootRef?: (el: HTMLDivElement | null) => void;
}

export const CardGroup = ({
  group,
  scale,
  isExpanded,
  dimmed,
  dragDisabled,
  repulsionOffset,
  onBringToFront,
  onToggleExpanded,
  onPositionUpdate,
  onDragStart,
  onDragEnd,
  setRootRef,
}: CardGroupProps) => {
  const fanConfig = useAtomValue(fanConfigAtom);

  const offsets = useMemo(
    () => getOffsets(group.cards, isExpanded, fanConfig),
    [group.cards, isExpanded, fanConfig]
  );

  const { isDragging, didDragRef, handleMouseDown, style } = useDraggable({
    position: group.position,
    scale,
    disabled: dragDisabled,
    onDragStart: () => {
      onBringToFront();
      onDragStart?.();
    },
    onDragEnd: (finalPosition) => {
      onPositionUpdate(finalPosition);
      onDragEnd?.();
    },
  });

  return (
    <motion.div
      animate={{
        opacity: dimmed ? 0.35 : 1,
        x: repulsionOffset.x,
        y: repulsionOffset.y,
      }}
      className={cn(
        "no-pan absolute top-0 left-0 will-change-transform",
        !isExpanded && "select-none",
        !dragDisabled && "cursor-grab",
        isDragging && "cursor-grabbing"
      )}
      data-card-group-id={group.id}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      ref={setRootRef}
      style={{ zIndex: group.zIndex }}
      transition={{
        opacity: { duration: 0.18 },
        x: { type: "spring", stiffness: 260, damping: 30, mass: 0.9 },
        y: { type: "spring", stiffness: 260, damping: 30, mass: 0.9 },
      }}
    >
      <div
        className="absolute top-0 left-0 will-change-transform"
        style={style}
      >
        {group.cards.map((card, index) => {
          const isCover = index === 0;
          const offset = offsets[index] ?? { x: 0, y: 0 };
          const colInRow = isCover ? 0 : (index - 1) % EXPAND_MAX_PER_ROW;
          const fanRotate =
            isExpanded && !isCover
              ? (colInRow + 1) * fanConfig.rotateStepDeg
              : 0;
          const fanArcY =
            isExpanded && !isCover
              ? (colInRow + 1) ** 2 * fanConfig.arcStepPx
              : 0;

          // Mask styles for cover card only
          const maskStyles = isCover
            ? {
                maskImage: CARD_MASK_DATA_URI,
                WebkitMaskImage: CARD_MASK_DATA_URI,
                maskSize: `${card.size.width}px ${card.size.height}px`,
                WebkitMaskSize: `${card.size.width}px ${card.size.height}px`,
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }
            : {};

          return (
            <motion.div
              animate={{
                opacity: isExpanded ? 1 : Math.max(0.7, 1 - index * 0.08),
                scale: isExpanded ? 1 : Math.max(0.94, 1 - index * 0.02),
                rotate: fanRotate,
                x: offset.x,
                y: offset.y + fanArcY,
              }}
              className="absolute top-0 left-0 will-change-transform"
              key={card.id}
              onClick={
                isCover
                  ? (e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest(".no-drag")) {
                        return;
                      }

                      // Prevent "click after drag" from toggling the stack.
                      if (!dragDisabled && didDragRef.current) {
                        didDragRef.current = false;
                        return;
                      }

                      onToggleExpanded();
                    }
                  : undefined
              }
              style={{
                zIndex: group.cards.length - index,
                pointerEvents: isExpanded || isCover ? "auto" : "none",
                ...maskStyles,
              }}
              transition={{
                type: "spring",
                stiffness: 520,
                damping: 46,
                mass: 0.8,
              }}
            >
              <Card data={card} />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
