import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";
import { RenderCard } from "@/cards/render-card";
import { useDraggable } from "@/hooks/use-draggable";
import { SPRING_PRESETS, TRANSITIONS } from "@/lib/animation";
import { tw } from "@/lib/utils";
import type { CanvasFunStackItem, Position } from "@/types/canvas";

const CONTENT_WIDTH = 300;
const CONTENT_GAP = 24;
const STAGGER_DELAY = 0.05;

interface FunProjectGroupProps {
  item: CanvasFunStackItem;
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

export const FunProjectGroup = ({
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
}: FunProjectGroupProps) => {
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(
    item.card.size.height
  );

  const cardPointerDownRef = useRef<{
    clientX: number;
    clientY: number;
  } | null>(null);

  const cardWithSize = useMemo(() => {
    return {
      ...item.card,
      size: {
        ...item.card.size,
        height: measuredHeight ?? item.card.size.height,
      },
    };
  }, [item.card, measuredHeight]);

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
        onCardHeightMeasured?.(item.card.id, height);
      }
    },
    [measuredHeight, onCardHeightMeasured, item.card.id]
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
      data-fun-stack-id={item.id}
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
        <motion.div
          className="absolute top-0 left-0 drop-shadow-[0_8px_20px_rgba(0,0,0,0.16)] transition-[filter] will-change-transform hover:drop-shadow-[0_12px_24px_rgba(0,0,0,0.24)]"
          onPointerDown={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest(".no-drag")) {
              cardPointerDownRef.current = null;
              return;
            }

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
          }}
        >
          <RenderCard
            card={cardWithSize}
            isExpanded={isExpanded}
            onMeasure={handleCardMeasure}
          />
        </motion.div>

        {/* Right-side content panel when expanded */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              animate={{ opacity: 1 }}
              className="pointer-events-auto absolute top-0"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              style={{
                left: (cardWithSize.size.width ?? 240) + CONTENT_GAP,
                width: CONTENT_WIDTH,
              }}
              transition={TRANSITIONS.opacity}
            >
              <div className="space-y-4">
                {item.card.content.items.map((funItem, index) => (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-white p-4 shadow-lg"
                    exit={{ opacity: 0, y: -10 }}
                    initial={{ opacity: 0, y: -10 }}
                    key={index}
                    transition={{
                      ...SPRING_PRESETS.snappy,
                      delay: index * STAGGER_DELAY,
                    }}
                  >
                    <h3 className="mb-2 font-semibold text-lg">
                      {funItem.title}
                    </h3>
                    <p className="mb-3 text-gray-600 text-sm">
                      {funItem.blurb}
                    </p>
                    {funItem.link && (
                      <a
                        className="text-blue-600 text-sm underline hover:text-blue-800"
                        href={funItem.link}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        View Project →
                      </a>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
