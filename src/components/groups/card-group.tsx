import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/cards/card";
import { fanConfigAtom } from "@/context/atoms";
import { useDraggable } from "@/hooks/use-draggable";
import type { FanConfig } from "@/lib/fan";
import { cn } from "@/lib/utils";
import type { CardData, CardGroupData, Position } from "@/types/canvas";

const CARD_MASK_DATA_URI = `url("data:image/svg+xml,%3Csvg viewBox='0 0 280 360' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 321.6C0 335.041 2.38419e-07 341.762 2.61584 346.896C4.9168 351.412 8.58834 355.083 13.1042 357.384C18.2381 360 24.9587 360 38.4 360H241.6C255.041 360 261.762 360 266.896 357.384C271.412 355.083 275.083 351.412 277.384 346.896C280 341.762 280 335.041 280 321.6V270.875C280 265.342 280 262.576 279.541 259.894C279.133 257.514 278.457 255.187 277.526 252.958C276.476 250.448 274.994 248.112 272.03 243.441L271.47 242.559C268.506 237.888 267.024 235.552 265.974 233.042C265.043 230.813 264.367 228.486 263.959 226.106C263.5 223.424 263.5 220.658 263.5 215.125V144.875C263.5 139.342 263.5 136.576 263.959 133.894C264.367 131.514 265.043 129.187 265.974 126.958C267.024 124.448 268.506 122.112 271.47 117.441L272.03 116.559C274.994 111.888 276.476 109.552 277.526 107.042C278.457 104.813 279.133 102.486 279.541 100.106C280 97.424 280 94.6577 280 89.1251V38.4C280 24.9587 280 18.2381 277.384 13.1042C275.083 8.58834 271.412 4.9168 266.896 2.61584C261.762 0 255.041 0 241.6 0H38.4C24.9587 0 18.2381 0 13.1042 2.61584C8.58834 4.9168 4.9168 8.58834 2.61584 13.1042C2.38419e-07 18.2381 0 24.9587 0 38.4V321.6Z' fill='black'/%3E%3C/svg%3E")`;

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

    const cardHeight = card.size.height ?? 0;
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
  const [measuredSizes, setMeasuredSizes] = useState<Record<string, number>>(
    {}
  );

  const coverWithSize = useMemo(() => {
    if (!group.cover) return undefined;
    return {
      ...group.cover,
      size: {
        ...group.cover.size,
        height: measuredSizes[group.cover.id] ?? group.cover.size.height,
      },
    };
  }, [group.cover, measuredSizes]);

  const projectsWithSizes = useMemo(() => {
    return group.projects.map((card) => ({
      ...card,
      size: {
        ...card.size,
        height: measuredSizes[card.id] ?? card.size.height,
      },
    }));
  }, [group.projects, measuredSizes]);

  const offsets = useMemo(
    () => getOffsets(coverWithSize, projectsWithSizes, isExpanded, fanConfig),
    [coverWithSize, projectsWithSizes, isExpanded, fanConfig]
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

  const handleCardMeasure = useCallback((id: string, height: number) => {
    setMeasuredSizes((prev) => {
      if (prev[id] === height) {
        return prev;
      }
      return { ...prev, [id]: height };
    });
  }, []);

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
        {coverWithSize && (
          <motion.div
            animate={{
              opacity: 1,
              scale: 1,
              rotate: 0,
              x: 0,
              y: 0,
            }}
            className="absolute top-0 left-0 drop-shadow-[0_25px_25px_rgba(0,0,0,0.25)] transition-all duration-200 will-change-transform hover:drop-shadow-[0_20px_35px_rgba(0,0,0,0.5)] active:drop-shadow-[0_15px_15px_rgba(0,0,0,0.25)]"
            key={coverWithSize.id}
            onClick={(e) => {
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
            }}
            style={{
              zIndex: (group.cover ? 1 : 0) + projectsWithSizes.length,
              pointerEvents: "auto",
            }}
            transition={{
              type: "spring",
              stiffness: 520,
              damping: 46,
              mass: 0.8,
            }}
          >
            <div
              style={{
                maskImage: CARD_MASK_DATA_URI,
                WebkitMaskImage: CARD_MASK_DATA_URI,
                maskSize: `${coverWithSize.size.width}px ${coverWithSize.size.height ?? 0}px`,
                WebkitMaskSize: `${coverWithSize.size.width}px ${coverWithSize.size.height ?? 0}px`,
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }}
            >
              <Card
                className="shadow-none hover:shadow-none"
                data={coverWithSize}
                onMeasure={(h) => handleCardMeasure(coverWithSize.id, h)}
              />
            </div>
          </motion.div>
        )}
        {projectsWithSizes.map((card, index) => {
          const offset = offsets[index] ?? { x: 0, y: 0 };
          const colInRow = index % EXPAND_MAX_PER_ROW;
          const fanRotate =
            isExpanded && group.cover
              ? (colInRow + 1) * fanConfig.rotateStepDeg
              : 0;
          const fanArcY =
            isExpanded && group.cover
              ? (colInRow + 1) ** 2 * fanConfig.arcStepPx
              : 0;

          // Contact card (when no cover) gets cover-like styling
          const isContactCardWithoutCover =
            !group.cover && card.type === "contact";
          const cardHeight = card.size.height ?? 0;
          const maskStyles = isContactCardWithoutCover
            ? {
                maskImage: CARD_MASK_DATA_URI,
                WebkitMaskImage: CARD_MASK_DATA_URI,
                maskSize: `${card.size.width}px ${cardHeight}px`,
                WebkitMaskSize: `${card.size.width}px ${cardHeight}px`,
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }
            : {};

          return (
            <motion.div
              animate={{
                opacity: isExpanded ? 1 : Math.max(0.7, 1 - (index + 1) * 0.08),
                scale: isExpanded ? 1 : Math.max(0.94, 1 - (index + 1) * 0.02),
                rotate: fanRotate,
                x: offset.x,
                y: offset.y + fanArcY,
              }}
              className={cn(
                "absolute top-0 left-0 will-change-transform",
                isContactCardWithoutCover &&
                  "drop-shadow-[0_25px_25px_rgba(0,0,0,0.25)] transition-all duration-200 hover:drop-shadow-[0_20px_35px_rgba(0,0,0,0.5)] active:drop-shadow-[0_15px_15px_rgba(0,0,0,0.25)]"
              )}
              key={card.id}
              onClick={
                isContactCardWithoutCover
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
                zIndex: projectsWithSizes.length - index,
                pointerEvents: isExpanded || !group.cover ? "auto" : "none",
              }}
              transition={{
                type: "spring",
                stiffness: 520,
                damping: 46,
                mass: 0.8,
              }}
            >
              <div style={maskStyles}>
                <Card
                  className={
                    isContactCardWithoutCover
                      ? "shadow-none hover:shadow-none"
                      : undefined
                  }
                  data={card}
                  onMeasure={(h) => handleCardMeasure(card.id, h)}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
