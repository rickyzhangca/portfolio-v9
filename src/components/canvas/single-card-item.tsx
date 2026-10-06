"use no memo";

import { motion } from "framer-motion";
import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import { ARTICLE_CARD_PREVIEW_INSET } from "@/cards/article/article-card";
import { getInteractionPolicy } from "@/cards/registry";
import { RenderCard } from "@/cards/render-card";
import { PaperCardProjection } from "@/components/documents/paper-card-projection";
import { useDraggable } from "@/hooks/use-draggable";
import { SPRING_PRESETS, TRANSITIONS } from "@/lib/animation";
import { getDocumentLayoutId } from "@/lib/document-motion";
import { tw } from "@/lib/utils";
import type { CanvasSingleItem, Position } from "@/types/canvas";

const documentLabel = (kind: CanvasSingleItem["card"]["kind"]) => {
  if (kind === "resume") {
    return "Resume";
  }
  if (kind === "about") {
    return "About";
  }
};

interface SingleCardItemProps {
  documentOpen?: boolean;
  dragDisabled: boolean;
  isFocused: boolean;
  item: CanvasSingleItem;
  onActivate?: (trigger?: HTMLElement) => void;
  onBringToFront: () => void;
  onCardHeightMeasured?: (cardId: string, height: number) => void;
  onDragEnd?: () => void;
  onDragStart?: () => void;
  onPositionUpdate: (position: Position) => void;
  repulsionOffset: Position;
  scale: number;
  setRootRef?: (el: HTMLDivElement | null) => void;
}

export const SingleCardItem = ({
  documentOpen = false,
  item,
  scale,
  isFocused,
  dragDisabled,
  repulsionOffset,
  onBringToFront,
  onPositionUpdate,
  onDragStart,
  onDragEnd,
  onCardHeightMeasured,
  onActivate,
  setRootRef,
}: SingleCardItemProps) => {
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(
    item.card.size.height
  );

  const cardWithSize = useMemo(
    () => ({
      ...item.card,
      size: {
        ...item.card.size,
        height: measuredHeight ?? item.card.size.height,
      },
    }),
    [item.card, measuredHeight]
  ) as typeof item.card;

  const { isDragging, didDragRef, handleMouseDown, currentPosition } =
    useDraggable({
      disabled: dragDisabled,
      onDragEnd: (finalPosition) => {
        onPositionUpdate(finalPosition);
        onDragEnd?.();
      },
      onDragStart: () => {
        onBringToFront();
        onDragStart?.();
      },
      position: item.position,
      scale,
    });

  const handleCardMeasure = useCallback(
    (height: number) => {
      if (measuredHeight !== height) {
        setMeasuredHeight(height);
      }
      // Propagate measured height to canvas state
      onCardHeightMeasured?.(item.card.id, height);
    },
    [measuredHeight, onCardHeightMeasured, item.card.id]
  );

  const interactionPolicy = getInteractionPolicy(item.card.kind);
  const projectsPaper = interactionPolicy.activate === "open-modal";
  const isActivatable = interactionPolicy.activate !== "none";
  const focusScale =
    interactionPolicy.activate === "toggle-focus"
      ? (interactionPolicy.focusScale ?? 1)
      : 1;
  const shouldRenderFocusHiRes =
    interactionPolicy.activate === "toggle-focus" && focusScale > 1;

  const baseWidth = cardWithSize.size.width ?? 0;
  const baseHeight = cardWithSize.size.height ?? 0;
  const hiResCard = shouldRenderFocusHiRes
    ? ({
        ...cardWithSize,
        size: {
          ...cardWithSize.size,
          height: baseHeight * focusScale,
          width: baseWidth * focusScale,
        },
      } satisfies typeof cardWithSize)
    : cardWithSize;

  // When scaling up via `transform: scale(...)`, browsers may decode images at the
  // element's untransformed layout size (which can look blurry when scaled up).
  // For focusable cards, render at the "focused" layout size and scale down when
  // unfocused so the image stays crisp at full focus scale.
  const focusRenderScale = (() => {
    if (!shouldRenderFocusHiRes) {
      return 1;
    }
    return isFocused ? 1 : 1 / focusScale;
  })();
  const focusOffsetX = shouldRenderFocusHiRes
    ? -((baseWidth * focusScale - baseWidth) / 2)
    : 0;
  const focusOffsetY = shouldRenderFocusHiRes
    ? -((baseHeight * focusScale - baseHeight) / 2)
    : 0;

  const handleActivate = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest(".no-drag")) {
        return;
      }

      // Prevent "click after drag" from triggering click action
      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }

      if (isActivatable && onActivate) {
        onActivate(e.currentTarget);
      }
    },
    [didDragRef, isActivatable, onActivate]
  );
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget || !isActivatable) {
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onActivate?.(event.currentTarget);
      }
    },
    [isActivatable, onActivate]
  );
  const cardView = (
    <RenderCard
      card={hiResCard}
      className="shadow-none hover:shadow-none"
      isFocused={isFocused}
      onMeasure={shouldRenderFocusHiRes ? undefined : handleCardMeasure}
    />
  );

  return (
    <motion.div
      animate={{
        x: repulsionOffset.x,
        y: repulsionOffset.y,
      }}
      className={tw(
        "no-pan absolute top-0 left-0 will-change-transform",
        "select-none",
        !dragDisabled && "cursor-grab",
        isDragging && "cursor-grabbing"
      )}
      data-card-item-id={item.id}
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
        <motion.div
          animate={{
            opacity: 1,
            scale: (() => {
              if (shouldRenderFocusHiRes) {
                return focusRenderScale;
              }
              return isFocused ? focusScale : 1;
            })(),
            x: focusOffsetX,
            y: focusOffsetY,
          }}
          aria-label={isActivatable ? `Open ${item.card.kind}` : undefined}
          className={tw(
            "absolute top-0 left-0 will-change-transform",
            projectsPaper
              ? "group"
              : "drop-shadow-[0_16px_16px_rgba(0,0,0,0.12)] transition-[filter] hover:drop-shadow-[0_12px_24px_rgba(0,0,0,0.24)]"
          )}
          initial={{
            opacity: 0,
            scale: 0,
            x: focusOffsetX,
            y: focusOffsetY,
          }}
          key={cardWithSize.id}
          onClick={handleActivate}
          onKeyDown={handleKeyDown}
          role={isActivatable ? "button" : undefined}
          style={{
            pointerEvents: "auto",
            zIndex: 1,
          }}
          tabIndex={isActivatable ? 0 : undefined}
          transition={{ ...SPRING_PRESETS.smooth, delay: 0.12 }}
        >
          {projectsPaper ? (
            <PaperCardProjection
              inset={ARTICLE_CARD_PREVIEW_INSET}
              label={documentLabel(item.card.kind)}
              layoutId={getDocumentLayoutId(item.id, item.card.id)}
              open={documentOpen}
              size={{ height: baseHeight, width: baseWidth }}
            >
              {cardView}
            </PaperCardProjection>
          ) : (
            cardView
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
