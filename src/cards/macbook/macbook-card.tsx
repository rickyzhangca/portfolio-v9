import { AnimatePresence, motion } from "framer-motion";
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
        className="pointer-events-none h-full w-full object-contain"
        src={macbookImage}
      />

      {/* Stickers layer */}
      {content.stickers.map((sticker) => (
        <img
          alt={sticker.description}
          className={tw(
            "pointer-events-auto absolute drop-shadow-xs transition",
            isFocused &&
              tooltip?.stickerSrc === sticker.src &&
              "-translate-y-0.5 drop-shadow-md"
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
                "bg-background1 px-4 py-3 shadow-lg outline outline-border",
                tooltip.side === "right"
                  ? "rounded-b-3xl rounded-tr-3xl"
                  : "rounded-b-3xl rounded-tl-3xl"
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
