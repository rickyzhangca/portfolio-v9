import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RenderCard } from "@/cards/render-card";
import { fanConfigAtom } from "@/context/atoms";
import { useDraggable } from "@/hooks/use-draggable";
import type { CanvasStackItem, Position } from "@/types/canvas";

const CARD_MASK_DATA_URI = `url("data:image/svg+xml,%3Csvg viewBox='0 0 240 340' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 301.6C0 315.041 0 321.762 2.61584 326.896C4.9168 331.412 8.58834 335.083 13.1042 337.384C18.2381 340 24.9587 340 38.4 340H201.6C215.041 340 221.762 340 226.896 337.384C231.412 335.083 235.083 331.412 237.384 326.896C240 321.762 240 315.041 240 301.6V250.875C240 245.342 240 242.576 239.541 239.894C239.133 237.514 238.457 235.187 237.526 232.958C236.476 230.448 234.994 228.112 232.03 223.441L231.47 222.559C228.506 217.888 227.024 215.552 225.974 213.042C225.043 210.813 224.367 208.486 223.959 206.106C223.5 203.424 223.5 200.658 223.5 195.125V134.875C223.5 129.342 223.5 126.576 223.959 123.894C224.367 121.514 225.043 119.187 225.974 116.958C227.024 114.448 228.506 112.112 231.47 107.441L232.03 106.559C234.994 101.888 236.476 99.5523 237.526 97.0418C238.457 94.8133 239.133 92.4865 239.541 90.1058C240 87.424 240 84.6577 240 79.1251V38.4C240 24.9587 240 18.2381 237.384 13.1042C235.083 8.58834 231.412 4.9168 226.896 2.61584C221.762 0 215.041 0 201.6 0H38.4C24.9587 0 18.2381 0 13.1042 2.61584C8.58834 4.9168 4.9168 8.58834 2.61584 13.1042C0 18.2381 0 24.9587 0 38.4V301.6Z'/%3E%3C/svg%3E")`;

import { SPRING_PRESETS, TRANSITIONS } from "@/lib/animation";
import {
  COLLAPSED_POSITIONS,
  EXPAND_MAX_PER_ROW,
  getOffsets,
} from "@/lib/card-layout";
import { tw } from "@/lib/utils";

// Local definitions removed as they are now imported

// Entrance animation timing constants
const COVER_BASE_DELAY = 0.05; // seconds before first cover appears
const COVER_STAGGER = 0.05; // seconds between each group's cover
const PROJECT_DELAY_AFTER_COVER = 0.2; // seconds after cover before projects appear

interface CardStackProps {
  stack: CanvasStackItem;
  stackIndex: number;
  scale: number;
  isExpanded: boolean;
  dragDisabled: boolean;
  repulsionOffset: Position;
  onBringToFront: () => void;
  onToggleExpanded: () => void;
  onPositionUpdate: (position: Position) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onCardHeightMeasured?: (cardId: string, height: number) => void;
  setRootRef?: (el: HTMLDivElement | null) => void;
}

