import { motion } from "framer-motion";
import type { PointerEvent } from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
    {
      content,
      isExpanded: _isExpanded = false,
      isFocused: _isFocused = false,
      onMeasure,
    },
    ref
  ) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const iconRefs = useRef<Map<number, HTMLImageElement>>(new Map());
    const [liftEffects, setLiftEffects] = useState<Map<number, IconLiftEffect>>(
      new Map()
    );
    const [hasMounted, setHasMounted] = useState(false);

    // Cache icon rects to avoid layout reads on every pointermove
    const iconRectsRef = useRef<Map<number, DOMRect>>(new Map());
    const rafRef = useRef<number | null>(null);
    const pendingEffectsRef = useRef<Map<number, IconLiftEffect> | null>(null);

    useLayoutEffect(() => {
      setHasMounted(true);
    }, []);

    const handleMeasure = useCallback(() => {
      if (cardRef.current && onMeasure) {
        const height = cardRef.current.offsetHeight;
        onMeasure(height);
      }
    }, [onMeasure]);

    useEffect(() => {
      handleMeasure();
    }, [handleMeasure]);

    // Update icon rect cache on mount and when icons change
    useLayoutEffect(() => {
      const rects = new Map<number, DOMRect>();
      for (const [index, element] of iconRefs.current.entries()) {
        const rect = element.getBoundingClientRect();
        rects.set(index, rect);
      }
      iconRectsRef.current = rects;
    });

    // Set up ResizeObserver to update icon rects when layout changes
    useEffect(() => {
      const observers = new Map<number, ResizeObserver>();

      for (const [index, element] of iconRefs.current.entries()) {
        const observer = new ResizeObserver(() => {
          const rect = element.getBoundingClientRect();
          iconRectsRef.current.set(index, rect);
        });
        observer.observe(element);
        observers.set(index, observer);
      }

      return () => {
        for (const observer of observers.values()) {
          observer.disconnect();
        }
      };
    }, []);

    const handlePointerMove = useCallback(
      (event: PointerEvent<HTMLDivElement>) => {
        // Use cached rects instead of querying DOM on every move
        const iconRects = iconRectsRef.current;

        // Compute lift effects based on pointer position
        const effects = computeMagneticLift(
          event.clientX,
          event.clientY,
          iconRects
        );

        // RAF-throttle state updates to avoid React updates on every event
        pendingEffectsRef.current = effects;
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(() => {
            const pending = pendingEffectsRef.current;
            if (pending) {
              setLiftEffects(pending);
              pendingEffectsRef.current = null;
            }
            rafRef.current = null;
          });
        }
      },
      []
    );

    const handlePointerLeave = useCallback(() => {
      // Cancel any pending RAF update
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingEffectsRef.current = null;
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
            <motion.div
              animate={hasMounted ? { scale: 1, opacity: 1 } : undefined}
              initial={{ scale: 0, opacity: 0 }}
              key={item.title}
              transition={{
                ...SPRING_PRESETS.quick,
                delay: 0.48 + index * 0.02,
              }}
            >
              {/* biome-ignore lint/correctness/useImageSize: auto sizes */}
              <motion.img
                alt={item.title}
                animate={{ y }}
                className="h-full w-full object-cover"
                initial={false}
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
            </motion.div>
          );
        })}
      </div>
    );
  }
);

FunProjectCard.displayName = "FunProjectCard";
