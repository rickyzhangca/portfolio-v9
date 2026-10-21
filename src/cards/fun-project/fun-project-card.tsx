import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import type { PointerEvent, Ref } from "react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { FunProjectCardContent } from "@/cards/types";
import { LAMP_LIFT } from "@/components/lighting/lamp-shadows";
import {
  LAMP_SHEEN_GRADIENT,
  startLampSheen,
} from "@/components/lighting/lamp-sheen";
import { deskLampAtom } from "@/context/atoms";
import { useItemEntrance } from "@/context/canvas-entrance";
import { SPRING_PRESETS } from "@/lib/animation";
import { ENTRANCE_LANDED_MS } from "@/lib/canvas-entrance";
import { computeMagneticLift, type IconLiftEffect } from "@/lib/magnetic-lift";
import { tw } from "@/lib/utils";

// Loaded only when the desk lamp is switched on, outside the first view's JS.
const LitKeycaps = lazy(() =>
  import("@/components/lighting/lit-keycaps").then((module) => ({
    default: module.LitKeycaps,
  }))
);

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

const SCALE_PATTERN = /scale\(([^)]+)\)/;

// How far an icon has popped onto the card: Motion writes its scale inline,
// and leaves no scale once it rests at 1.
const readPop = (element: HTMLElement | undefined) => {
  if (!element) {
    return 0;
  }
  const match = SCALE_PATTERN.exec(element.style.transform);
  return match ? Math.max(0, Number.parseFloat(match[1] ?? "1") || 0) : 1;
};

export const FunProjectCard = ({
  content,
  isExpanded: _isExpanded = false,
  isFocused: _isFocused = false,
  onMeasure,
  ref,
}: FunProjectCardProps & { ref?: Ref<HTMLDivElement> }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const iconRefCallbacksRef = useRef(
    new Map<number, (el: HTMLDivElement | null) => void>()
  );
  const [liftEffects, setLiftEffects] = useState<Map<number, IconLiftEffect>>(
    new Map()
  );

  const rafRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);

  // Under the lamp the icons become keycaps drawn with WebGPU, which pop
  // onto the card with them. Until the caps are drawn, or without WebGPU,
  // each icon casts its own shadow, as high as it is lifted, and catches the
  // lamp's glint.
  const isLampOn = useAtomValue(deskLampAtom);
  const [isLitReady, setLitReady] = useState(false);
  const isLit = isLampOn && isLitReady;
  const handleLitReady = useCallback(() => setLitReady(true), []);
  const popAt = useCallback(
    (index: number) => readPop(iconRefs.current.get(index)),
    []
  );

  useEffect(() => {
    if (!isLampOn) {
      setLitReady(false);
    }
  }, [isLampOn]);

  const entrance = useItemEntrance();
  const iconsDelay = (entrance.delayMs + ENTRANCE_LANDED_MS) / 1000;

  const handleMeasure = useCallback(() => {
    if (cardRef.current && onMeasure) {
      const height = cardRef.current.offsetHeight;
      onMeasure(height);
    }
  }, [onMeasure]);

  useEffect(() => {
    handleMeasure();
  }, [handleMeasure]);

  useEffect(() => {
    const card = cardRef.current;
    if (!(isLampOn && card) || isLit) {
      return;
    }
    return startLampSheen(card);
  }, [isLampOn, isLit]);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      pendingPointerRef.current = { x: event.clientX, y: event.clientY };
      // RAF-throttle layout reads and state updates to once per frame.
      if (rafRef.current !== null) {
        return;
      }
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const pointer = pendingPointerRef.current;
        if (!pointer) {
          return;
        }
        pendingPointerRef.current = null;
        // Measured each frame, never cached: the camera pans and zooms the
        // card, and the icons mount scaled to nothing for the entrance.
        // Tiles are not moved by their own lift, so lifting cannot feed back.
        const iconRects = new Map<number, DOMRect>();
        for (const [index, element] of iconRefs.current.entries()) {
          iconRects.set(index, element.getBoundingClientRect());
        }
        setLiftEffects(computeMagneticLift(pointer.x, pointer.y, iconRects));
      });
    },
    []
  );

  const handlePointerLeave = useCallback(() => {
    // Cancel any pending RAF update
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingPointerRef.current = null;
    setLiftEffects(new Map());
  }, []);

  const setCardRef = useCallback(
    (el: HTMLDivElement | null) => {
      cardRef.current = el;
      if (typeof ref === "function") {
        ref(el);
      } else if (ref) {
        ref.current = el;
      }
    },
    [ref]
  );

  const getIconRef = useCallback((index: number) => {
    let callback = iconRefCallbacksRef.current.get(index);
    if (!callback) {
      callback = (el: HTMLDivElement | null) => {
        if (el) {
          iconRefs.current.set(index, el);
        } else {
          iconRefs.current.delete(index);
        }
      };
      iconRefCallbacksRef.current.set(index, callback);
    }
    return callback;
  }, []);

  return (
    <div
      className="relative grid grid-cols-5 gap-2"
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      ref={setCardRef}
    >
      {content.items.map((item, index) => {
        const effect = liftEffects.get(index);
        const y = effect?.y ?? 0;
        const shadowIntensity = effect?.shadowIntensity ?? 0;
        const shadow = getShadowStyle(shadowIntensity);

        return (
          <motion.div
            // Icons pop onto the card once it has landed.
            animate={entrance.started ? { scale: 1, opacity: 1 } : undefined}
            data-lamp-shadow={
              isLampOn && !isLit ? LAMP_LIFT.keycap - y : undefined
            }
            initial={{ scale: 0, opacity: 0 }}
            key={item.title}
            ref={getIconRef(index)}
            transition={{
              ...SPRING_PRESETS.quick,
              delay: iconsDelay + index * 0.03,
            }}
          >
            <motion.div
              animate={{ y }}
              className="relative isolate"
              initial={false}
              style={isLampOn ? undefined : { filter: shadow }}
              transition={SPRING_PRESETS.quick}
            >
              {/* biome-ignore lint/correctness/useImageSize: auto sizes */}
              <img
                alt={item.title}
                className={tw(
                  "h-full w-full object-cover transition-opacity duration-300",
                  isLit && "opacity-0"
                )}
                data-keycap=""
                src={item.icon}
              />
              {isLampOn && !isLit ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  data-lamp-sheen=""
                  style={{
                    backgroundImage: LAMP_SHEEN_GRADIENT,
                    // The icon's own shape, at its width: the box below it
                    // holds the line's descender gap.
                    maskImage: `url(${item.icon})`,
                    maskPosition: "top",
                    maskRepeat: "no-repeat",
                    maskSize: "100% auto",
                  }}
                />
              ) : null}
            </motion.div>
          </motion.div>
        );
      })}
      {isLampOn && content.loadKeycaps ? (
        <Suspense fallback={null}>
          <LitKeycaps
            items={content.items}
            lifts={liftEffects}
            loadCaps={content.loadKeycaps}
            onReady={handleLitReady}
            popAt={popAt}
          />
        </Suspense>
      ) : null}
    </div>
  );
};

FunProjectCard.displayName = "FunProjectCard";
