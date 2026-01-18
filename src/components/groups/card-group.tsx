import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/cards/card";
import { fanConfigAtom } from "@/context/atoms";
import { useDraggable } from "@/hooks/use-draggable";
import { cn } from "@/lib/utils";
import type { CardGroupData, Position } from "@/types/canvas";

const CARD_MASK_DATA_URI = `url("data:image/svg+xml,%3Csvg viewBox='0 0 240 340' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 301.6C0 315.041 0 321.762 2.61584 326.896C4.9168 331.412 8.58834 335.083 13.1042 337.384C18.2381 340 24.9587 340 38.4 340H201.6C215.041 340 221.762 340 226.896 337.384C231.412 335.083 235.083 331.412 237.384 326.896C240 321.762 240 315.041 240 301.6V250.875C240 245.342 240 242.576 239.541 239.894C239.133 237.514 238.457 235.187 237.526 232.958C236.476 230.448 234.994 228.112 232.03 223.441L231.47 222.559C228.506 217.888 227.024 215.552 225.974 213.042C225.043 210.813 224.367 208.486 223.959 206.106C223.5 203.424 223.5 200.658 223.5 195.125V134.875C223.5 129.342 223.5 126.576 223.959 123.894C224.367 121.514 225.043 119.187 225.974 116.958C227.024 114.448 228.506 112.112 231.47 107.441L232.03 106.559C234.994 101.888 236.476 99.5523 237.526 97.0418C238.457 94.8133 239.133 92.4865 239.541 90.1058C240 87.424 240 84.6577 240 79.1251V38.4C240 24.9587 240 18.2381 237.384 13.1042C235.083 8.58834 231.412 4.9168 226.896 2.61584C221.762 0 215.041 0 201.6 0H38.4C24.9587 0 18.2381 0 13.1042 2.61584C8.58834 4.9168 4.9168 8.58834 2.61584 13.1042C0 18.2381 0 24.9587 0 38.4V301.6Z'/%3E%3C/svg%3E")`;

import { SPRING_PRESETS, TRANSITIONS } from "@/lib/animation";
import {
  COLLAPSED_POSITIONS,
  EXPAND_MAX_PER_ROW,
  getOffsets,
} from "@/lib/card-layout";

// Local definitions removed as they are now imported

// Entrance animation timing constants
const COVER_BASE_DELAY = 0.05; // seconds before first cover appears
const COVER_STAGGER = 0.05; // seconds between each group's cover
const PROJECT_DELAY_AFTER_COVER = 0.8; // seconds after cover before projects appear

interface CardGroupProps {
  group: CardGroupData;
  groupIndex: number;
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
  groupIndex,
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
  // Control when projects become visible (after cover animation completes)
  const [showProjects, setShowProjects] = useState(false);

  // Calculate entrance delays based on group index
  const coverEntranceDelay = COVER_BASE_DELAY + groupIndex * COVER_STAGGER;
  const projectsEntranceDelay = coverEntranceDelay + PROJECT_DELAY_AFTER_COVER;

  // Show projects after cover animation has time to complete
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowProjects(true);
    }, projectsEntranceDelay * 1000); // Convert to ms
    return () => clearTimeout(timer);
  }, [projectsEntranceDelay]);

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

  const { isDragging, didDragRef, handleMouseDown, currentPosition } =
    useDraggable({
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
        opacity: dimmed ? 0.25 : 1,
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
        opacity: TRANSITIONS.opacity,
        x: SPRING_PRESETS.smooth,
        y: SPRING_PRESETS.smooth,
      }}
    >
      <motion.div
        initial={false}
        animate={{
          x: currentPosition.x,
          y: currentPosition.y,
        }}
        className="absolute top-0 left-0 will-change-transform"
        transition={isDragging ? TRANSITIONS.none : SPRING_PRESETS.quick}
      >
        {coverWithSize && (
          <motion.div
            initial={{
              opacity: 0.6,
              scale: 0,
              rotate: 0,
              x: 0,
              y: 0,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              rotate: 0,
              x: 0,
              y: 0,
            }}
            className="absolute top-0 left-0 drop-shadow-[0_8px_20px_rgba(0,0,0,0.24)] transition-all duration-200 will-change-transform hover:drop-shadow-[0_20px_24px_rgba(0,0,0,0.32)] active:drop-shadow-[0_8px_20px_rgba(0,0,0,0.24)]"
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
              ...SPRING_PRESETS.snappy,
              delay: coverEntranceDelay,
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

          // Calculate scale factor to fit project card within cover width when collapsed
          const coverWidth = coverWithSize?.size.width ?? card.size.width;
          const collapsedScale = Math.min(1, coverWidth / card.size.width);

          // When collapsed: only first 2 cards visible, others stack behind 2nd card
          const COLLAPSED_VISIBLE_COUNT = 2;
          const isHiddenWhenCollapsed =
            !isExpanded && index >= COLLAPSED_VISIBLE_COUNT;

          // Specific collapsed positions for visible cards
          // Card 1: 16px from left & top, -5deg rotation
          // Card 2: 32px from left, 68px from top, no rotation

          const collapsedPos = COLLAPSED_POSITIONS[Math.min(index, 1)];

          // Calculate collapsed opacity - hidden cards get 0, visible cards get gradual reduction
          const collapsedOpacity = isHiddenWhenCollapsed
            ? 0
            : Math.max(0.7, 1 - (index + 1) * 0.08);

          // Calculate collapsed scale based on index (for visible cards)
          const collapsedScaleIndex = isHiddenWhenCollapsed ? 1 : index;

          return (
            <motion.div
              initial={false}
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
                  : collapsedPos.x - 20,
                y: isExpanded ? offset.y + fanArcY : collapsedPos.y,
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
                transformOrigin: "top left",
              }}
              transition={{
                opacity: { duration: 0 },
                scale: SPRING_PRESETS.snappy,
                rotate: SPRING_PRESETS.snappy,
                x: SPRING_PRESETS.snappy,
                y: SPRING_PRESETS.snappy,
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
                  isExpanded={isExpanded}
                  onMeasure={(h) => handleCardMeasure(card.id, h)}
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};
