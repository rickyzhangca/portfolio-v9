import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useAtom, useAtomValue } from "jotai";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { getInteractionPolicy } from "@/cards/registry";
import { AboutModal } from "@/components/about/about-modal";
import { ResumeModal } from "@/components/resume/resume-modal";
import { fanConfigAtom, repulsionConfigAtom } from "@/context/atoms";
import { useCanvasState } from "@/hooks/use-canvas-state";
import {
  AUTO_PAN_DURATION_MS,
  AUTO_PAN_EASING,
  getAutoPanTarget,
} from "@/lib/auto-pan";
import { computeRepulsionOffsets } from "@/lib/repulsion";
import type { CanvasItem } from "@/types/canvas";
import { CanvasControls } from "./canvas-controls";
import { CanvasItemRenderer } from "./canvas-item";

interface CanvasProps {
  initialItems: CanvasItem[];
}

export const Canvas = ({ initialItems }: CanvasProps) => {
  const { state, actions } = useCanvasState(initialItems);
  const [isPanningDisabled, setIsPanningDisabled] = useState(false);
  const [scale, setScale] = useState(1);
  const [activeResumeItemId, setActiveResumeItemId] = useState<string | null>(
    null
  );
  const isResumeOpen = !!activeResumeItemId;
  const activeResumeItem = activeResumeItemId
    ? state.items.get(activeResumeItemId)
    : null;
  const [activeAboutItemId, setActiveAboutItemId] = useState<string | null>(
    null
  );
  const isAboutOpen = !!activeAboutItemId;
  const [repulsionConfig] = useAtom(repulsionConfigAtom);
  const fanConfig = useAtomValue(fanConfigAtom);

  const [viewportDimensions, setViewportDimensions] = useState<{
    width: number;
    height: number;
  }>(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  const groupElementsRef = useRef(new Map<string, HTMLDivElement | null>());
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInteractionLockedRef = useRef(false);
  const pointerDownRef = useRef<{
    clientX: number;
    clientY: number;
    startedOutsideExpandedGroup: boolean;
  } | null>(null);
  const focusPointerDownRef = useRef<{
    clientX: number;
    clientY: number;
    startedOutsideFocusedItem: boolean;
  } | null>(null);
  const preAutoPanPositionRef = useRef<{
    x: number;
    y: number;
    scale: number;
  } | null>(null);
  const preFocusPanPositionRef = useRef<{
    x: number;
    y: number;
    scale: number;
  } | null>(null);

  const initialItemsRef = useRef(initialItems);
  initialItemsRef.current = initialItems;

  useEffect(() => {
    isInteractionLockedRef.current = isResumeOpen || isAboutOpen;
  }, [isResumeOpen, isAboutOpen]);

  // Track viewport dimensions for responsive repulsion calculations
  useLayoutEffect(() => {
    const updateDimensions = () => {
      setViewportDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();

    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleWheel = (e: WheelEvent) => {
      if (isInteractionLockedRef.current) {
        // Keep the app from triggering browser/page zoom while a modal is open.
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
        }
        return;
      }

      // Always prevent default to stop browser zoom behavior
      e.preventDefault();

      const instance = transformRef.current?.instance;
      if (!instance) {
        return;
      }

      const { positionX, positionY, scale } = instance.transformState;

      // Zoom disabled due to framer motion bugs inside scaled container breaking layout animations
      // See: https://github.com/motiondivision/motion/issues/3356
      // Only allow two-finger pan (works everywhere, like Figma)
      const newX = positionX - e.deltaX;
      const newY = positionY - e.deltaY;
      transformRef.current?.setTransform(newX, newY, scale, 0);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  const registerGroupElement = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      if (el) {
        groupElementsRef.current.set(id, el);
      } else {
        groupElementsRef.current.delete(id);
      }
    },
    []
  );

  // Collapse the expanded group when clicking outside it (but not when panning/dragging).
  useEffect(() => {
    const expandedStackId = state.expandedStackId;
    if (!expandedStackId) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        pointerDownRef.current = null;
        return;
      }

      const target = event.target as Element | null;
      if (!target) {
        return;
      }

      if (target.closest("[data-no-collapse]")) {
        pointerDownRef.current = null;
        return;
      }

      const expandedEl = groupElementsRef.current.get(expandedStackId);
      pointerDownRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        startedOutsideExpandedGroup: expandedEl
          ? !expandedEl.contains(target)
          : true,
      };
    };

    const onPointerUp = (event: PointerEvent) => {
      const start = pointerDownRef.current;
      pointerDownRef.current = null;

      if (!start?.startedOutsideExpandedGroup) {
        return;
      }

      const moved = Math.hypot(
        event.clientX - start.clientX,
        event.clientY - start.clientY
      );

      if (moved < 6) {
        // Restore to pre-auto-pan position if available
        const savedPosition = preAutoPanPositionRef.current;
        if (savedPosition) {
          requestAnimationFrame(() => {
            transformRef.current?.setTransform(
              savedPosition.x,
              savedPosition.y,
              savedPosition.scale,
              AUTO_PAN_DURATION_MS,
              AUTO_PAN_EASING
            );
          });
          preAutoPanPositionRef.current = null;
        }
        actions.setExpandedStack(null);
      }
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerUp, true);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerUp, true);
    };
  }, [state.expandedStackId, actions.setExpandedStack]);

  // Unfocus the focused item when clicking outside it (but not when panning/dragging).
  useEffect(() => {
    const focusedItemId = state.focusedItemId;
    if (!focusedItemId) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        focusPointerDownRef.current = null;
        return;
      }

      const target = event.target as Element | null;
      if (!target) {
        return;
      }

      if (target.closest("[data-no-collapse]")) {
        focusPointerDownRef.current = null;
        return;
      }

      const focusedEl = groupElementsRef.current.get(focusedItemId);
      focusPointerDownRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        startedOutsideFocusedItem: focusedEl
          ? !focusedEl.contains(target)
          : true,
      };
    };

    const onPointerUp = (event: PointerEvent) => {
      const start = focusPointerDownRef.current;
      focusPointerDownRef.current = null;

      if (!start?.startedOutsideFocusedItem) {
        return;
      }

      const moved = Math.hypot(
        event.clientX - start.clientX,
        event.clientY - start.clientY
      );

      if (moved < 6) {
        const savedPosition = preFocusPanPositionRef.current;
        if (savedPosition) {
          requestAnimationFrame(() => {
            transformRef.current?.setTransform(
              savedPosition.x,
              savedPosition.y,
              savedPosition.scale,
              AUTO_PAN_DURATION_MS,
              AUTO_PAN_EASING
            );
          });
          preFocusPanPositionRef.current = null;
        }
        actions.setFocusedItem(null);
      }
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerUp, true);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerUp, true);
    };
  }, [state.focusedItemId, actions.setFocusedItem]);

  // Calculate viewport-proportional repulsion values for doc modal mode
  const getResumeRepulsionConfig = useCallback(
    (viewportWidth: number, viewportHeight: number) => {
      // Use the larger dimension for consistent behavior across orientations
      const maxDimension = Math.max(viewportWidth, viewportHeight);

      // Radius: 2.5x max dimension creates large clear zone
      // Strength: 0.5x max dimension provides strong push distance
      return {
        radiusPx: maxDimension * 2.5,
        strengthPx: maxDimension * 0.5,
      };
    },
    []
  );

  const repulsionOffsets = useMemo(() => {
    // Stronger repulsion when Resume or About modal is active to clear the screen
    const activeDocItemId = activeResumeItemId || activeAboutItemId;
    const repulsionSourceItemId =
      state.expandedStackId ?? activeDocItemId ?? state.focusedItemId;
    const effectiveConfig = activeDocItemId
      ? {
          radiusPx: Math.max(
            repulsionConfig.radiusPx,
            getResumeRepulsionConfig(
              viewportDimensions.width,
              viewportDimensions.height
            ).radiusPx
          ),
          strengthPx: Math.max(
            repulsionConfig.strengthPx,
            getResumeRepulsionConfig(
              viewportDimensions.width,
              viewportDimensions.height
            ).strengthPx
          ),
        }
      : repulsionConfig;

    return computeRepulsionOffsets(
      state.items,
      repulsionSourceItemId,
      effectiveConfig
    );
  }, [
    state.items,
    state.expandedStackId,
    activeResumeItemId,
    activeAboutItemId,
    state.focusedItemId,
    repulsionConfig,
    viewportDimensions,
    getResumeRepulsionConfig,
  ]);

  const isViewportReset =
    state.viewportState.scale === 1 &&
    state.viewportState.positionX === 0 &&
    state.viewportState.positionY === 0;

  const arePositionsModified = useMemo(() => {
    const initialMap = new Map(
      initialItemsRef.current.map((g) => [g.id, g.position])
    );

    for (const [id, group] of state.items) {
      const initialPos = initialMap.get(id);
      if (!initialPos) {
        return true;
      }
      if (
        group.position.x !== initialPos.x ||
        group.position.y !== initialPos.y
      ) {
        return true;
      }
    }
    return false;
  }, [state.items]);

  return (
    <LayoutGroup>
      <div className="h-screen w-screen overflow-hidden" ref={containerRef}>
        <TransformWrapper
          centerOnInit={true}
          doubleClick={{ disabled: true, mode: "zoomIn" }}
          initialScale={1}
          limitToBounds={false}
          maxScale={3}
          minScale={0.3}
          onTransformed={(ref: ReactZoomPanPinchRef) => {
            setScale(ref.state.scale);
            actions.updateViewport({
              scale: ref.state.scale,
              positionX: ref.state.positionX,
              positionY: ref.state.positionY,
            });
          }}
          panning={{
            disabled: isPanningDisabled || isResumeOpen,
            velocityDisabled: false,
            excluded: ["no-pan"],
          }}
          pinch={{ disabled: true }}
          ref={transformRef}
          wheel={{ disabled: true }}
        >
          {({ resetTransform }) => (
            <>
              <TransformComponent
                contentClass="relative w-full h-full"
                wrapperClass="!w-screen !h-screen"
              >
                {/* Render items */}
                {Array.from(state.items.values()).map((item, itemIndex) => {
                  const expandedStackId = state.expandedStackId;
                  const isExpanded = expandedStackId === item.id;
                  const isFocused = state.focusedItemId === item.id;

                  // Dimming is now handled by a global overlay
                  const dragDisabled =
                    expandedStackId !== null ||
                    isResumeOpen ||
                    state.focusedItemId !== null;
                  const repulsionOffset = repulsionOffsets.get(item.id) ?? {
                    x: 0,
                    y: 0,
                  };

                  return (
                    <CanvasItemRenderer
                      dragDisabled={dragDisabled}
                      isExpanded={isExpanded}
                      isFocused={isFocused}
                      item={item}
                      itemIndex={itemIndex}
                      key={item.id}
                      onActivate={() => {
                        if (item.kind !== "single") {
                          return;
                        }

                        const policy = getInteractionPolicy(item.card.kind);

                        if (policy.activate === "open-modal") {
                          actions.bringItemToFront(item.id);
                          if (item.card.kind === "resume") {
                            setActiveResumeItemId(item.id);
                          } else if (item.card.kind === "about") {
                            setActiveAboutItemId(item.id);
                          }
                          return;
                        }

                        if (policy.activate !== "toggle-focus") {
                          return;
                        }

                        // Toggle macbook focus: scale card + auto-pan to center, then restore on close.
                        if (state.focusedItemId === item.id) {
                          const savedPosition = preFocusPanPositionRef.current;
                          if (savedPosition) {
                            requestAnimationFrame(() => {
                              transformRef.current?.setTransform(
                                savedPosition.x,
                                savedPosition.y,
                                savedPosition.scale,
                                AUTO_PAN_DURATION_MS,
                                AUTO_PAN_EASING
                              );
                            });
                            preFocusPanPositionRef.current = null;
                          }
                          actions.setFocusedItem(null);
                          return;
                        }

                        actions.setFocusedItem(item.id);
                        actions.bringItemToFront(item.id);

                        preFocusPanPositionRef.current = {
                          x: state.viewportState.positionX,
                          y: state.viewportState.positionY,
                          scale: state.viewportState.scale,
                        };

                        const cardWidth = item.card.size.width ?? 0;
                        const cardHeight = item.card.size.height ?? 360;
                        const centerX = item.position.x + cardWidth / 2;
                        const centerY = item.position.y + cardHeight / 2;
                        const targetX =
                          window.innerWidth / 2 -
                          centerX * state.viewportState.scale;
                        const targetY =
                          window.innerHeight / 2 -
                          centerY * state.viewportState.scale;

                        requestAnimationFrame(() => {
                          transformRef.current?.setTransform(
                            targetX,
                            targetY,
                            state.viewportState.scale,
                            AUTO_PAN_DURATION_MS,
                            AUTO_PAN_EASING
                          );
                        });
                      }}
                      onBringToFront={() => actions.bringItemToFront(item.id)}
                      onCardHeightMeasured={(cardId, height) =>
                        actions.updateCardHeight(item.id, cardId, height)
                      }
                      onDragEnd={() => setIsPanningDisabled(false)}
                      onDragStart={() => setIsPanningDisabled(true)}
                      onPositionUpdate={(position) =>
                        actions.updateItemPosition(item.id, position)
                      }
                      onToggleExpanded={() => {
                        // Stack items can expand/collapse
                        if (item.kind === "stack") {
                          if (isExpanded) {
                            // Restore to pre-auto-pan position if available
                            const savedPosition = preAutoPanPositionRef.current;
                            if (savedPosition) {
                              requestAnimationFrame(() => {
                                transformRef.current?.setTransform(
                                  savedPosition.x,
                                  savedPosition.y,
                                  savedPosition.scale,
                                  AUTO_PAN_DURATION_MS,
                                  AUTO_PAN_EASING
                                );
                              });
                              preAutoPanPositionRef.current = null;
                            }
                            actions.setExpandedStack(null);
                            return;
                          }

                          actions.bringItemToFront(item.id);
                          actions.setExpandedStack(item.id);

                          // Check if auto-pan is needed
                          const panTarget = getAutoPanTarget(
                            item,
                            fanConfig,
                            state.viewportState,
                            window.innerWidth,
                            window.innerHeight
                          );

                          if (panTarget) {
                            // Save current position before auto-panning
                            preAutoPanPositionRef.current = {
                              x: state.viewportState.positionX,
                              y: state.viewportState.positionY,
                              scale: state.viewportState.scale,
                            };
                            requestAnimationFrame(() => {
                              transformRef.current?.setTransform(
                                panTarget.x,
                                panTarget.y,
                                panTarget.scale,
                                AUTO_PAN_DURATION_MS,
                                AUTO_PAN_EASING
                              );
                            });
                          }
                        }

                        // Fun stack items can expand/collapse
                        if (item.kind === "funstack") {
                          if (isExpanded) {
                            // Restore to pre-auto-pan position if available
                            const savedPosition = preAutoPanPositionRef.current;
                            if (savedPosition) {
                              requestAnimationFrame(() => {
                                transformRef.current?.setTransform(
                                  savedPosition.x,
                                  savedPosition.y,
                                  savedPosition.scale,
                                  AUTO_PAN_DURATION_MS,
                                  AUTO_PAN_EASING
                                );
                              });
                              preAutoPanPositionRef.current = null;
                            }
                            actions.setExpandedStack(null);
                            return;
                          }

                          actions.bringItemToFront(item.id);
                          actions.setExpandedStack(item.id);

                          // Check if auto-pan is needed
                          const panTarget = getFunStackAutoPanTarget(
                            item,
                            state.viewportState,
                            window.innerWidth,
                            window.innerHeight
                          );

                          if (panTarget) {
                            // Save current position before auto-panning
                            preAutoPanPositionRef.current = {
                              x: state.viewportState.positionX,
                              y: state.viewportState.positionY,
                              scale: state.viewportState.scale,
                            };
                            requestAnimationFrame(() => {
                              transformRef.current?.setTransform(
                                panTarget.x,
                                panTarget.y,
                                panTarget.scale,
                                AUTO_PAN_DURATION_MS,
                                AUTO_PAN_EASING
                              );
                            });
                          }
                        }
                      }}
                      repulsionOffset={repulsionOffset}
                      scale={scale}
                      setRootRef={(el) => registerGroupElement(item.id, el)}
                    />
                  );
                })}

                <AnimatePresence>
                  {state.expandedStackId &&
                    (() => {
                      const expandedGroup = state.items.get(
                        state.expandedStackId
                      );
                      if (!expandedGroup) {
                        return null;
                      }
                      return (
                        <motion.div
                          animate={{ opacity: 0.8 }}
                          className="absolute cursor-pointer bg-background1"
                          exit={{ opacity: 0 }}
                          initial={{ opacity: 0 }}
                          style={{
                            zIndex: expandedGroup.zIndex - 1,
                            left: -50_000,
                            top: -50_000,
                            width: 50_000 * 2,
                            height: 50_000 * 2,
                          }}
                        />
                      );
                    })()}
                </AnimatePresence>

                <AnimatePresence>
                  {state.focusedItemId &&
                    (() => {
                      const focusedItem = state.items.get(state.focusedItemId);
                      if (!(focusedItem && focusedItem.kind === "single")) {
                        return null;
                      }

                      return (
                        <motion.div
                          animate={{ opacity: 0.8 }}
                          className="absolute cursor-pointer bg-background1"
                          exit={{ opacity: 0 }}
                          initial={{ opacity: 0 }}
                          style={{
                            zIndex: focusedItem.zIndex - 1,
                            left: -50_000,
                            top: -50_000,
                            width: 50_000 * 2,
                            height: 50_000 * 2,
                          }}
                        />
                      );
                    })()}
                </AnimatePresence>
              </TransformComponent>

              <CanvasControls
                isResetDisabled={isViewportReset && !arePositionsModified}
                onReset={() => resetTransform()}
                onResetPositions={() => actions.resetItems()}
              />
            </>
          )}
        </TransformWrapper>

        <ResumeModal
          data={
            activeResumeItem?.kind === "single" &&
            activeResumeItem.card.kind === "resume"
              ? activeResumeItem.card.content
              : undefined
          }
          isOpen={isResumeOpen}
          onClose={() => setActiveResumeItemId(null)}
        />
        <AboutModal
          isOpen={isAboutOpen}
          onClose={() => setActiveAboutItemId(null)}
        />
      </div>
    </LayoutGroup>
  );
};
