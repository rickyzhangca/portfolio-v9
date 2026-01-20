import { motion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";
import { RenderCard } from "@/cards/render-card";
import { useDraggable } from "@/hooks/use-draggable";
import { SPRING_PRESETS, TRANSITIONS } from "@/lib/animation";
import { tw } from "@/lib/utils";
import type { CanvasFunStackItem, Position } from "@/types/canvas";

const CONTENT_WIDTH = 300;
const CONTENT_GAP = 24;
const STAGGER_DELAY = 0.05;
const VERTICAL_GAP = 16;
const CONTENT_CARD_HEIGHT = 120; // Estimated height for each content card

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
        {/* Main card with icons */}
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
            zIndex: item.card.content.items.length,
          }}
        >
          <RenderCard
            card={cardWithSize}
            isExpanded={isExpanded}
            onMeasure={handleCardMeasure}
          />
        </motion.div>

        {/* Content cards that fly out to the right */}
        {item.card.content.items.map((funItem, index) => {
          const cardWidth = cardWithSize.size.width ?? 240;

          // Calculate position: stack vertically, offset to the right
          const offsetY = index * (CONTENT_CARD_HEIGHT + VERTICAL_GAP);
          const offsetX = cardWidth + CONTENT_GAP;

          return (
            <motion.div
              animate={{
                opacity: isExpanded ? 1 : 0,
                scale: isExpanded ? 1 : 0.8,
                x: isExpanded ? offsetX : 0,
                y: isExpanded ? offsetY : 0,
              }}
              className="absolute top-0 left-0 will-change-transform"
              initial={false}
              key={index}
              style={{
                zIndex: item.card.content.items.length - index - 1,
                pointerEvents: isExpanded ? "auto" : "none",
              }}
              transition={{
                ...SPRING_PRESETS.snappy,
                delay: isExpanded ? index * STAGGER_DELAY : 0,
              }}
            >
              <div
                className="rounded-2xl bg-white p-4 shadow-lg"
                style={{ width: CONTENT_WIDTH }}
              >
                <h3 className="mb-2 font-semibold text-lg">{funItem.title}</h3>
                <p className="mb-3 text-gray-600 text-sm">{funItem.blurb}</p>
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
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};