export const CardStack = ({
  stack,
  stackIndex,
  scale,
  isExpanded,
  dragDisabled,
  repulsionOffset,
  onBringToFront,
  onToggleExpanded,
  onPositionUpdate,
  onDragStart,
  onDragEnd,
  onCardHeightMeasured,
  setRootRef,
}: CardStackProps) => {
  const fanConfig = useAtomValue(fanConfigAtom);
  const [measuredSizes, setMeasuredSizes] = useState<Record<string, number>>(
    {}
  );
  // Control when projects become visible (after cover animation completes)
  const [showProjects, setShowProjects] = useState(false);

  // Calculate entrance delays based on group index
  const coverEntranceDelay = COVER_BASE_DELAY + stackIndex * COVER_STAGGER;
  const projectsEntranceDelay = coverEntranceDelay + PROJECT_DELAY_AFTER_COVER;

  // Show projects after cover animation has time to complete
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowProjects(true);
    }, projectsEntranceDelay * 1000); // Convert to ms
    return () => clearTimeout(timer);
  }, [projectsEntranceDelay]);

  const coverPointerDownRef = useRef<{ clientX: number; clientY: number } | null>(
    null
  );

  const coverWithSize = useMemo(() => {
    if (!stack.cover) {
      return undefined;
    }
    return {
      ...stack.cover,
      size: {
        ...stack.cover.size,
        height: measuredSizes[stack.cover.id] ?? stack.cover.size.height,
      },
    };
  }, [stack.cover, measuredSizes]);

  const projectsWithSizes = useMemo(() => {
    return stack.stack.map((card) => ({
      ...card,
      size: {
        ...card.size,
        height: measuredSizes[card.id] ?? card.size.height,
      },
    }));
  }, [stack.stack, measuredSizes]);

  const offsets = useMemo(
    () => getOffsets(coverWithSize, projectsWithSizes, isExpanded, fanConfig),
    [coverWithSize, projectsWithSizes, isExpanded, fanConfig]
  );

  const { isDragging, handleMouseDown, currentPosition } = useDraggable({
      position: stack.position,
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

  const handleCardMeasure = useCallback(
    (id: string, height: number) => {
      setMeasuredSizes((prev) => {
        if (prev[id] === height) {
          return prev;
        }
        return { ...prev, [id]: height };
      });
      // Propagate measured height to canvas state
      onCardHeightMeasured?.(id, height);
    },
    [onCardHeightMeasured]
  );

  return (
    <motion.div
      animate={{
        x: repulsionOffset.x,
        y: repulsionOffset.y,
      }}
      className={tw(
        "absolute top-0 left-0 will-change-transform",
        !isExpanded && "select-none",
        !dragDisabled && "cursor-grab",
        isDragging && "cursor-grabbing"
      )}
      data-card-stack-id={stack.id}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      ref={setRootRef}
      style={{ zIndex: stack.zIndex }}
      transition={{
        opacity: TRANSITIONS.opacity,
        x: SPRING_PRESETS.smooth,
        y: SPRING_PRESETS.smooth,
      }}
    >
      <motion.div
        animate={{
          x: currentPosition.x,
          y: currentPosition.y,
        }}
        className="absolute top-0 left-0 will-change-transform"
        initial={false}
        transition={isDragging ? TRANSITIONS.none : SPRING_PRESETS.quick}
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
            className="absolute top-0 left-0 drop-shadow-[0_8px_20px_rgba(0,0,0,0.16)] transition-[filter] will-change-transform hover:drop-shadow-[0_12px_24px_rgba(0,0,0,0.24)]"
            initial={{
              opacity: 0,
              scale: 0,
              rotate: -5,
              x: 0,
              y: 0,
            }}
            key={coverWithSize.id}
            onPointerDown={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest(".no-drag")) {
                coverPointerDownRef.current = null;
                return;
              }

              if (e.button !== 0) {
                coverPointerDownRef.current = null;
                return;
              }

              coverPointerDownRef.current = {
                clientX: e.clientX,
                clientY: e.clientY,
              };
            }}
            onPointerUp={(e) => {
              const start = coverPointerDownRef.current;
              coverPointerDownRef.current = null;

              if (!start) {
                return;
              }

              const moved = Math.hypot(
                e.clientX - start.clientX,
                e.clientY - start.clientY
              );

              // Treat as a click only when the pointer didn't move (pan/drag should not toggle).
              if (moved < 6) {
                onToggleExpanded();
              }
            }}
            style={{
              zIndex: (stack.cover ? 1 : 0) + projectsWithSizes.length,
              pointerEvents: "auto",
            }}
            transition={{ ...SPRING_PRESETS.snappy, delay: coverEntranceDelay }}
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
              <RenderCard
                card={coverWithSize}
                className="shadow-none hover:shadow-none"
                onMeasure={(h) => handleCardMeasure(coverWithSize.id, h)}
              />
            </div>
          </motion.div>
        )}
        {projectsWithSizes.map((card, index) => {
          const offset = offsets[index] ?? { x: 0, y: 0 };
          const colInRow = index % EXPAND_MAX_PER_ROW;
          const fanRotate =
            isExpanded && stack.cover
              ? (colInRow + 1) * fanConfig.rotateStepDeg
              : 0;
          const fanArcY =
            isExpanded && stack.cover
              ? (colInRow + 1) ** 2 * fanConfig.arcStepPx
              : 0;

          // Calculate scale factor to fit project card within cover width when collapsed
          const coverWidth = coverWithSize?.size.width ?? card.size.width ?? 240;
          const collapsedScale = Math.min(1, coverWidth / (card.size.width ?? 350));

          // When collapsed: only first 2 cards visible, others stack behind 2nd card
          const COLLAPSED_VISIBLE_COUNT = 2;
          const isHiddenWhenCollapsed =
            !isExpanded && index >= COLLAPSED_VISIBLE_COUNT;

          // Specific collapsed positions for visible cards
          // Card 1: 16px from left & top, -5deg rotation
          // Card 2: 32px from left, 68px from top, no rotation

          const collapsedPos = COLLAPSED_POSITIONS[Math.min(index, 1)];

          // Calculate collapsed opacity - hidden cards get 0, visible cards get gradual reduction
          const collapsedOpacity = isHiddenWhenCollapsed ? 0 : 1;

          // Calculate collapsed scale based on index (for visible cards)
          const collapsedScaleIndex = isHiddenWhenCollapsed ? 1 : index;

          return (
            <motion.div
              animate={{
                opacity: showProjects ? (isExpanded ? 1 : collapsedOpacity) : 0,
                scale: showProjects
                  ? isExpanded
                    ? 1
                    : collapsedScale *
                      Math.max(0.94, 1 - (collapsedScaleIndex + 1) * 0.02)
                  : collapsedScale * 0.5,
                rotate: isExpanded ? fanRotate : collapsedPos.rotate,
                x: showProjects
                  ? isExpanded
                    ? offset.x
                    : collapsedPos.x
                  : collapsedPos.x - 12,
                y: isExpanded ? offset.y + fanArcY : collapsedPos.y,
              }}
              className={tw("absolute top-0 left-0 will-change-transform")}
              initial={false}
              key={card.id}
              style={{
                zIndex: projectsWithSizes.length - index,
                pointerEvents: isExpanded || !stack.cover ? "auto" : "none",
                transformOrigin: "top left",
              }}
              transition={SPRING_PRESETS.snappy}
            >
              <RenderCard
                card={card}
                isExpanded={isExpanded}
                onMeasure={(h) => handleCardMeasure(card.id, h)}
                priority={index < 2}
              />
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};
