import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { RenderCard } from "@/cards/render-card";
import { fanConfigAtom } from "@/context/atoms";
import { useCanvasEnvironment } from "@/context/canvas-layout";
import { useDraggable } from "@/hooks/use-draggable";
import { whenPageIdle } from "@/hooks/page-idle";
import { useTogglePress } from "@/hooks/use-toggle-press";
import {
  REPULSION_TRANSITION,
  SPRING_PRESETS,
  TRANSITIONS,
} from "@/lib/animation";
import { LAMP_LIFT } from "@/components/lighting/lamp-shadows";
import { LampSprite } from "@/components/lighting/lamp-sprite";
import { getSwagPosition } from "@/lib/card-layout";
import { tw } from "@/lib/utils";
import type { CanvasSwagStackItem, Position } from "@/types/canvas";
import { SwagImageButton } from "./swag-image";

const COLLAPSED_VISIBLE_COUNT = 6;
/**
 * Hidden stickers sit centered inside the 180x180 blue sticky note (90x90 at
 * scale 0.6 -> [45..135]), completely occluded by the opaque cover instead of
 * poking out of COLLAPSED_POSITIONS[5] (120, 100).
 */
const HIDDEN_STACK_ORIGIN = { rotate: 0, x: 45, y: 45 } as const;
/** Strict row-by-row and item-by-item stagger shared across every visible row. */
const SWAG_BASE_DELAY_S = 0.02;
const SWAG_OPEN_COL_STEP_S = 0.018;
const SWAG_OPEN_ROW_STEP_S = 0.055;
/** Delay fade-in past the exit bottleneck so lower rows clear upper rows before becoming opaque. */
const SWAG_OPEN_FADE_BASE_S = 0.05;
const SWAG_OPEN_FADE_ROW_STEP_S = 0.018;
/** Reverse bottom-right to top-left stagger for visible rows on close. */
const SWAG_CLOSE_COL_STEP_S = 0.01;
const SWAG_CLOSE_ROW_STEP_S = 0.032;
const SWAG_MAX_VISIBLE_ROW = 6;
/** Fade hidden stickers only once they are tucked behind the opaque cover. */
const SWAG_HIDDEN_FADE_DELAY_S = 0.26;
export const SWAG_RETURN_MS = 620;

const SWAG_OPEN_MOVE = {
  type: "spring",
  stiffness: 320,
  damping: 34,
  mass: 1,
} as const;
const SWAG_CLOSE_MOVE = {
  type: "spring",
  stiffness: 380,
  damping: 38,
  mass: 1,
} as const;

// Collapsed positions for swag items (stacked under cover)
const COLLAPSED_POSITIONS = [
  { x: 30, y: -40, rotate: 10 },
  { x: 60, y: -40, rotate: 0 },
  { x: 120, y: -20, rotate: -5 },
  { x: 140, y: 20, rotate: 5 },
  { x: 130, y: 60, rotate: -3 },
  { x: 120, y: 100, rotate: 3 },
];

// Tooltip positioning only matters once someone hovers or taps a swag item, so
// it stays out of the initial canvas bundle and is fetched once the first view
// has loaded, or when the collection opens before that.
const loadSwagLabel = () =>
  import("./swag-label").then((module) => ({ default: module.SwagLabel }));
const SwagLabel = lazy(loadSwagLabel);

