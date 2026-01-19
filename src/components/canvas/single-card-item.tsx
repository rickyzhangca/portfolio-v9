import { motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/cards/card";
import { useDraggable } from "@/hooks/use-draggable";
import { SPRING_PRESETS, TRANSITIONS } from "@/lib/animation";
import { tw } from "@/lib/utils";
import type { CanvasSingleItem, Position } from "@/types/canvas";

interface SingleCardItemProps {
  item: CanvasSingleItem;
  scale: number;
  dragDisabled: boolean;
  repulsionOffset: Position;
  onBringToFront: () => void;
  onPositionUpdate: (position: Position) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onCardHeightMeasured?: (cardId: string, height: number) => void;
  onDocClick?: () => void;
  setRootRef?: (el: HTMLDivElement | null) => void;
}

export const SingleCardItem = ({
  item,
  scale,
  dragDisabled,
  repulsionOffset,
  onBringToFront,
  onPositionUpdate,
  onDragStart,
  onDragEnd,
  onCardHeightMeasured,
  onDocClick,
  setRootRef,
}: SingleCardItemProps) => {
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(
    item.card.size.height
  );

  const cardWithSize = useMemo(() => {
    return {
      ...item.card,
      size: {
        ...item.card.size,
        height: measuredHeight ?? item.card.size.height,
      },
    };
  }, [item.card, measuredHeight]);

  const { isDragging, didDragRef, handleMouseDown, currentPosition } =
    useDraggable({
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
      }
      // Propagate measured height to canvas state
      onCardHeightMeasured?.(item.card.id, height);
    },
    [measuredHeight, onCardHeightMeasured, item.card.id]
  );

  const isDocCard = item.card.type === "doc";

  return (
    <motion.div
      animate={{
        x: repulsionOffset.x,
        y: repulsionOffset.y,
      }}
      className={tw(
        "no-pan absolute top-0 left-0 will-change-transform",
        "select-none",
        !dragDisabled && "cursor-grab",
        isDragging && "cursor-grabbing"
      )}
      data-card-item-id={item.id}
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
          key={cardWithSize.id}
          layoutId={isDocCard ? "resume-card" : undefined}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest(".no-drag")) {
              return;
            }

            // Prevent "click after drag" from triggering click action
            if (!dragDisabled && didDragRef.current) {
              didDragRef.current = false;
              return;
            }

            if (isDocCard && onDocClick) {
              onDocClick();
            }
          }}
          style={{
            zIndex: 1,
            pointerEvents: "auto",
          }}
          transition={SPRING_PRESETS.snappy}
        >
          <Card
            className="shadow-none hover:shadow-none"
            data={cardWithSize}
            onMeasure={handleCardMeasure}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
