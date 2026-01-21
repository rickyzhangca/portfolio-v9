import { motion } from "framer-motion";
import { forwardRef, useCallback, useEffect, useRef } from "react";
import type { FunProjectCardContent } from "@/cards/types";
import { SPRING_PRESETS } from "@/lib/animation";
import { tw } from "@/lib/utils";

interface FunProjectCardProps {
  content: FunProjectCardContent;
  isExpanded?: boolean;
  onMeasure?: (height: number) => void;
}

const CARD_WIDTH = 240;
const ICON_SIZE = 48;
const ICON_STAGGER = 0.03;

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

    return (
      <motion.div
        className="relative origin-top-left overflow-hidden rounded-[32px] bg-white"
        ref={(el) => {
          cardRef.current = el;
          if (typeof ref === "function") {
            ref(el);
          } else if (ref) {
            ref.current = el;
          }
        }}
        style={{
          // Keep the expanded list anchored to the collapsed top-left corner.
          width: isExpanded ? ICON_SIZE : CARD_WIDTH,
        }}
        transition={SPRING_PRESETS.snappy}
        layout
      >
        <motion.div
          className={tw(
            // Flex-wrap avoids CSS grid layout quirks with Framer Motion layout animations.
            "flex gap-4",
            isExpanded ? "flex-col items-start p-0" : "flex-row flex-wrap p-0"
          )}
          layout
        >
          {content.items.map((item, index) => (
            <motion.div
              className="flex items-center justify-center rounded-lg bg-gray-200"
              key={item.title}
              layout="position"
              style={{ width: ICON_SIZE, height: ICON_SIZE }}
              // 48px icon tiles: in collapsed mode, the card width (240) fits 4 icons + 3 gaps exactly.
              transition={{
                ...SPRING_PRESETS.snappy,
                delay:
                  (isExpanded ? index : content.items.length - 1 - index) *
                  ICON_STAGGER,
              }}
            >
              <div className="text-2xl">{item.icon}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    );
  }
);

FunProjectCard.displayName = "FunProjectCard";