interface SwagGroupProps {
  item: CanvasSwagStackItem;
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

export const SwagGroup = ({
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
}: SwagGroupProps) => {
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(
    item.cover.size.height
  );
  // Keep expanded stickers mounted while they glide back under the cover.
  const [retainExpandedSwags, setRetainExpandedSwags] = useState(isExpanded);
  useEffect(() => {
    if (isExpanded) {
      setRetainExpandedSwags(true);
      return;
    }
    const timer = setTimeout(
      () => setRetainExpandedSwags(false),
      SWAG_RETURN_MS
    );
    return () => clearTimeout(timer);
  }, [isExpanded]);
  // Labels stay once shown: swapping the trigger back would remount images.
  const [showLabels, setShowLabels] = useState(isExpanded);
  if (isExpanded && !showLabels) {
    setShowLabels(true);
  }

  useEffect(() => {
    let active = true;
    // Rendering the loaded labels before the first expansion keeps 100+ items
    // from suspending at once when the collection opens.
    whenPageIdle()
      .then(loadSwagLabel)
      .then(() => {
        if (active) {
          setShowLabels(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const fanConfig = useAtomValue(fanConfigAtom);
  const { layout } = useCanvasEnvironment();
  const swagLayout = layout.swag;

  const cardWithSize = useMemo(
    () => ({
      ...item.cover,
      size: {
        ...item.cover.size,
        height: measuredHeight ?? item.cover.size.height,
      },
    }),
    [item.cover, measuredHeight]
  );

  const coverWidth = cardWithSize.size.width ?? 240;

  const getSwagOffset = useCallback(
    (index: number) => {
      const expanded = getSwagPosition(
        index,
        coverWidth,
        fanConfig,
        swagLayout
      );

      // Collapsed position: first 6 peek out around the cover; the rest stack
      // centered completely behind the opaque cover.
      const collapsedPos =
        index < COLLAPSED_VISIBLE_COUNT
          ? COLLAPSED_POSITIONS[index]
          : HIDDEN_STACK_ORIGIN;

      return {
        expandedX: expanded.x,
        expandedY: expanded.y,
        collapsedX: collapsedPos.x,
        collapsedY: collapsedPos.y,
        collapsedRotate: collapsedPos.rotate,
        fanRotate: expanded.rotate,
      };
    },
    [coverWidth, fanConfig, swagLayout]
  );

  const togglePress = useTogglePress(onToggleExpanded);
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
        onCardHeightMeasured?.(item.cover.id, height);
      }
    },
    [measuredHeight, onCardHeightMeasured, item.cover.id]
  );

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
      data-expanded={isExpanded}
      data-swag-stack-id={item.id}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      ref={setRootRef}
      style={{ zIndex: item.zIndex }}
      transition={{
        opacity: TRANSITIONS.opacity,
        x: REPULSION_TRANSITION,
        y: REPULSION_TRANSITION,
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
        {/* Cover card */}
        <motion.div
          animate={{
            opacity: 1,
            scale: 1,
            rotate: 0,
          }}
          aria-expanded={isExpanded}
          aria-label="Toggle swag collection"
          className="absolute top-0 left-0"
          // The scene's entrance moves the whole item; see canvas-item.
          initial={false}
          {...togglePress}
          role="button"
          style={{
            pointerEvents: "auto",
            zIndex: item.swags.length,
          }}
          tabIndex={0}
        >
          <RenderCard
            card={cardWithSize}
            isExpanded={isExpanded}
            onMeasure={handleCardMeasure}
          />
        </motion.div>

        {/* Swag items in grid: every visible row shares one unified tuck/fan motion from behind the cover */}
        {item.swags.map((swag, index) => {
          const isHiddenWhenCollapsed = index >= COLLAPSED_VISIBLE_COUNT;
          if (!(isExpanded || retainExpandedSwags) && isHiddenWhenCollapsed) {
            return null;
          }

          const offset = getSwagOffset(index);
          const col = index % swagLayout.columns;
          const row = Math.floor(index / swagLayout.columns);
          // Rows well below the fold stay below the viewport instead of
          // pouring through the visible rows under the sticky note.
          const isFarBelowFold = row > SWAG_MAX_VISIBLE_ROW;
          const openDelay =
            SWAG_BASE_DELAY_S +
            Math.min(row, SWAG_MAX_VISIBLE_ROW) * SWAG_OPEN_ROW_STEP_S +
            col * SWAG_OPEN_COL_STEP_S;
          const openOpacityDelay = isFarBelowFold
            ? SWAG_BASE_DELAY_S + SWAG_MAX_VISIBLE_ROW * SWAG_OPEN_ROW_STEP_S
            : openDelay +
              SWAG_OPEN_FADE_BASE_S +
              row * SWAG_OPEN_FADE_ROW_STEP_S;
          const lastRow = Math.floor(
            Math.max(item.swags.length - 1, 0) / swagLayout.columns
          );
          const maxCloseRow = Math.min(SWAG_MAX_VISIBLE_ROW, lastRow);
          const reverseRow = Math.max(0, maxCloseRow - row);
          const reverseCol = Math.max(0, swagLayout.columns - 1 - col);
          const closeDelay = isFarBelowFold
            ? 0
            : reverseRow * SWAG_CLOSE_ROW_STEP_S +
              reverseCol * SWAG_CLOSE_COL_STEP_S;

          const openInitial = (() => {
            if (!(isExpanded && isHiddenWhenCollapsed)) {
              return false as const;
            }
            if (isFarBelowFold) {
              return {
                opacity: 0,
                rotate: offset.fanRotate,
                scale: swagLayout.expandedScale * 0.92,
                x: offset.expandedX,
                y: offset.expandedY,
              };
            }
            return {
              opacity: 0,
              rotate: offset.collapsedRotate,
              scale: 0.6,
              x: offset.collapsedX,
              y: offset.collapsedY,
            };
          })();

          const closePose = isFarBelowFold
            ? {
                rotate: offset.fanRotate,
                scale: swagLayout.expandedScale * 0.9,
                x: offset.expandedX,
                y: offset.expandedY,
              }
            : {
                rotate: offset.collapsedRotate,
                scale: 0.6,
                x: offset.collapsedX,
                y: offset.collapsedY,
              };

          const closeTransition = isFarBelowFold
            ? {
                opacity: { duration: 0.14, ease: "easeOut" as const },
                scale: { duration: 0.14, ease: "easeOut" as const },
                x: { duration: 0.14, ease: "easeOut" as const },
                y: { duration: 0.14, ease: "easeOut" as const },
                rotate: { duration: 0.14, ease: "easeOut" as const },
              }
            : {
                opacity: {
                  duration: 0.08,
                  ease: "easeOut" as const,
                  delay: closeDelay + SWAG_HIDDEN_FADE_DELAY_S,
                },
                scale: { ...SWAG_CLOSE_MOVE, delay: closeDelay },
                x: { ...SWAG_CLOSE_MOVE, delay: closeDelay },
                y: { ...SWAG_CLOSE_MOVE, delay: closeDelay },
                rotate: { ...SWAG_CLOSE_MOVE, delay: closeDelay },
              };

          return (
            <motion.div
              animate={{
                opacity: isExpanded || !isHiddenWhenCollapsed ? 1 : 0,
                scale: isExpanded ? swagLayout.expandedScale : closePose.scale,
                x: isExpanded ? offset.expandedX : closePose.x,
                y: isExpanded ? offset.expandedY : closePose.y,
                rotate: isExpanded ? offset.fanRotate : closePose.rotate,
              }}
              className="absolute top-0 left-0 origin-top-left will-change-transform"
              data-lamp-shadow={LAMP_LIFT.swag}
              initial={openInitial}
              key={swag.src}
              style={{
                width: swagLayout.itemSize,
                zIndex: item.swags.length - index - 1,
                pointerEvents: isExpanded ? "auto" : "none",
              }}
              transition={
                isExpanded
                  ? {
                      opacity: isHiddenWhenCollapsed
                        ? {
                            duration: 0.2,
                            ease: "easeOut",
                            delay: openOpacityDelay,
                          }
                        : TRANSITIONS.opacity,
                      scale: { ...SWAG_OPEN_MOVE, delay: openDelay },
                      x: { ...SWAG_OPEN_MOVE, delay: openDelay },
                      y: { ...SWAG_OPEN_MOVE, delay: openDelay },
                      rotate: { ...SWAG_OPEN_MOVE, delay: openDelay },
                    }
                  : closeTransition
              }
            >
              <LampSprite outline="image" />
              {showLabels ? (
                <Suspense fallback={<SwagImageButton swag={swag} />}>
                  <SwagLabel swag={swag} />
                </Suspense>
              ) : (
                <SwagImageButton swag={swag} />
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};
