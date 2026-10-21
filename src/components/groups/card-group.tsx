import {
  ARTICLE_CARD_PREVIEW_INSET,
  ARTICLE_CARD_SIZE,
} from "@/cards/article/article-card";
import { RenderCard } from "@/cards/render-card";
import { PaperCardProjection } from "@/components/documents/paper-card-projection";
import { deskLampAtom, fanConfigAtom } from "@/context/atoms";
import { useCanvasEnvironment } from "@/context/canvas-layout";
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

import {
  FLIGHT_SCALE,
  getStackFlightTransition,
  SPRING_PRESETS,
  STACK_FLIGHT_MS,
  STACK_RETURN_MS,
  type StackFlight,
  TRANSITIONS,
} from "@/lib/animation";
import {
  COLLAPSED_POSITIONS,
  COLLAPSED_VISIBLE_COUNT,
  getExpandedStackLayout,
  getStackPage,
  getWritingCollapsedPose,
  WRITING_COLLAPSED_GAP_PX,
  WRITING_COLLAPSED_HOVER_GAP_PX,
} from "@/lib/card-layout";
import { getCoverLogoRect } from "@/cards/cover/cover-layout";
import { FolderBack } from "@/components/lighting/folder-back";
import { LAMP_DEPTH, LAMP_LIFT } from "@/components/lighting/lamp-shadows";
import { FolderLighting } from "@/components/lighting/lit-folder";
import { useItemEntrance } from "@/context/canvas-entrance";
import { ENTRANCE_LANDED_MS } from "@/lib/canvas-entrance";
import { FOLDER_MASK_IMAGE } from "@/lib/folder-shape";
import { getDocumentLayoutId } from "@/lib/document-motion";
import { tw } from "@/lib/utils";
import { StackArticleLink } from "./stack-article-link";

const ZERO_REPULSION_OFFSET = { x: 0, y: 0 } as const;
/** How far a folder gives under a press, and how quickly. */
const COVER_PRESS_SCALE = 0.975;
const COVER_PRESS = { damping: 30, stiffness: 900, type: "spring" } as const;
/** FolderCoverCard's board colour, for its back panel. */
const FOLDER_COVER_COLOR = "#d7e4d4";
/** The back panel appears as the lamp's lighting warms up. */
const LAMP_PANEL_FADE = { duration: 0.5, ease: "easeOut" } as const;
/** The camera move after a toggle, plus time for the cards to settle. */
const PEEK_LOCK_AFTER_TOGGLE_MS = 700;

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
}

