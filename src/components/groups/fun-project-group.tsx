import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { RenderCard } from "@/cards/render-card";
import { useDraggable } from "@/hooks/use-draggable";
import { SPRING_PRESETS, TRANSITIONS } from "@/lib/animation";
import { tw } from "@/lib/utils";
import type { CanvasFunStackItem, Position } from "@/types/canvas";

const CONTENT_WIDTH = 680;
const CONTENT_GAP = 24;
const STAGGER_DELAY = 0.1;
const VERTICAL_GAP = 16;
const CONTENT_CARD_HEIGHT = 120; // Fallback height estimate before measurement
const MEASUREMENT_SETTLE_MS = 120;
const MEASUREMENT_MAX_WAIT_MS = 1500;
const MarkdownRenderer = lazy(() =>
  import("../markdown-renderer").then((module) => ({
    default: module.MarkdownRenderer,
  }))
);

interface FunProjectGroupProps {
  item: CanvasFunStackItem;
  scale: number;
  isExpanded: boolean;
  dragDisabled: boolean;
  repulsionOffset: Position;
  onBringToFront: () => void;
  onToggleExpanded: () => void;
  onPositionUpdate: (position: Position) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onCardHeightMeasured?: (cardId: string, height: number) => void;
  setRootRef?: (el: HTMLDivElement | null) => void;
}

