import { AnimatePresence, motion } from "framer-motion";
import type { PointerEvent } from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { MacbookCardContent } from "@/cards/registry";
import { tw } from "@/lib/utils";
import macbookImage from "/src/assets/macbook/macbook.webp";

interface MacbookCardProps {
  content: MacbookCardContent;
  isFocused?: boolean;
}

interface StickerTooltipState {
  description: string;
  stickerSrc: string;
  x: number;
  y: number;
}

const MacbookCardComponent = ({
  content,
  isFocused = false,
}: MacbookCardProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stickerRefs = useRef<Map<string, HTMLImageElement | null>>(new Map());
  const [tooltip, setTooltip] = useState<StickerTooltipState | null>(null);

  const resolveTooltipPosition = useCallback((event: PointerEvent<Element>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return null;
    }

    return {
      x: event.clientX - rect.left + 12,
      y: event.clientY - rect.top + 12,
    };
  }, []);

  const handleStickerPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!isFocused) {
        return;
      }

      const position = resolveTooltipPosition(event);
      let hoveredSticker: {
        description: string;
        stickerSrc: string;
      } | null = null;

      for (const sticker of content.stickers) {
        const element = stickerRefs.current.get(sticker.src);
        if (!element) {
          continue;
        }

        const rect = element.getBoundingClientRect();
        if (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        ) {
          hoveredSticker = {
            description: sticker.description,
            stickerSrc: sticker.src,
          };
          break;
        }
      }

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
    [content.stickers, isFocused, resolveTooltipPosition]
  );

  const handleStickerPointerLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  useEffect(() => {
    if (!isFocused) {
      setTooltip(null);
    }
  }, [isFocused]);

  return (
    <div
      className="relative h-full w-full"
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
          ref={(element) => {
            stickerRefs.current.set(sticker.src, element);
          }}
          src={sticker.src}
          style={{
            left: `${sticker.x}%`,
            top: `${sticker.y}%`,
            width: `${sticker.width}px`,
            height: `${sticker.height}px`,
            transform: "translate(-50%, -50%)",
          }}
          width={sticker.width}
        />
      ))}
      <AnimatePresence>
        {isFocused && tooltip && (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="pointer-events-none absolute top-0 left-0 z-10"
            exit={{ opacity: 0, scale: 0 }}
            initial={{ opacity: 0, scale: 0 }}
            key="tooltip"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transformOrigin: "-12px -12px",
            }}
            transition={{ type: "spring", bounce: 0.35, duration: 0.5 }}
          >
            <div className="text-nowrap rounded-b-full rounded-tr-full bg-background1 px-4 py-3 outline outline-border backdrop-blur-sm">
              {tooltip.description}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const MacbookCard = memo(MacbookCardComponent);
