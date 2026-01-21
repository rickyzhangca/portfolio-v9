import { motion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";
import { RenderCard } from "@/cards/render-card";
import { useDraggable } from "@/hooks/use-draggable";
import { SPRING_PRESETS, TRANSITIONS } from "@/lib/animation";
import { tw } from "@/lib/utils";
import type { CanvasSwagStackItem, Position } from "@/types/canvas";

const SWAG_ITEM_SIZE = 180;
const GRID_COLUMNS = 6;
const GRID_GAP = 16;
const STAGGER_DELAY = 0.04;

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

  const getSwagPosition = useCallback(
    (index: number) => {
      const row = Math.floor(index / GRID_COLUMNS);
      const col = index % GRID_COLUMNS;

      return {
        x: coverWidth + 40 + col * (SWAG_ITEM_SIZE + GRID_GAP),
        y: row * (SWAG_ITEM_SIZE + GRID_GAP),
      };
    },
    [coverWidth]
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
          const position = getSwagPosition(index);

          return (
            <motion.div
              animate={{
                opacity: isExpanded ? 1 : 0,
                scale: isExpanded ? 1 : 0.8,
                x: position.x,
                y: position.y,
              }}
              className="absolute top-0 left-0 origin-top-left will-change-transform"
              initial={{
                opacity: 0,
                scale: 0.8,
              }}
              key={index}
              style={{
                width: SWAG_ITEM_SIZE,
                zIndex: item.swags.length - index - 1,
                pointerEvents: isExpanded ? "auto" : "none",
              }}
              transition={{
                ...SPRING_PRESETS.snappy,
                delay: index * STAGGER_DELAY,
              }}
            >
              <div className="flex h-full flex-col gap-2 rounded-2xl bg-background2 p-3 outline outline-border">
                <img
                  alt={swag.label}
                  className="aspect-[3/2] w-full rounded-md border border-border object-cover"
                  height={120}
                  src={swag.src}
                  width={180}
                />
                <div className="flex flex-col gap-0.5">
                  <p className="truncate font-semibold text-sm">{swag.label}</p>
                  {swag.caption && (
                    <p className="truncate text-foreground2/70 text-xs">
                      {swag.caption}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};
