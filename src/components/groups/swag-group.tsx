import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { useCallback, useMemo, useRef, useState } from "react";
import { RenderCard } from "@/cards/render-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fanConfigAtom } from "@/context/atoms";
import { useDraggable } from "@/hooks/use-draggable";
import { SPRING_PRESETS, TRANSITIONS } from "@/lib/animation";
import { tw } from "@/lib/utils";
import type { CanvasSwagStackItem, Position } from "@/types/canvas";

const SWAG_ITEM_SIZE = 180;
const GRID_COLUMNS = 6;
const STAGGER_DELAY = 0.01;

// Collapsed positions for swag items (stacked under cover)
const COLLAPSED_POSITIONS = [
  { x: 140, y: 16, rotate: 10 },
  { x: 145, y: 72, rotate: 0 },
];

interface SwagGroupProps {
  item: CanvasSwagStackItem;
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
  stackIndex: number;
}

export const SwagGroup = ({
  item,
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
  stackIndex,
}: SwagGroupProps) => {
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(
    item.cover.size.height
  );

  const cardPointerDownRef = useRef<{
    clientX: number;
    clientY: number;
  } | null>(null);

  const fanConfig = useAtomValue(fanConfigAtom);

  const cardWithSize = useMemo(() => {
    return {
      ...item.cover,
      size: {
        ...item.cover.size,
        height: measuredHeight ?? item.cover.size.height,
      },
    };
  }, [item.cover, measuredHeight]);

  const coverWidth = cardWithSize.size.width ?? 240;

  const getSwagOffset = useCallback(
    (index: number) => {
      const row = Math.floor(index / GRID_COLUMNS);
      const colInRow = index % GRID_COLUMNS;

      // Expanded position: grid layout with fan effect
      const baseX = coverWidth + fanConfig.expandGapPx;
      const expandedX =
        baseX + colInRow * (SWAG_ITEM_SIZE + fanConfig.expandGapPx);
      const expandedY = row * (SWAG_ITEM_SIZE + fanConfig.expandRowGapPx);

      // Fan effect calculations (same as card-group)
      const fanRotate = (colInRow + 1) * fanConfig.rotateStepDeg;
      const fanArcY = (colInRow + 1) ** 2 * fanConfig.arcStepPx;

      // Collapsed position: stacked under cover
      const collapsedPos = COLLAPSED_POSITIONS[Math.min(index, 1)];

      return {
        expandedX,
        expandedY: expandedY + fanArcY,
        collapsedX: collapsedPos.x,
        collapsedY: collapsedPos.y,
        collapsedRotate: collapsedPos.rotate,
        fanRotate,
      };
    },
    [coverWidth, fanConfig]
  );

  const { isDragging, handleMouseDown, currentPosition } = useDraggable({
    position: item.position,
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
    (height: number) => {
      if (measuredHeight !== height) {
        setMeasuredHeight(height);
        onCardHeightMeasured?.(item.cover.id, height);
      }
    },
    [measuredHeight, onCardHeightMeasured, item.cover.id]
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
      data-swag-stack-id={item.id}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      ref={setRootRef}
      style={{ zIndex: item.zIndex }}
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
        {/* Cover card */}
        <motion.div
          animate={{
            opacity: 1,
            scale: 1,
            rotate: 0,
          }}
          className="absolute top-0 left-0"
          initial={{
            opacity: 0,
            scale: 0,
            rotate: -5,
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) {
              cardPointerDownRef.current = null;
              return;
            }

            cardPointerDownRef.current = {
              clientX: e.clientX,
              clientY: e.clientY,
            };
          }}
          onPointerUp={(e) => {
            const start = cardPointerDownRef.current;
            cardPointerDownRef.current = null;

            if (!start) {
              return;
            }

            const moved = Math.hypot(
              e.clientX - start.clientX,
              e.clientY - start.clientY
            );

            // Treat as a click only when the pointer didn't move
            if (moved < 6) {
              onToggleExpanded();
            }
          }}
          style={{
            pointerEvents: "auto",
            zIndex: item.swags.length,
          }}
          transition={{
            ...SPRING_PRESETS.snappy,
            delay: 0.3 + stackIndex * 0.05,
          }}
        >
          <RenderCard
            card={cardWithSize}
            isExpanded={isExpanded}
            onMeasure={handleCardMeasure}
          />
        </motion.div>

        {/* Swag items in grid */}
        {item.swags.map((swag, index) => {
          const offset = getSwagOffset(index);
          const COLLAPSED_VISIBLE_COUNT = 2;
          const isHiddenWhenCollapsed =
            !isExpanded && index >= COLLAPSED_VISIBLE_COUNT;

          return (
            <motion.div
              animate={{
                opacity: isHiddenWhenCollapsed ? 0 : 1,
                scale: isExpanded ? 1.05 : 0.6,
                x: isExpanded ? offset.expandedX : offset.collapsedX,
                y: isExpanded ? offset.expandedY : offset.collapsedY,
                rotate: isExpanded ? offset.fanRotate : offset.collapsedRotate,
              }}
              className="absolute top-0 left-0 origin-top-left will-change-transform"
              initial={{
                opacity: 0,
                scale: 0.6,
                x: offset.collapsedX,
                y: offset.collapsedY,
                rotate: offset.collapsedRotate,
              }}
              key={swag.src}
              style={{
                width: SWAG_ITEM_SIZE,
                zIndex: item.swags.length - index - 1,
                pointerEvents: isExpanded ? "auto" : "none",
              }}
              transition={
                isExpanded
                  ? {
                      opacity: {
                        ...SPRING_PRESETS.snappy,
                        delay: index * STAGGER_DELAY * 1.5,
                      },
                      scale: {
                        ...SPRING_PRESETS.snappy,
                        delay: index * STAGGER_DELAY * 1.5,
                      },
                      x: {
                        ...SPRING_PRESETS.snappy,
                        delay: index * STAGGER_DELAY,
                      },
                      y: {
                        ...SPRING_PRESETS.snappy,
                        delay: index * STAGGER_DELAY,
                      },
                      rotate: {
                        ...SPRING_PRESETS.snappy,
                        delay: index * STAGGER_DELAY,
                      },
                    }
                  : SPRING_PRESETS.quick
              }
            >
              <Tooltip>
                <TooltipTrigger className="cursor-help border-0 bg-transparent p-0">
                  <img
                    alt={swag.label}
                    className="aspect-3/2 w-full object-contain"
                    height={120}
                    src={swag.src}
                    width={180}
                  />
                </TooltipTrigger>
                <TooltipContent className="items-center text-center">
                  <p>{swag.label}</p>
                  {swag.caption && (
                    <p className="text-foreground2">{swag.caption}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};
