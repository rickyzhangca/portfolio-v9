import { forwardRef, useCallback, useEffect, useRef } from "react";
import type { FunProjectCardContent } from "@/cards/types";

interface FunProjectCardProps {
  content: FunProjectCardContent;
  isExpanded?: boolean;
  onMeasure?: (height: number) => void;
}

export const FunProjectCard = forwardRef<HTMLDivElement, FunProjectCardProps>(
  ({ content, isExpanded: _isExpanded = false, onMeasure }, ref) => {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleMeasure = useCallback(() => {
      if (cardRef.current && onMeasure) {
        const height = cardRef.current.offsetHeight;
        onMeasure(height);
      }
    }, [onMeasure]);

    useEffect(() => {
      handleMeasure();
    }, [handleMeasure]);

    return (
      <div
        className="grid grid-cols-5 gap-2"
        ref={(el) => {
          cardRef.current = el;
          if (typeof ref === "function") {
            ref(el);
          } else if (ref) {
            ref.current = el;
          }
        }}
      >
        {content.items.map((item) => (
          // biome-ignore lint/correctness/useImageSize: auto sizes
          <img
            alt={item.title}
            className="h-full w-full object-cover"
            key={item.title}
            src={item.icon}
          />
        ))}
      </div>
    );
  }
);

FunProjectCard.displayName = "FunProjectCard";
