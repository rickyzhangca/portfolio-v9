import { AnimatePresence, motion } from "framer-motion";
import { useAtom } from "jotai";
import type { MouseEvent, PointerEvent } from "react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { MacbookCardContent } from "@/cards/registry";
import { LitMacbook } from "@/components/lighting/lit-macbook";
import { deskLampAtom } from "@/context/atoms";
import { fitSpan } from "@/lib/fit-span";
import { tw } from "@/lib/utils";
import macbookImage from "@/assets/macbook/macbook.webp";

interface MacbookCardProps {
  content: MacbookCardContent;
  isFocused?: boolean;
}

interface StickerTooltipState {
  description: string;
  stickerSrc: string;
  x: number;
  y: number;
  side: "left" | "right";
}

const TOOLTIP_WIDTH_THRESHOLD = 200;
/** Gap the note keeps from the screen edge on narrow screens. */
const TOOLTIP_EDGE_MARGIN = 16;
/** Subtle foreground parallax (px) while focused so the lifted lid reads in 3D. */
const FOCUS_PARALLAX_PX = 7;
const FOCUS_PARALLAX_RATE = 10;

const MacbookCardComponent = ({
  content,
  isFocused = false,
}: MacbookCardProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stickerRefs = useRef<Map<string, HTMLImageElement | null>>(new Map());
  const pointerTypeRef = useRef("mouse");
  const stickerRefCallbacksRef = useRef(
    new Map<string, (element: HTMLImageElement | null) => void>()
  );
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<StickerTooltipState | null>(null);
  const [edgeShift, setEdgeShift] = useState(0);
  const [isLampOn, setLampOn] = useAtom(deskLampAtom);
  const [isLitReady, setLitReady] = useState(false);
  // The DOM images give way once WebGPU has drawn its first frame.
  const isDomHidden = isLampOn && isLitReady;
  const handleLitFail = useCallback(() => setLampOn(false), [setLampOn]);
  const handleLitReady = useCallback(() => setLitReady(true), []);

  useEffect(() => {
    if (!isLampOn) {
      setLitReady(false);
    }
  }, [isLampOn]);

  const resolveTooltipPosition = useCallback((event: PointerEvent<Element>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return null;
    }

    const spaceOnRight = window.innerWidth - event.clientX;
    const side: "left" | "right" =
      spaceOnRight < TOOLTIP_WIDTH_THRESHOLD ? "left" : "right";

    const offset = 12;
    const x =
      side === "right"
        ? event.clientX - rect.left + offset
        : event.clientX - rect.left - offset;

    return {
      x,
      y: event.clientY - rect.top + offset,
      side,
    };
  }, []);

  const findStickerAt = useCallback(
    (clientX: number, clientY: number) => {
      for (const sticker of content.stickers) {
        const element = stickerRefs.current.get(sticker.src);
        if (!element) {
          continue;
        }

        const rect = element.getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          return {
            description: sticker.description,
            stickerSrc: sticker.src,
          };
        }
      }
      return null;
    },
    [content.stickers]
  );

  const handleStickerPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!isFocused) {
        return;
      }

      const position = resolveTooltipPosition(event);
      const hoveredSticker = findStickerAt(event.clientX, event.clientY);

      setTooltip((prev) => {
        if (!(hoveredSticker && position)) {
          return prev ? null : prev;
        }

        if (
          prev &&
          prev.stickerSrc === hoveredSticker.stickerSrc &&
          prev.x === position.x &&
          prev.y === position.y
        ) {
          return prev;
        }

        return {
          description: hoveredSticker.description,
          stickerSrc: hoveredSticker.stickerSrc,
          ...position,
        };
      });
    },
    [findStickerAt, isFocused, resolveTooltipPosition]
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      pointerTypeRef.current = event.pointerType;
      handleStickerPointerMove(event);
    },
    [handleStickerPointerMove]
  );

  // A tap on a sticker reads its note; only the rest of the laptop unfocuses it.
  const handleClickCapture = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (
        isFocused &&
        pointerTypeRef.current !== "mouse" &&
        findStickerAt(event.clientX, event.clientY)
      ) {
        event.stopPropagation();
      }
    },
    [findStickerAt, isFocused]
  );

  const handleStickerPointerLeave = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      // A finger lifting is not leaving: the note stays until the next tap.
      if (event.pointerType === "mouse") {
        setTooltip(null);
      }
    },
    []
  );

  const getStickerRef = useCallback((src: string) => {
    let callback = stickerRefCallbacksRef.current.get(src);
    if (!callback) {
      callback = (element: HTMLImageElement | null) => {
        stickerRefs.current.set(src, element);
      };
      stickerRefCallbacksRef.current.set(src, callback);
    }
    return callback;
  }, []);

  // The note can be wider than the room on either side of the pointer, so
  // measure it and slide it back inside the screen. Layout sizes are
  // untransformed, so the canvas scale converts them to screen pixels.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const note = tooltipRef.current;
    if (!(tooltip && container && note)) {
      return;
    }
    const rect = container.getBoundingClientRect();
    const scale = container.offsetWidth
      ? rect.width / container.offsetWidth
      : 1;
    const width = note.offsetWidth * scale;
    const start =
      rect.left + tooltip.x * scale - (tooltip.side === "left" ? width : 0);
    setEdgeShift(
      (fitSpan(start, width, window.innerWidth, TOOLTIP_EDGE_MARGIN) - start) /
        scale
    );
  }, [tooltip]);

  useEffect(() => {
    if (!isFocused) {
      setTooltip(null);
    }
  }, [isFocused]);

  // Subtle foreground-only parallax while focused: keeps the blurred backdrop
  // 100% static (GPU-cached) while giving the lifted laptop palpable Z-depth.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    if (!isFocused) {
      element.style.translate = "";
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frameId = 0;
    let lastTime = 0;

    const step = (time: number) => {
      frameId = 0;
      const elapsed = lastTime
        ? Math.min((time - lastTime) / 1000, 0.05)
        : 1 / 60;
      lastTime = time;
      const follow = 1 - Math.exp(-elapsed * FOCUS_PARALLAX_RATE);
      currentX += (targetX - currentX) * follow;
      currentY += (targetY - currentY) * follow;
      if (Math.hypot(targetX - currentX, targetY - currentY) < 0.05) {
        currentX = targetX;
        currentY = targetY;
      } else {
        frameId = requestAnimationFrame(step);
      }
      element.style.translate = `${currentX.toFixed(2)}px ${currentY.toFixed(2)}px`;
    };

    const schedule = () => {
      if (!frameId) {
        lastTime = performance.now();
        frameId = requestAnimationFrame(step);
      }
    };

    const onPointerMove = (event: globalThis.PointerEvent) => {
      if (event.pointerType !== "mouse") {
        return;
      }
      const nx = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
      const ny = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
      targetX = -nx * FOCUS_PARALLAX_PX;
      targetY = -ny * FOCUS_PARALLAX_PX;
      schedule();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(frameId);
      element.style.translate = "";
    };
  }, [isFocused]);

  return (
    <div
      className="relative h-full w-full"
      onClickCapture={handleClickCapture}
      onPointerDown={handlePointerDown}
      onPointerLeave={handleStickerPointerLeave}
      onPointerMove={handleStickerPointerMove}
      ref={containerRef}
    >
      {/* MacBook base image */}
      {/* biome-ignore lint/correctness/useImageSize: dimensions set by CSS classes */}
      <img
        alt="MacBook"
        className={tw(
          "pointer-events-none h-full w-full object-contain transition-[filter] duration-300",
          isFocused &&
            !isLampOn &&
            "drop-shadow-[0_28px_42px_rgba(0,0,0,0.22)]",
          isDomHidden && "opacity-0"
        )}
        src={macbookImage}
      />

      {/* Stickers layer */}
      {content.stickers.map((sticker) => (
        <img
          alt={sticker.description}
          className={tw(
            "pointer-events-auto absolute drop-shadow-[0_0.5px_1px_rgba(0,0,0,0.22)] transition",
            isFocused &&
              tooltip?.stickerSrc === sticker.src &&
              "-translate-y-px drop-shadow-sm",
            isDomHidden && "opacity-0"
          )}
          data-description={sticker.description}
          data-sticker-src={sticker.src}
          height={sticker.height}
          key={sticker.src}
          ref={getStickerRef(sticker.src)}
          src={sticker.src}
          style={{
            height: `${sticker.height}px`,
            left: `${sticker.x}%`,
            top: `${sticker.y}%`,
            transform: "translate(-50%, -50%)",
            width: `${sticker.width}px`,
          }}
          width={sticker.width}
        />
      ))}
      {isLampOn ? (
        <LitMacbook
          hoveredSticker={isFocused ? (tooltip?.stickerSrc ?? null) : null}
          isFocused={isFocused}
          lidSrc={macbookImage}
          onFail={handleLitFail}
          onReady={handleLitReady}
          stickers={content.stickers}
        />
      ) : null}
      <AnimatePresence>
        {isFocused && tooltip ? (
          <motion.div
            animate={{
              opacity: 1,
              scale: 1,
              x: tooltip.side === "left" ? "-100%" : 0,
            }}
            className="pointer-events-none absolute top-0 left-0 z-10 w-max max-w-[calc(100vw-2rem)]"
            exit={{
              opacity: 0,
              scale: 0,
              x: tooltip.side === "left" ? "-100%" : 0,
            }}
            initial={{
              opacity: 0,
              scale: 0,
              x: tooltip.side === "left" ? "-100%" : 0,
            }}
            key={tooltip.stickerSrc}
            ref={tooltipRef}
            style={{
              left: tooltip.x + edgeShift,
              top: tooltip.y,
              transformOrigin:
                tooltip.side === "right"
                  ? "-12px -12px"
                  : "calc(100% + 12px) -12px",
            }}
            transition={{ bounce: 0.24, duration: 0.48, type: "spring" }}
          >
            <div
              className={tw(
                "bg-background1 outline-border px-4 py-3 shadow-lg outline",
                tooltip.side === "right"
                  ? "rounded-tr-3xl rounded-b-3xl"
                  : "rounded-tl-3xl rounded-b-3xl"
              )}
            >
              {tooltip.description}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export const MacbookCard = memo(MacbookCardComponent);