export const FunProjectGroup = ({
  item,
  scale,
  isExpanded,
  dragDisabled,
  repulsionOffset,
  onBringToFront,
  onToggleExpanded,
  onPositionUpdate,
  onDragStart,
  onDragEnd,
  onCardHeightMeasured,
  setRootRef,
}: FunProjectGroupProps) => {
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(
    item.card.size.height
  );
  const [contentCardHeights, setContentCardHeights] = useState<
    Record<number, number>
  >({});
  const [isContentLayoutReady, setIsContentLayoutReady] = useState(false);
  const contentCardElementsRef = useRef(new Map<number, HTMLDivElement>());
  const contentCardRefCallbacksRef = useRef(
    new Map<number, (el: HTMLDivElement | null) => void>()
  );
  const measurementSettleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const measurementMaxWaitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const cardPointerDownRef = useRef<{
    clientX: number;
    clientY: number;
  } | null>(null);

  const cardWithSize = useMemo(() => {
    return {
      ...item.card,
      size: {
        ...item.card.size,
        height: measuredHeight ?? item.card.size.height,
      },
    };
  }, [item.card, measuredHeight]);

  const { isDragging, handleMouseDown, currentPosition } = useDraggable({
    position: item.position,
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

  const handleCardMeasure = useCallback(
    (height: number) => {
      if (measuredHeight !== height) {
        setMeasuredHeight(height);
        onCardHeightMeasured?.(item.card.id, height);
      }
    },
    [measuredHeight, onCardHeightMeasured, item.card.id]
  );

  const handleContentCardMeasure = useCallback(
    (index: number, height: number) => {
      if (height <= 0) {
        return;
      }

      setContentCardHeights((prev) => {
        if (prev[index] === height) {
          return prev; // Prevent unnecessary re-renders
        }
        return { ...prev, [index]: height };
      });
    },
    []
  );

  const getContentCardRefCallback = useCallback(
    (index: number) => {
      let callback = contentCardRefCallbacksRef.current.get(index);
      if (!callback) {
        callback = (el: HTMLDivElement | null) => {
          if (el) {
            contentCardElementsRef.current.set(index, el);
            const initialHeight = el.getBoundingClientRect().height;
            handleContentCardMeasure(index, initialHeight);
          } else {
            contentCardElementsRef.current.delete(index);
          }
        };
        contentCardRefCallbacksRef.current.set(index, callback);
      }
      return callback;
    },
    [handleContentCardMeasure]
  );

  const clearMeasurementTimeouts = useCallback(() => {
    if (measurementSettleTimeoutRef.current) {
      clearTimeout(measurementSettleTimeoutRef.current);
      measurementSettleTimeoutRef.current = null;
    }

    if (measurementMaxWaitTimeoutRef.current) {
      clearTimeout(measurementMaxWaitTimeoutRef.current);
      measurementMaxWaitTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isExpanded) {
      clearMeasurementTimeouts();
      setIsContentLayoutReady(false);
      return;
    }

    const observers = new Map<number, ResizeObserver>();
    for (const [index, element] of contentCardElementsRef.current.entries()) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const height =
            entry.borderBoxSize && entry.borderBoxSize.length > 0
              ? entry.borderBoxSize[0].blockSize
              : entry.contentRect.height;
          handleContentCardMeasure(index, height);
        }
      });
      observer.observe(element);
      observers.set(index, observer);
    }

    return () => {
      for (const observer of observers.values()) {
        observer.disconnect();
      }
    };
  }, [
    clearMeasurementTimeouts,
    isExpanded,
    item.card.content.items.length,
    handleContentCardMeasure,
  ]);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    setIsContentLayoutReady(false);
    clearMeasurementTimeouts();
    measurementMaxWaitTimeoutRef.current = setTimeout(() => {
      setIsContentLayoutReady(true);
    }, MEASUREMENT_MAX_WAIT_MS);

    return clearMeasurementTimeouts;
  }, [clearMeasurementTimeouts, isExpanded, item.id]);

  const contentCardOffsets = useMemo(() => {
    let offsetY = 0;
    return item.card.content.items.map((_, index) => {
      const currentOffset = offsetY;
      const measuredHeight = contentCardHeights[index] ?? CONTENT_CARD_HEIGHT;
      offsetY += measuredHeight + VERTICAL_GAP;
      return currentOffset;
    });
  }, [item.card.content.items, contentCardHeights]);

  const allContentCardsMeasured = useMemo(() => {
    return item.card.content.items.every(
      (_, index) => (contentCardHeights[index] ?? 0) > 0
    );
  }, [item.card.content.items, contentCardHeights]);

  useEffect(() => {
    if (!isExpanded || isContentLayoutReady || !allContentCardsMeasured) {
      return;
    }

    if (measurementSettleTimeoutRef.current) {
      clearTimeout(measurementSettleTimeoutRef.current);
    }
    measurementSettleTimeoutRef.current = setTimeout(() => {
      setIsContentLayoutReady(true);
    }, MEASUREMENT_SETTLE_MS);
  }, [allContentCardsMeasured, isContentLayoutReady, isExpanded, contentCardHeights]);

  return (
    <motion.div
      animate={{
        x: repulsionOffset.x,
        y: repulsionOffset.y,
      }}
      className={tw(
        "absolute top-0 left-0 will-change-transform",
        !isExpanded && "select-none",
        !dragDisabled && "cursor-grab",
        isDragging && "cursor-grabbing"
      )}
      data-fun-stack-id={item.id}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      ref={setRootRef}
      style={{ zIndex: item.zIndex }}
      transition={{
        opacity: TRANSITIONS.opacity,
        x: SPRING_PRESETS.smooth,
        y: SPRING_PRESETS.smooth,
      }}
    >
      <motion.div
        animate={{
          x: currentPosition.x,
          y: currentPosition.y,
        }}
        className="absolute top-0 left-0 will-change-transform"
        initial={false}
        transition={isDragging ? TRANSITIONS.none : SPRING_PRESETS.quick}
      >
        {/* Main card with icons */}
        <motion.div
          className="absolute top-0 left-0"
          onPointerDown={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest(".no-drag")) {
              cardPointerDownRef.current = null;
              return;
            }

            if (e.button !== 0) {
              cardPointerDownRef.current = null;
              return;
            }

            cardPointerDownRef.current = {
              clientX: e.clientX,
              clientY: e.clientY,
            };
          }}
          onPointerUp={(e) => {
            const start = cardPointerDownRef.current;
            cardPointerDownRef.current = null;

            if (!start) {
              return;
            }

            const moved = Math.hypot(
              e.clientX - start.clientX,
              e.clientY - start.clientY
            );

            // Treat as a click only when the pointer didn't move
            if (moved < 6) {
              onToggleExpanded();
            }
          }}
          style={{
            pointerEvents: "auto",
            zIndex: item.card.content.items.length,
          }}
        >
          <RenderCard
            card={cardWithSize}
            isExpanded={isExpanded}
            isFocused={isExpanded}
            onMeasure={handleCardMeasure}
          />
        </motion.div>

        {/* Content cards that fly out to the right */}
        {isExpanded &&
          item.card.content.items.map((funItem, index) => {
          const cardWidth = cardWithSize.size.width ?? 240;
          const offsetY = contentCardOffsets[index] ?? 0;
          const offsetX = cardWidth + CONTENT_GAP;
          const shouldAnimateContent = isExpanded && isContentLayoutReady;

          return (
            <motion.div
              animate={{
                opacity: shouldAnimateContent ? 1 : 0,
                scale: shouldAnimateContent ? 1 : 0.8,
                x: offsetX,
                y: offsetY,
              }}
              className="absolute top-0 left-0 origin-top-left will-change-transform"
              initial={false}
              key={funItem.title}
              data-fun-content-card-index={index}
              style={{
                zIndex: item.card.content.items.length - index - 1,
                pointerEvents: shouldAnimateContent ? "auto" : "none",
                visibility: shouldAnimateContent ? "visible" : "hidden",
              }}
              transition={
                shouldAnimateContent
                  ? {
                      ...SPRING_PRESETS.snappy,
                      delay: index * STAGGER_DELAY,
                    }
                  : TRANSITIONS.none
              }
            >
              <div
                className="flex flex-col gap-5 rounded-3xl bg-background2 p-6 outline outline-border"
                ref={getContentCardRefCallback(index)}
                style={{ width: CONTENT_WIDTH }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <img
                      alt={funItem.title}
                      height={36}
                      src={funItem.icon}
                      width={40}
                    />
                    <span className="font-semibold text-xl">
                      {funItem.title}
                    </span>
                  </div>
                  <span
                    className={tw(
                      "inline-block rounded-full px-2.5 py-1 font-medium text-xs outline",
                      funItem.status === "Active" &&
                        "bg-green-500/10 text-green-700 outline-green-700/30",
                      funItem.status === "Maintaining" &&
                        "bg-blue-500/10 text-blue-700 outline-blue-700/30",
                      funItem.status === "Archived" &&
                        "bg-gray-500/10 text-gray-700 outline-gray-700/30"
                    )}
                  >
                    {funItem.status}
                  </span>
                </div>

                {funItem.image && (
                  <img
                    alt={funItem.title}
                    className="w-full rounded-md outline outline-border"
                    height={200}
                    src={funItem.image}
                    width={380}
                  />
                )}

                <div className="prose prose-sm max-w-none text-foreground1/80">
                  <Suspense fallback={null}>
                    <MarkdownRenderer content={funItem.description} />
                  </Suspense>
                </div>

                {funItem.link && (
                  <a
                    className="relative flex w-full items-center justify-center gap-3 rounded-full bg-linear-to-b from-background3 to-background4 px-6 py-3 text-center text-foreground1 shadow outline outline-border transition hover:from-background4 hover:shadow-md"
                    href={funItem.link.url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View
                    {funItem.link.type
                      ? ` on ${funItem.link.type === "Figma" ? "Figma" : "GitHub"}`
                      : ""}
                    {funItem.link.count && (
                      <span className="flex items-center gap-0.5 text-foreground2">
                        <ArrowUpRightIcon />
                        {funItem.link.count}
                      </span>
                    )}
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};
