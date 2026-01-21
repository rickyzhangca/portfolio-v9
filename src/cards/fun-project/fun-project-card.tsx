import { motion } from "framer-motion";
import type { PointerEvent } from "react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import type { FunProjectCardContent } from "@/cards/types";
import { SPRING_PRESETS } from "@/lib/animation";
import { computeMagneticLift, type IconLiftEffect } from "@/lib/magnetic-lift";

interface FunProjectCardProps {
  content: FunProjectCardContent;
  isExpanded?: boolean;
  isFocused?: boolean;
  onMeasure?: (height: number) => void;
}

const SHADOW_BASE_OPACITY = 0.08;
const SHADOW_BASE_BLUR = 8;
const SHADOW_MAX_OPACITY = 0.16;
const SHADOW_MAX_BLUR_ADD = 8;

const getShadowStyle = (intensity: number): string => {
  const opacity =
    SHADOW_BASE_OPACITY +
    (SHADOW_MAX_OPACITY - SHADOW_BASE_OPACITY) * intensity;
  const blur = SHADOW_BASE_BLUR + SHADOW_MAX_BLUR_ADD * intensity;
  return `drop-shadow(0 ${blur / 2}px ${blur}px rgba(0,0,0,${opacity}))`;
};

export const FunProjectCard = forwardRef<HTMLDivElement, FunProjectCardProps>(
  (
    { content, isExpanded: _isExpanded = false, isFocused = false, onMeasure },
    ref
  ) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const iconRefs = useRef<Map<number, HTMLImageElement>>(new Map());
    const [liftEffects, setLiftEffects] = useState<Map<number, IconLiftEffect>>(
      new Map()
    );

    const handleMeasure = useCallback(() => {
      if (cardRef.current && onMeasure) {
        const height = cardRef.current.offsetHeight;
        onMeasure(height);
      }
    }, [onMeasure]);

    useEffect(() => {
      handleMeasure();
    }, [handleMeasure]);

    // Reset lift effects when focus is lost
    useEffect(() => {
      if (!isFocused && liftEffects.size > 0) {
        setLiftEffects(new Map());
      }
    }, [isFocused, liftEffects.size]);

    const handlePointerMove = useCallback(
      (event: PointerEvent<HTMLDivElement>) => {
        if (!isFocused) {
          return;
        }

        // Get bounding rects for all icons
        const iconRects = new Map<number, DOMRect>();
        for (const [index, element] of iconRefs.current.entries()) {
          const rect = element.getBoundingClientRect();
          iconRects.set(index, rect);
        }

        // Compute lift effects based on pointer position
        const effects = computeMagneticLift(
          event.clientX,
          event.clientY,
          iconRects
        );
        setLiftEffects(effects);
      },
      [isFocused]
    );

    const handlePointerLeave = useCallback(() => {
      setLiftEffects(new Map());
    }, []);

    return (
      <div
        className="grid grid-cols-5 gap-2"
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        ref={(el) => {
          cardRef.current = el;
          if (typeof ref === "function") {
            ref(el);
          } else if (ref) {
            ref.current = el;
          }
        }}
      >
        {content.items.map((item, index) => {
          const effect = liftEffects.get(index);
          const y = effect?.y ?? 0;
          const shadowIntensity = effect?.shadowIntensity ?? 0;
          const shadow = getShadowStyle(shadowIntensity);

          return (
            // biome-ignore lint/correctness/useImageSize: auto sizes
            <motion.img
              alt={item.title}
              animate={{ y }}
              className="h-full w-full object-cover"
              initial={false}
              key={item.title}
              ref={(el) => {
                if (el) {
                  iconRefs.current.set(index, el);
                } else {
                  iconRefs.current.delete(index);
                }
              }}
              src={item.icon}
              style={{ filter: shadow }}
              transition={SPRING_PRESETS.quick}
            />
          );
        })}
      </div>
    );
  }
);

FunProjectCard.displayName = "FunProjectCard";
