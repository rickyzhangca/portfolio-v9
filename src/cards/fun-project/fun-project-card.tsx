import { motion } from "framer-motion";
import { forwardRef, useCallback, useEffect, useRef } from "react";
import type { FunProjectCardContent } from "@/cards/types";
import { SPRING_PRESETS } from "@/lib/animation";

interface FunProjectCardProps {
  content: FunProjectCardContent;
  isExpanded?: boolean;
  onMeasure?: (height: number) => void;
}

const CARD_WIDTH = 240;
const ICON_SIZE = 48;
const GAP = 16;

export const FunProjectCard = forwardRef<HTMLDivElement, FunProjectCardProps>(
  ({ content, isExpanded = false, onMeasure }, ref) => {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleMeasure = useCallback(() => {
      if (cardRef.current && onMeasure) {
        const height = cardRef.current.offsetHeight;
        onMeasure(height);
      }
    }, [onMeasure]);

    useEffect(() => {
      handleMeasure();
    }, [handleMeasure, isExpanded]);

    // Grid: 4x2 layout
    // List: 1x8 layout (vertical)
    const gridCols = isExpanded ? 1 : 4;

    return (
      <div
        className="relative overflow-hidden rounded-[32px] bg-white"
        ref={(el) => {
          cardRef.current = el;
          if (typeof ref === "function") {
            ref(el);
          } else if (ref) {
            ref.current = el;
          }
        }}
        style={{
          width: CARD_WIDTH,
        }}
      >
        <div
          className="grid p-4"
          style={{
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gap: GAP,
          }}
        >
          {content.items.map((item, index) => (
            <motion.div
              className="flex items-center justify-center rounded-lg bg-gray-200"
              key={index}
              layout
              style={{
                width: ICON_SIZE,
                height: ICON_SIZE,
              }}
              transition={SPRING_PRESETS.snappy}
            >
              <div className="text-2xl">{item.icon}</div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }
);

FunProjectCard.displayName = "FunProjectCard";
