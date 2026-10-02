import {
    ARTICLE_CARD_PREVIEW_INSET,
    ARTICLE_CARD_SIZE,
} from "@/cards/article/article-card";
import { RenderCard } from "@/cards/render-card";
import { PaperCardProjection } from "@/components/documents/paper-card-projection";
import { fanConfigAtom } from "@/context/atoms";
import { useDraggable } from "@/hooks/use-draggable";
import { AnalyticsEvents, track } from "@/lib/analytics";
import type { CanvasStackItem, Position } from "@/types/canvas";
import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import {
    type KeyboardEvent,
    type PointerEvent,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

const CARD_MASK_DATA_URI = `url("data:image/svg+xml,%3Csvg viewBox='0 0 240 340' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 301.6C0 315.041 0 321.762 2.61584 326.896C4.9168 331.412 8.58834 335.083 13.1042 337.384C18.2381 340 24.9587 340 38.4 340H201.6C215.041 340 221.762 340 226.896 337.384C231.412 335.083 235.083 331.412 237.384 326.896C240 321.762 240 315.041 240 301.6V250.875C240 245.342 240 242.576 239.541 239.894C239.133 237.514 238.457 235.187 237.526 232.958C236.476 230.448 234.994 228.112 232.03 223.441L231.47 222.559C228.506 217.888 227.024 215.552 225.974 213.042C225.043 210.813 224.367 208.486 223.959 206.106C223.5 203.424 223.5 200.658 223.5 195.125V134.875C223.5 129.342 223.5 126.576 223.959 123.894C224.367 121.514 225.043 119.187 225.974 116.958C227.024 114.448 228.506 112.112 231.47 107.441L232.03 106.559C234.994 101.888 236.476 99.5523 237.526 97.0418C238.457 94.8133 239.133 92.4865 239.541 90.1058C240 87.424 240 84.6577 240 79.1251V38.4C240 24.9587 240 18.2381 237.384 13.1042C235.083 8.58834 231.412 4.9168 226.896 2.61584C221.762 0 215.041 0 201.6 0H38.4C24.9587 0 18.2381 0 13.1042 2.61584C8.58834 4.9168 4.9168 8.58834 2.61584 13.1042C0 18.2381 0 24.9587 0 38.4V301.6Z'/%3E%3C/svg%3E")`;

import { SPRING_PRESETS, TRANSITIONS } from "@/lib/animation";
import {
    COLLAPSED_POSITIONS,
    COLLAPSED_VISIBLE_COUNT,
    getExpandedStackLayout,
    getStackPage,
} from "@/lib/card-layout";
import { getDocumentLayoutId } from "@/lib/document-motion";
import { tw } from "@/lib/utils";
import { StackArticleLink } from "./stack-article-link";

// Local definitions removed as they are now imported

// Entrance animation timing constants
const COVER_BASE_DELAY = 0.05; // seconds before first cover appears
const COVER_STAGGER = 0.05; // seconds between each group's cover
const PROJECT_DELAY_AFTER_COVER = 0.2; // seconds after cover before projects appear
const ZERO_REPULSION_OFFSET = { x: 0, y: 0 } as const;

interface CardRepulsionFrameProps {
  cardId: string;
  children: ReactNode;
  offset?: Position;
  zIndex: number;
}

function CardRepulsionFrame({
  cardId,
  children,
  offset = ZERO_REPULSION_OFFSET,
  zIndex,
}: CardRepulsionFrameProps) {
  return (
    <motion.div
      animate={{ x: offset.x, y: offset.y }}
      className="absolute top-0 left-0 will-change-transform"
      data-repulsion-card-id={cardId}
      initial={false}
      style={{ zIndex }}
      transition={SPRING_PRESETS.smooth}
    >
      {children}
    </motion.div>
  );
}

interface CardStackProps {
  cardRepulsionOffsets?: ReadonlyMap<string, Position>;
  dragDisabled: boolean;
  isExpanded: boolean;
  onActivateCard?: (cardId: string, trigger: HTMLElement) => void;
  onBringToFront: () => void;
  onCardHeightMeasured?: (cardId: string, height: number) => void;
  onDragEnd?: () => void;
  onDragStart?: () => void;
  onPageChange?: (page: number) => void;
  onPositionUpdate: (position: Position) => void;
  onToggleExpanded: () => void;
  page?: number;
  repulsionOffset: Position;
  scale: number;
  setRootRef?: (el: HTMLDivElement | null) => void;
  stack: CanvasStackItem;
  stackIndex: number;
}

export const CardStack = ({
  cardRepulsionOffsets,
  stack,
  stackIndex,
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
  onActivateCard,
  page = 0,
  onPageChange,
  setRootRef,
}: CardStackProps) => {
  const fanConfig = useAtomValue(fanConfigAtom);
  const stackPage = useMemo(() => getStackPage(stack, page), [stack, page]);
  const [retainExpandedCards, setRetainExpandedCards] = useState(isExpanded);
  useEffect(() => {
    if (isExpanded) {
      setRetainExpandedCards(true);
      return;
    }
    const timer = setTimeout(() => setRetainExpandedCards(false), 500);
    return () => clearTimeout(timer);
  }, [isExpanded]);
  const [measuredSizes, setMeasuredSizes] = useState<Record<string, number>>(
    {}
  );
  const movedItemsRef = useRef<Set<string>>(new Set());
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef<boolean>(false);
  // Control when projects become visible (after cover animation completes)
  const [hasShownProjects, setHasShownProjects] = useState(isExpanded);
  const showProjects = isExpanded || hasShownProjects;

  // Calculate entrance delays based on group index
  const coverEntranceDelay = COVER_BASE_DELAY + stackIndex * COVER_STAGGER;
  const projectsEntranceDelay = coverEntranceDelay + PROJECT_DELAY_AFTER_COVER;

  // Expansion takes precedence over the one-time staggered entrance.
  useEffect(() => {
    if (hasShownProjects) {
      return;
    }
    if (isExpanded) {
      setHasShownProjects(true);
      return;
    }
    const timer = setTimeout(() => {
      setHasShownProjects(true);
    }, projectsEntranceDelay * 1000); // Convert to ms
    return () => clearTimeout(timer);
  }, [hasShownProjects, isExpanded, projectsEntranceDelay]);

  // Cleanup timeout on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  const coverPointerDownRef = useRef<{
    clientX: number;
    clientY: number;
  } | null>(null);

  const coverWithSize = useMemo(() => {
    if (!stack.cover) {
      return;
    }
    return {
      ...stack.cover,
      size: {
        ...stack.cover.size,
        height: measuredSizes[stack.cover.id] ?? stack.cover.size.height,
      },
    };
  }, [stack.cover, measuredSizes]);

  const projectsWithSizes = useMemo(
    () =>
      stackPage.cards.map((card) => {
        const isFixedSize =
          card.kind === "stickynote" || card.kind === "article";
        return {
          ...card,
          size: {
            ...card.size,
            height: isFixedSize
              ? card.size.height
              : (measuredSizes[card.id] ?? card.size.height),
          },
        };
      }),
    [stackPage.cards, measuredSizes]
  );

  const expandedLayout = useMemo(
    () => getExpandedStackLayout(coverWithSize, projectsWithSizes, fanConfig),
    [coverWithSize, projectsWithSizes, fanConfig]
  );
  const renderedCards =
    isExpanded || retainExpandedCards
      ? projectsWithSizes
      : projectsWithSizes.slice(0, COLLAPSED_VISIBLE_COUNT);
  const coverRepulsionOffset =
    cardRepulsionOffsets?.get(stack.cover.id) ?? ZERO_REPULSION_OFFSET;

  const [isPeeking, setIsPeeking] = useState(false);
  const peekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerPeek = useCallback(() => {
    if (peekTimeoutRef.current) {
      clearTimeout(peekTimeoutRef.current);
    }
    setIsPeeking(true);
    peekTimeoutRef.current = setTimeout(() => {
      setIsPeeking(false);
    }, 200);
  }, []);

  // Cleanup timeout on unmount
  useEffect(
    () => () => {
      if (peekTimeoutRef.current) {
        clearTimeout(peekTimeoutRef.current);
      }
    },
    []
  );

  const { isDragging, handleMouseDown, currentPosition } = useDraggable({
    disabled: dragDisabled,
    onDragEnd: (finalPosition) => {
      onPositionUpdate(finalPosition);
      onDragEnd?.();
      if (!isMountedRef.current) {
        return;
      }

      // Track this item as moved
      movedItemsRef.current.add(stack.id);

      // Clear existing timeout
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }

      // Set new timeout to track rearrangement after user stops dragging
      dragTimeoutRef.current = setTimeout(() => {
        const count = movedItemsRef.current.size;
        if (count > 0) {
          track(AnalyticsEvents.CANVAS_REARRANGEMENT, { items_moved: count });
          movedItemsRef.current.clear();
        }
      }, 500);
    },
    onDragStart: () => {
      onBringToFront();
      onDragStart?.();
    },
    position: stack.position,
    scale,
  });

  const handlePreviousPage = useCallback(
    () => onPageChange?.(stackPage.page - 1),
    [onPageChange, stackPage.page]
  );
  const handleNextPage = useCallback(
    () => onPageChange?.(stackPage.page + 1),
    [onPageChange, stackPage.page]
  );

  const handleCardMeasure = useCallback(
    (id: string, height: number) => {
      setMeasuredSizes((prev) => {
        if (prev[id] === height) {
          return prev;
        }
        return { ...prev, [id]: height };
      });
      // Propagate measured height to canvas state
      onCardHeightMeasured?.(id, height);
    },
    [onCardHeightMeasured]
  );

  const handleCoverPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest(".no-drag")) {
        coverPointerDownRef.current = null;
        return;
      }

      if (e.button !== 0) {
        coverPointerDownRef.current = null;
        return;
      }

      coverPointerDownRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
      };
    },
    []
  );

  const handleCoverPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const start = coverPointerDownRef.current;
      coverPointerDownRef.current = null;

      if (!start) {
        return;
      }

      const moved = Math.hypot(
        e.clientX - start.clientX,
        e.clientY - start.clientY
      );

      // Treat as a click only when the pointer didn't move (pan/drag should not toggle).
      if (moved < 6) {
        if (!isExpanded) {
          track(AnalyticsEvents.STACK_EXPAND, {
            item_count: stack.stack.length,
            stack_type: stack.id,
          });
        }
        onToggleExpanded();
      }
    },
    [isExpanded, onToggleExpanded, stack.id, stack.stack.length]
  );

  const handleCoverKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (
        event.target === event.currentTarget &&
        (event.key === "Enter" || event.key === " ")
      ) {
        event.preventDefault();
        onToggleExpanded();
      }
    },
    [onToggleExpanded]
  );
  const handleCoverPointerCancel = useCallback(() => {
    coverPointerDownRef.current = null;
  }, []);

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
      data-card-stack-id={stack.id}
      data-expanded={isExpanded}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      ref={setRootRef}
      style={{ zIndex: stack.zIndex }}
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
        {coverWithSize && (
          <CardRepulsionFrame
            cardId={coverWithSize.id}
            offset={cardRepulsionOffsets?.get(coverWithSize.id)}
            zIndex={projectsWithSizes.length + 1}
          >
            <motion.div
              animate={{
                opacity: 1,
                rotate: 0,
                scale: 1,
                x: 0,
                y: 0,
              }}
              aria-expanded={isExpanded}
              aria-label={
                stack.cover.kind === "folder-cover"
                  ? `Toggle ${stack.cover.content.label} folder`
                  : `Toggle ${stack.cover.content.company}`
              }
              className="absolute top-0 left-0 drop-shadow-[0_8px_16px_rgba(0,0,0,0.16)] transition-[filter] will-change-transform hover:drop-shadow-[0_12px_20px_rgba(0,0,0,0.32)]"
              initial={{
                opacity: 0,
                rotate: -5,
                scale: 0,
                x: 0,
                y: 0,
              }}
              key={coverWithSize.id}
              onHoverStart={triggerPeek}
              onKeyDown={handleCoverKeyDown}
              onPointerCancel={handleCoverPointerCancel}
              onPointerDown={handleCoverPointerDown}
              onPointerUp={handleCoverPointerUp}
              role="button"
              style={{
                pointerEvents: "auto",
                zIndex: (stack.cover ? 1 : 0) + projectsWithSizes.length,
              }}
              tabIndex={0}
              transition={{
                ...SPRING_PRESETS.snappy,
                delay: coverEntranceDelay,
              }}
            >
              <div
                style={{
                  maskImage: CARD_MASK_DATA_URI,
                  maskPosition: "center",
                  maskRepeat: "no-repeat",
                  maskSize: `${coverWithSize.size.width}px ${coverWithSize.size.height ?? 0}px`,
                  WebkitMaskImage: CARD_MASK_DATA_URI,
                  WebkitMaskPosition: "center",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskSize: `${coverWithSize.size.width}px ${coverWithSize.size.height ?? 0}px`,
                }}
              >
                <RenderCard
                  card={coverWithSize}
                  className="shadow-none hover:shadow-none"
                  onMeasure={
                    coverWithSize.kind === "folder-cover"
                      ? undefined
                      : (h) => handleCardMeasure(coverWithSize.id, h)
                  }
                />
              </div>
            </motion.div>
          </CardRepulsionFrame>
        )}
        {renderedCards.map((card, index) => {
          const placement = expandedLayout.placements[index];

          // Calculate scale factor to fit project card within cover width when collapsed
          const coverWidth =
            coverWithSize?.size.width ?? card.size.width ?? 240;
          const collapsedScale = Math.min(
            1,
            coverWidth / (card.size.width ?? 350)
          );

          // When collapsed: only first 2 cards visible, others stack behind 2nd card
          const isHiddenWhenCollapsed =
            !isExpanded && index >= COLLAPSED_VISIBLE_COUNT;

          // Specific collapsed positions for visible cards
          // Card 1: 16px from left & top, -5deg rotation
          // Card 2: 32px from left, 68px from top, no rotation

          const collapsedPos = COLLAPSED_POSITIONS[Math.min(index, 1)];

          // Jig effect when hovering cover
          // Card 1 (index 0): Move right 24px, up 4px, rotate +5deg
          // Card 2 (index 1): Move right 28px, down 8px, rotate -4deg
          let jigX = 0;
          let jigY = 0;
          let jigRotate = 0;

          if (isPeeking && index < 2) {
            if (index === 0) {
              jigX = 12;
              jigY = -8;
              jigRotate = 0;
            } else {
              jigX = 4;
              jigY = 8;
              jigRotate = 0;
            }
          }

          // Calculate collapsed opacity - hidden cards get 0, visible cards get gradual reduction
          const collapsedOpacity = isHiddenWhenCollapsed ? 0 : 1;

          // Calculate collapsed scale based on index (for visible cards)
          const collapsedScaleIndex = isHiddenWhenCollapsed ? 1 : index;

          // Compute animation values to avoid nested ternaries
          const opacity = (() => {
            if (!showProjects) {
              return 0;
            }
            return isExpanded ? 1 : collapsedOpacity;
          })();

          const cardScale = (() => {
            if (!showProjects) {
              return collapsedScale * 0.5;
            }
            if (isExpanded) {
              return 1;
            }
            return (
              collapsedScale *
              Math.max(0.94, 1 - (collapsedScaleIndex + 1) * 0.02)
            );
          })();

          const rotate = isExpanded
            ? placement.rotate
            : collapsedPos.rotate + jigRotate;

          const x = (() => {
            if (!showProjects) {
              return collapsedPos.x - 12;
            }
            return isExpanded ? placement.x : collapsedPos.x + jigX;
          })();

          const y = isExpanded ? placement.y : collapsedPos.y + jigY;
          // Cards past the visible pair are unmounted while collapsed.
          // Without a collapsed start, the first expand paints them at the fan position.
          const collapsedStackPose = {
            opacity: 1,
            rotate: collapsedPos.rotate,
            scale: collapsedScale * Math.max(0.94, 1 - 2 * 0.02),
            x: collapsedPos.x,
            y: collapsedPos.y,
          };

          const content = (
            <RenderCard
              card={card}
              isExpanded={isExpanded}
              onMeasure={
                card.kind === "article"
                  ? undefined
                  : (h) => handleCardMeasure(card.id, h)
              }
              priority={false}
            />
          );

          return (
            <CardRepulsionFrame
              cardId={card.id}
              key={card.id}
              offset={cardRepulsionOffsets?.get(card.id)}
              zIndex={projectsWithSizes.length - index}
            >
              <motion.div
                animate={{
                  opacity,
                  rotate,
                  scale: cardScale,
                  x,
                  y,
                }}
                aria-hidden={!isExpanded}
                className={tw("absolute top-0 left-0 will-change-transform")}
                inert={!isExpanded}
                initial={
                  index < COLLAPSED_VISIBLE_COUNT ? false : collapsedStackPose
                }
                style={{
                  pointerEvents: isExpanded || !stack.cover ? "auto" : "none",
                  transformOrigin: "top left",
                  zIndex: projectsWithSizes.length - index,
                }}
                transition={SPRING_PRESETS.snappy}
              >
                {card.kind === "article" ? (
                  <StackArticleLink
                    card={card}
                    isExpanded={isExpanded}
                    onActivate={onActivateCard}
                  >
                    <PaperCardProjection
                      inset={ARTICLE_CARD_PREVIEW_INSET}
                      layoutId={getDocumentLayoutId(stack.id, card.id)}
                      size={ARTICLE_CARD_SIZE}
                    >
                      {content}
                    </PaperCardProjection>
                  </StackArticleLink>
                ) : (
                  content
                )}
              </motion.div>
            </CardRepulsionFrame>
          );
        })}
        {isExpanded && stackPage.pageCount > 1 && (
          <motion.nav
            animate={{ x: coverRepulsionOffset.x, y: coverRepulsionOffset.y }}
            aria-label="Folder pages"
            className="no-drag no-pan absolute flex items-center gap-3 rounded-full bg-white px-4 py-2 text-sm shadow-lg"
            initial={false}
            style={{ left: 0, top: (coverWithSize?.size.height ?? 340) + 24 }}
            transition={SPRING_PRESETS.smooth}
          >
            <button
              aria-label="Previous articles"
              className="cursor-pointer disabled:opacity-30"
              disabled={stackPage.page === 0}
              onClick={handlePreviousPage}
              type="button"
            >
              ←
            </button>
            <span>
              {stackPage.page + 1} / {stackPage.pageCount}
            </span>
            <button
              aria-label="Next articles"
              className="cursor-pointer disabled:opacity-30"
              disabled={stackPage.page >= stackPage.pageCount - 1}
              onClick={handleNextPage}
              type="button"
            >
              →
            </button>
          </motion.nav>
        )}
      </motion.div>
    </motion.div>
  );
};
