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
import { SPRING_PRESETS, TRANSITIONS } from "@/lib/animation";
import { LAMP_LIFT } from "@/components/lighting/lamp-shadows";
import { getSwagPosition } from "@/lib/card-layout";
import { tw } from "@/lib/utils";
import type { CanvasSwagStackItem, Position } from "@/types/canvas";
import { SwagImageButton } from "./swag-image";

const STAGGER_DELAY = 0.01;

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

      // Collapsed position: stacked under cover
      const collapsedPos = COLLAPSED_POSITIONS[Math.min(index, 5)];

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

        {/* Swag items in grid - only render visible items when collapsed */}
        {item.swags.map((swag, index) => {
          // Only render first N items when collapsed, all items when expanded
          const COLLAPSED_VISIBLE_COUNT = 6;
          if (!isExpanded && index >= COLLAPSED_VISIBLE_COUNT) {
            return null;
          }

          const offset = getSwagOffset(index);

          return (
            <motion.div
              animate={{
                opacity: 1,
                scale: isExpanded ? swagLayout.expandedScale : 0.6,
                x: isExpanded ? offset.expandedX : offset.collapsedX,
                y: isExpanded ? offset.expandedY : offset.collapsedY,
                rotate: isExpanded ? offset.fanRotate : offset.collapsedRotate,
              }}
              className="absolute top-0 left-0 origin-top-left will-change-transform"
              data-lamp-shadow={LAMP_LIFT.swag}
              // The collapsed pile enters with the scene. Swags past it mount
              // when the collection opens, and fan out from under the cover.
              initial={
                isExpanded
                  ? {
                      opacity: 0,
                      scale: 0.6,
                      x: offset.collapsedX,
                      y: offset.collapsedY,
                      rotate: offset.collapsedRotate,
                    }
                  : false
              }
              key={swag.src}
              style={{
                width: swagLayout.itemSize,
                zIndex: item.swags.length - index - 1,
                pointerEvents: isExpanded ? "auto" : "none",
              }}
              transition={
                isExpanded
                  ? {
                      opacity: {
                        ...SPRING_PRESETS.snappy,
                        delay: index * STAGGER_DELAY * 1.5,
                      },
                      scale: {
                        ...SPRING_PRESETS.snappy,
                        delay: index * STAGGER_DELAY * 1.5,
                      },
                      x: {
                        ...SPRING_PRESETS.snappy,
                        delay: index * STAGGER_DELAY,
                      },
                      y: {
                        ...SPRING_PRESETS.snappy,
                        delay: index * STAGGER_DELAY,
                      },
                      rotate: {
                        ...SPRING_PRESETS.snappy,
                        delay: index * STAGGER_DELAY,
                      },
                    }
                  : SPRING_PRESETS.quick
              }
            >
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