export const CardStack = ({
  cardRepulsionOffsets,
  stack,
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
  const isLampOn = useAtomValue(deskLampAtom);
  const { layout } = useCanvasEnvironment();
  const stackPage = useMemo(() => getStackPage(stack, page), [stack, page]);
  const [retainExpandedCards, setRetainExpandedCards] = useState(isExpanded);
  useEffect(() => {
    if (isExpanded) {
      setRetainExpandedCards(true);
      return;
    }
    const timer = setTimeout(
      () => setRetainExpandedCards(false),
      STACK_RETURN_MS
    );
    return () => clearTimeout(timer);
  }, [isExpanded]);
  // Derived while rendering, not in an effect: the render that flips
  // isExpanded must already carry the flight transitions, or Motion starts
  // the cards with the hover spring.
  const [flight, setFlight] = useState<StackFlight | null>(null);
  const [flightFor, setFlightFor] = useState(isExpanded);
  if (flightFor !== isExpanded) {
    setFlightFor(isExpanded);
    setFlight(isExpanded ? "out" : "in");
  }
  useEffect(() => {
    if (!flight) {
      return;
    }
    const timer = setTimeout(() => setFlight(null), STACK_FLIGHT_MS);
    return () => clearTimeout(timer);
  }, [flight]);
  const [measuredSizes, setMeasuredSizes] = useState<Record<string, number>>(
    {}
  );
  const movedItemsRef = useRef<Set<string>>(new Set());
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef<boolean>(false);
  // The papers slide out from under the cover once the folder has landed.
  const [hasShownProjects, setHasShownProjects] = useState(isExpanded);
  const showProjects = isExpanded || hasShownProjects;
  const { delayMs: entranceDelay, started: entranceStarted } =
    useItemEntrance();

  // Expansion takes precedence over the one-time entrance.
  useEffect(() => {
    if (hasShownProjects) {
      return;
    }
    if (isExpanded) {
      setHasShownProjects(true);
      return;
    }
    if (!entranceStarted) {
      return;
    }
    const timer = setTimeout(() => {
      setHasShownProjects(true);
    }, entranceDelay + ENTRANCE_LANDED_MS);
    return () => clearTimeout(timer);
  }, [entranceDelay, entranceStarted, hasShownProjects, isExpanded]);

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

  const [isCoverPressed, setCoverPressed] = useState(false);
  const isFolderPressed = isCoverPressed && !isExpanded;
  const isPanelPressed = isCoverPressed && isExpanded;
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

  // The lamp's relief of the logo follows the DOM logo's balanced box.
  const coverLogoFit =
    coverWithSize?.kind === "cover"
      ? coverWithSize.content.board.logoFit
      : undefined;
  const coverLogoRect = useMemo(
    () => getCoverLogoRect(coverLogoFit),
    [coverLogoFit]
  );
  const coverPressOrigin = `${(coverWithSize?.size.width ?? 240) / 2}px ${
    (coverWithSize?.size.height ?? 340) / 2
  }px`;
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
    () =>
      getExpandedStackLayout(
        coverWithSize,
        projectsWithSizes,
        fanConfig,
        layout.stackColumns
      ),
    [coverWithSize, projectsWithSizes, fanConfig, layout.stackColumns]
  );
  const renderedCards =
    isExpanded || retainExpandedCards
      ? projectsWithSizes
      : projectsWithSizes.slice(0, COLLAPSED_VISIBLE_COUNT);
  const coverRepulsionOffset =
    cardRepulsionOffsets?.get(stack.cover.id) ?? ZERO_REPULSION_OFFSET;

  const [isPeeking, setIsPeeking] = useState(false);
  const peekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isWritingFolder = stack.cover.kind === "folder-cover";
  const peekLockedUntilRef = useRef(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: isExpanded is the trigger, not a value the effect reads
  useEffect(() => {
    // Opening or closing moves the camera. A cover that slides under or away
    // from a still pointer is not a hover, and reading it as one makes the
    // tucked cards shift again once the camera settles.
    peekLockedUntilRef.current = performance.now() + PEEK_LOCK_AFTER_TOGGLE_MS;
    setIsPeeking(false);
  }, [isExpanded]);
  const triggerPeek = useCallback(() => {
    if (performance.now() < peekLockedUntilRef.current) {
      return;
    }
    if (isWritingFolder) {
      setIsPeeking(true);
      return;
    }
    if (peekTimeoutRef.current) {
      clearTimeout(peekTimeoutRef.current);
    }
    setIsPeeking(true);
    peekTimeoutRef.current = setTimeout(() => {
      setIsPeeking(false);
    }, 200);
  }, [isWritingFolder]);
  const releaseWritingPeek = useCallback(() => {
    if (isWritingFolder) {
      setIsPeeking(false);
    }
  }, [isWritingFolder]);
  // Leaving the cover mid-press releases it, as a pointer cancel would.
  const handleCoverHoverEnd = useCallback(() => {
    releaseWritingPeek();
    setCoverPressed(false);
  }, [releaseWritingPeek]);

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
      setCoverPressed(true);
    },
    []
  );

  const handleCoverPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const start = coverPointerDownRef.current;
      coverPointerDownRef.current = null;
      setCoverPressed(false);

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
    setCoverPressed(false);
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
        {/* A press gives the whole closed folder a little, around the
            cover's center: back panel, tucked papers and cover together. */}
        <motion.div
          animate={{ scale: isFolderPressed ? COVER_PRESS_SCALE : 1 }}
          className="absolute top-0 left-0"
          initial={false}
          style={{ transformOrigin: coverPressOrigin }}
          transition={COVER_PRESS}
        >
          {coverWithSize && isLampOn ? (
            // Under the lamp the papers sit inside the folder, on its back
            // panel, which fades in as the lamp warms up and moves with it.
            <CardRepulsionFrame
              cardId={`${coverWithSize.id}-back`}
              offset={cardRepulsionOffsets?.get(coverWithSize.id)}
              zIndex={0}
            >
              <motion.div
                animate={{ opacity: 1 }}
                className="absolute top-0 left-0"
                initial={{ opacity: 0 }}
                transition={LAMP_PANEL_FADE}
              >
                <motion.div
                  animate={{ scale: isPanelPressed ? COVER_PRESS_SCALE : 1 }}
                  initial={false}
                  style={{ transformOrigin: coverPressOrigin }}
                  transition={COVER_PRESS}
                >
                  <FolderBack
                    color={
                      coverWithSize.kind === "folder-cover"
                        ? FOLDER_COVER_COLOR
                        : coverWithSize.content.board.base
                    }
                    image={
                      coverWithSize.kind === "folder-cover"
                        ? coverWithSize.content.image
                        : undefined
                    }
                    size={{
                      height: coverWithSize.size.height ?? 340,
                      width: coverWithSize.size.width ?? 240,
                    }}
                  />
                </motion.div>
              </motion.div>
            </CardRepulsionFrame>
          ) : null}
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
                data-lamp-depth={LAMP_DEPTH.folder}
                data-lamp-shadow={
                  isDragging ? LAMP_LIFT.dragged : LAMP_LIFT.card
                }
                // The scene's entrance moves the whole item; see canvas-item.
                initial={false}
                key={coverWithSize.id}
                onHoverEnd={handleCoverHoverEnd}
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
              >
                {/* Pressed while open, only the cover and back panel give; the
                  papers already lie on the desk. An inner layer, because
                  Motion's whileTap would take over Enter, which toggles the
                  folder. */}
                <motion.div
                  animate={{ scale: isPanelPressed ? COVER_PRESS_SCALE : 1 }}
                  initial={false}
                  transition={COVER_PRESS}
                >
                  <div
                    className="relative"
                    style={{
                      maskImage: FOLDER_MASK_IMAGE,
                      maskPosition: "center",
                      maskRepeat: "no-repeat",
                      maskSize: `${coverWithSize.size.width}px ${coverWithSize.size.height ?? 0}px`,
                      WebkitMaskImage: FOLDER_MASK_IMAGE,
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
                    <FolderLighting
                      glows={
                        coverWithSize.kind === "cover"
                          ? coverWithSize.content.board.glows
                          : undefined
                      }
                      logo={
                        coverWithSize.kind === "cover"
                          ? {
                              finish: coverWithSize.content.board.logoFinish,
                              rect: coverLogoRect,
                              src:
                                coverWithSize.content.litLogo ??
                                coverWithSize.content.logo,
                            }
                          : undefined
                      }
                      material={
                        coverWithSize.kind === "folder-cover"
                          ? "cardstock"
                          : coverWithSize.content.board.material
                      }
                      papers={isExpanded ? 0 : stack.stack.length}
                      tint={
                        coverWithSize.kind === "cover"
                          ? coverWithSize.content.board.accent
                          : undefined
                      }
                    />
                  </div>
                </motion.div>
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

            const collapsedSlot = Math.min(index, COLLAPSED_VISIBLE_COUNT - 1);
            const collapsedPos = COLLAPSED_POSITIONS[collapsedSlot];
            const writingPose = isWritingFolder
              ? getWritingCollapsedPose(
                  collapsedSlot,
                  {
                    height: coverWithSize?.size.height ?? 340,
                    width: coverWidth,
                  },
                  {
                    height: card.size.height ?? 360,
                    width: card.size.width ?? 240,
                  },
                  isPeeking && index < COLLAPSED_VISIBLE_COUNT
                    ? WRITING_COLLAPSED_HOVER_GAP_PX
                    : WRITING_COLLAPSED_GAP_PX
                )
              : null;

            // Company covers still nudge their previews on hover.
            let jigX = 0;
            let jigY = 0;
            let jigRotate = 0;

            if (!writingPose && isPeeking && index < 2) {
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
                return (writingPose?.scale ?? collapsedScale) * 0.5;
              }
              if (isExpanded) {
                return 1;
              }
              if (writingPose) {
                return writingPose.scale;
              }
              return (
                collapsedScale *
                Math.max(0.94, 1 - (collapsedScaleIndex + 1) * 0.02)
              );
            })();

            const rotate = isExpanded
              ? placement.rotate
              : (writingPose?.rotate ?? collapsedPos.rotate + jigRotate);

            const x = (() => {
              if (!showProjects) {
                return (writingPose?.x ?? collapsedPos.x) - 12;
              }
              if (isExpanded) {
                return placement.x;
              }
              return writingPose?.x ?? collapsedPos.x + jigX;
            })();

            const y = isExpanded
              ? placement.y
              : (writingPose?.y ?? collapsedPos.y + jigY);
            // Cards past the visible pair are unmounted while collapsed.
            // Without a collapsed start, the first expand paints them at the fan position.
            const collapsedStackPose = writingPose
              ? {
                  opacity: 1,
                  rotate: writingPose.rotate,
                  scale: writingPose.scale,
                  x: writingPose.x,
                  y: writingPose.y,
                }
              : {
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
                    // Picked up mid-flight: a touch closer to the camera.
                    scale: flight
                      ? [null, cardScale * FLIGHT_SCALE, cardScale]
                      : cardScale,
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
                  transition={
                    flight
                      ? getStackFlightTransition(
                          index,
                          projectsWithSizes.length,
                          flight
                        )
                      : SPRING_PRESETS.snappy
                  }
                >
                  {card.kind === "article" ? (
                    <StackArticleLink
                      card={card}
                      isExpanded={isExpanded}
                      onActivate={onActivateCard}
                    >
                      <PaperCardProjection
                        inset={ARTICLE_CARD_PREVIEW_INSET}
                        // Motion registers a shared layout id when a node mounts
                        // and re-measures every node in the canvas whenever any
                        // of them updates. A tucked card still holding its id gets
                        // re-measured against the expanded pose while the folder
                        // closes, which makes its paper jump. Tucked cards cannot
                        // be opened, so they carry no id: it mounts with the card
                        // when the folder opens, and the key remounts it per state.
                        key={isExpanded ? "open" : "tucked"}
                        layoutId={
                          isExpanded
                            ? getDocumentLayoutId(stack.id, card.id)
                            : undefined
                        }
                        shadow={isExpanded ? "lifted" : "soft"}
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
        </motion.div>
        {isExpanded && stackPage.pageCount > 1 && (
          <motion.nav
            animate={{ x: coverRepulsionOffset.x, y: coverRepulsionOffset.y }}
            aria-label="Folder pages"
            className="no-drag no-pan absolute flex items-center gap-3 rounded-full bg-white px-4 py-2 text-sm shadow-lg"
            initial={false}
            // The compact layout hides the cover, so the pager sits under the cards.
            style={
              layout.compact
                ? {
                    left: expandedLayout.contentBounds.minX,
                    top: expandedLayout.contentBounds.maxY + 24,
                  }
                : { left: 0, top: (coverWithSize?.size.height ?? 340) + 24 }
            }
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
