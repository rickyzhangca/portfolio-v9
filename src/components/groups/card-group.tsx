import { motion } from "framer-motion";
import { useMemo } from "react";
import { Card } from "@/components/cards/card";
import { useDraggable } from "@/hooks/use-draggable";
import { cn } from "@/lib/utils";
import type { CardGroupData, Position } from "@/types/canvas";

const STACK_OFFSET_PX = 6;
const EXPAND_GAP_PX = 24;
const EXPAND_MAX_PER_ROW = 3;
const EXPAND_ROW_GAP_PX = 24;

const getOffsets = (cards: CardGroupData["cards"], expanded: boolean) => {
  if (!expanded) {
    return cards.map((_, index) => ({
      x: index * STACK_OFFSET_PX,
      y: index * STACK_OFFSET_PX,
    }));
  }

  const offsets = cards.map(() => ({ x: 0, y: 0 }));

  const coverWidth = cards[0]?.size.width ?? 0;
  const baseX = coverWidth + EXPAND_GAP_PX;

  let x = baseX;
  let y = 0;
  let rowMaxHeight = 0;
  let col = 0;

  for (let index = 1; index < cards.length; index++) {
    const card = cards[index];
    if (!card) {
      continue;
    }

    if (col === EXPAND_MAX_PER_ROW) {
      y += rowMaxHeight + EXPAND_ROW_GAP_PX;
      x = baseX;
      rowMaxHeight = 0;
      col = 0;
    }

    offsets[index] = { x, y };
    x += card.size.width + EXPAND_GAP_PX;
    rowMaxHeight = Math.max(rowMaxHeight, card.size.height);
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
  const offsets = useMemo(
    () => getOffsets(group.cards, isExpanded),
    [group.cards, isExpanded]
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
      <div className="absolute top-0 left-0 will-change-transform" style={style}>
        {group.cards.map((card, index) => {
          const isCover = index === 0;
          const offset = offsets[index] ?? { x: 0, y: 0 };

          return (
            <motion.div
              animate={{
                opacity: isExpanded ? 1 : Math.max(0.7, 1 - index * 0.08),
                scale: isExpanded ? 1 : Math.max(0.94, 1 - index * 0.02),
                x: offset.x,
                y: offset.y,
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
