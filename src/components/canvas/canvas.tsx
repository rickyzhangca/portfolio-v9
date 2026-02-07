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
import { AnalyticsEvents, track } from "@/lib/analytics";
import {
  AUTO_PAN_DURATION_MS,
  AUTO_PAN_EASING,
  getAutoPanTarget,
  getFunStackAutoPanTarget,
} from "@/lib/auto-pan";
import { computeRepulsionOffsets } from "@/lib/repulsion";
import type { CanvasItem, ViewportState } from "@/types/canvas";
import { CanvasControls } from "./canvas-controls";
import { CanvasItemRenderer } from "./canvas-item";

interface CanvasProps {
  initialItems: CanvasItem[];
}

const ZERO_OFFSET = { x: 0, y: 0 } as const;

export const Canvas = ({ initialItems }: CanvasProps) => {
  const { state, actions } = useCanvasState(initialItems);
  const {
    bringItemToFront,
    resetItems,
    setExpandedStack,
    setFocusedItem,
    updateCardHeight,
    updateItemPosition,
    updateViewport,
  } = actions;
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
  const viewportStateRef = useRef(state.viewportState);
  const wheelCommitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const itemsRef = useRef(state.items);
  const expandedStackIdRef = useRef(state.expandedStackId);
  const focusedItemIdRef = useRef(state.focusedItemId);

  const initialItemsRef = useRef(initialItems);
  initialItemsRef.current = initialItems;
  itemsRef.current = state.items;
  expandedStackIdRef.current = state.expandedStackId;
  focusedItemIdRef.current = state.focusedItemId;

  const syncViewportState = useCallback((viewport: ViewportState) => {
    viewportStateRef.current = viewport;
    setScale((prev) => (prev === viewport.scale ? prev : viewport.scale));
  }, []);

  const commitViewportState = useCallback(() => {
    updateViewport(viewportStateRef.current);
  }, [updateViewport]);

  useEffect(() => {
    syncViewportState(state.viewportState);
  }, [state.viewportState, syncViewportState]);

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
      syncViewportState({
        scale,
        positionX: newX,
        positionY: newY,
      });

      if (wheelCommitTimeoutRef.current) {
        clearTimeout(wheelCommitTimeoutRef.current);
      }
      wheelCommitTimeoutRef.current = setTimeout(() => {
        commitViewportState();
      }, 80);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
      if (wheelCommitTimeoutRef.current) {
        clearTimeout(wheelCommitTimeoutRef.current);
        wheelCommitTimeoutRef.current = null;
      }
    };
  }, [commitViewportState, syncViewportState]);

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
        setExpandedStack(null);
        track(AnalyticsEvents.STACK_CLOSE, {
          stack_type: state.expandedStackId,
          close_method: "outside_click",
        });
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
  }, [setExpandedStack, state.expandedStackId]);

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
        setFocusedItem(null);
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
  }, [setFocusedItem, state.focusedItemId]);

  // Handle ESC key to close expanded stacks and focused items
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't close if interaction is locked (modals are open)
      if (isInteractionLockedRef.current) {
        return;
      }

      if (e.key !== "Escape") {
        return;
      }

      // Priority: close expanded stack first, then focused item
      if (state.expandedStackId) {
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
        setExpandedStack(null);
        track(AnalyticsEvents.KEYBOARD_ESCAPE, { context: "stack" });
      } else if (state.focusedItemId) {
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
        setFocusedItem(null);
        track(AnalyticsEvents.KEYBOARD_ESCAPE, { context: "macbook" });
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [setExpandedStack, setFocusedItem, state.expandedStackId, state.focusedItemId]);

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

  const restorePreAutoPan = useCallback(() => {
    const savedPosition = preAutoPanPositionRef.current;
    if (!savedPosition) {
      return;
    }

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
  }, []);

  const restorePreFocusPan = useCallback(() => {
    const savedPosition = preFocusPanPositionRef.current;
    if (!savedPosition) {
      return;
    }

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
  }, []);

  const handleActivateItemById = useCallback(
    (id: string) => {
      const item = itemsRef.current.get(id);
      if (!(item && item.kind === "single")) {
        return;
      }

      const policy = getInteractionPolicy(item.card.kind);

      if (policy.activate === "open-modal") {
        bringItemToFront(item.id);
        if (item.card.kind === "resume") {
          setActiveResumeItemId(item.id);
          track(AnalyticsEvents.RESUME_VIEW);
        } else if (item.card.kind === "about") {
          setActiveAboutItemId(item.id);
          track(AnalyticsEvents.ABOUT_VIEW);
        }
        return;
      }

      if (policy.activate !== "toggle-focus") {
        return;
      }

      // Toggle macbook focus: scale card + auto-pan to center, then restore on close.
      if (focusedItemIdRef.current === item.id) {
        restorePreFocusPan();
        setFocusedItem(null);
        track(AnalyticsEvents.MACBOOK_ZOOM, {
          direction: "out",
        });
        return;
      }

      setFocusedItem(item.id);
      bringItemToFront(item.id);
      track(AnalyticsEvents.MACBOOK_ZOOM, {
        direction: "in",
      });

      const viewportState = viewportStateRef.current;
      preFocusPanPositionRef.current = {
        x: viewportState.positionX,
        y: viewportState.positionY,
        scale: viewportState.scale,
      };

      const cardWidth = item.card.size.width ?? 0;
      const cardHeight = item.card.size.height ?? 360;
      const centerX = item.position.x + cardWidth / 2;
      const centerY = item.position.y + cardHeight / 2;
      const targetX = window.innerWidth / 2 - centerX * viewportState.scale;
      const targetY = window.innerHeight / 2 - centerY * viewportState.scale;

      requestAnimationFrame(() => {
        transformRef.current?.setTransform(
          targetX,
          targetY,
          viewportState.scale,
          AUTO_PAN_DURATION_MS,
          AUTO_PAN_EASING
        );
      });
    },
    [bringItemToFront, restorePreFocusPan, setFocusedItem]
  );

  const handleToggleExpandedById = useCallback(
    (id: string) => {
      const item = itemsRef.current.get(id);
      if (!(item && item.kind !== "single")) {
        return;
      }

      const isExpanded = expandedStackIdRef.current === item.id;
      const viewportState = viewportStateRef.current;

      // Stack items can expand/collapse
      if (item.kind === "stack") {
        if (isExpanded) {
          restorePreAutoPan();
          setExpandedStack(null);
          return;
        }

        bringItemToFront(item.id);
        setExpandedStack(item.id);

        // Check if auto-pan is needed
        const panTarget = getAutoPanTarget(
          item,
          fanConfig,
          viewportState,
          window.innerWidth,
          window.innerHeight
        );

        if (panTarget) {
          // Save current position before auto-panning
          preAutoPanPositionRef.current = {
            x: viewportState.positionX,
            y: viewportState.positionY,
            scale: viewportState.scale,
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
        return;
      }

      // Fun stack items can expand/collapse
      if (item.kind === "funstack") {
        if (isExpanded) {
          restorePreAutoPan();
          setExpandedStack(null);
          return;
        }

        bringItemToFront(item.id);
        setExpandedStack(item.id);

        // Check if auto-pan is needed
        const panTarget = getFunStackAutoPanTarget(
          item,
          viewportState,
          window.innerWidth,
          window.innerHeight
        );

        if (panTarget) {
          // Save current position before auto-panning
          preAutoPanPositionRef.current = {
            x: viewportState.positionX,
            y: viewportState.positionY,
            scale: viewportState.scale,
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
        return;
      }

      // Swag stack items can expand/collapse
      if (isExpanded) {
        restorePreAutoPan();
        setExpandedStack(null);
        return;
      }

      bringItemToFront(item.id);
      setExpandedStack(item.id);

      // Check if auto-pan is needed
      const coverWidth = item.cover.size.width ?? 240;
      const gridCols = 6;
      const swagItemSize = 180;
      const gridGap = 16;
      const swagCount = item.swags.length;
      const rows = Math.ceil(swagCount / gridCols);
      const totalWidth = coverWidth + 40 + gridCols * (swagItemSize + gridGap);
      // Height: items + gaps between rows (last row has no trailing gap)
      const totalHeight = rows * swagItemSize + Math.max(0, rows - 1) * gridGap;
      const margin = 40;

      // Get current visible viewport in canvas coordinates
      const viewportMinX = (0 - viewportState.positionX) / viewportState.scale;
      const viewportMinY = (0 - viewportState.positionY) / viewportState.scale;
      const viewportMaxX =
        (window.innerWidth - viewportState.positionX) / viewportState.scale;
      const viewportMaxY =
        (window.innerHeight - viewportState.positionY) / viewportState.scale;

      // Content bounds (swag grid starts at same y as cover)
      const contentMinX = item.position.x;
      const contentMinY = item.position.y;
      const contentMaxX = item.position.x + totalWidth;
      const contentMaxY = item.position.y + totalHeight;

      // Check if content overflows viewport
      const overflows =
        contentMinX < viewportMinX ||
        contentMinY < viewportMinY ||
        contentMaxX > viewportMaxX ||
        contentMaxY > viewportMaxY;

      if (!overflows) {
        return;
      }

      // Check if content can be centered (fits with margins)
      const contentWidth = totalWidth * viewportState.scale;
      const contentHeight = totalHeight * viewportState.scale;
      const availableWidth = window.innerWidth - margin * 2;
      const availableHeight = window.innerHeight - margin * 2;

      const canCenterHorizontal = contentWidth <= availableWidth;
      const canCenterVertical = contentHeight <= availableHeight;

      // Calculate transforms
      const centerX = item.position.x + totalWidth / 2;
      const centerY = item.position.y + totalHeight / 2;

      const centeredX = window.innerWidth / 2 - centerX * viewportState.scale;
      const centeredY = window.innerHeight / 2 - centerY * viewportState.scale;

      const marginX = margin - item.position.x * viewportState.scale;
      const marginY = margin - item.position.y * viewportState.scale;

      // Use centered for axes that fit, margin for axes that don't
      // If horizontal space is insufficient, pin to top-left for stable layout
      const panTarget: {
        x: number;
        y: number;
        scale: number;
      } = {
        x: canCenterHorizontal ? centeredX : marginX,
        y: canCenterHorizontal && canCenterVertical ? centeredY : marginY,
        scale: viewportState.scale,
      };

      // Save current position before auto-panning
      preAutoPanPositionRef.current = {
        x: viewportState.positionX,
        y: viewportState.positionY,
        scale: viewportState.scale,
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
    },
    [bringItemToFront, fanConfig, restorePreAutoPan, setExpandedStack]
  );

  const setRootRefCallbacksRef = useRef(
    new Map<string, (el: HTMLDivElement | null) => void>()
  );
  const bringToFrontCallbacksRef = useRef(new Map<string, () => void>());
  const activateCallbacksRef = useRef(new Map<string, () => void>());
  const toggleExpandedCallbacksRef = useRef(new Map<string, () => void>());
  const positionUpdateCallbacksRef = useRef(
    new Map<string, (position: { x: number; y: number }) => void>()
  );
  const cardHeightCallbacksRef = useRef(
    new Map<string, (cardId: string, height: number) => void>()
  );

  const getSetRootRefCallback = useCallback(
    (id: string) => {
      let callback = setRootRefCallbacksRef.current.get(id);
      if (!callback) {
        callback = (el: HTMLDivElement | null) => {
          registerGroupElement(id, el);
        };
        setRootRefCallbacksRef.current.set(id, callback);
      }
      return callback;
    },
    [registerGroupElement]
  );

  const getBringToFrontCallback = useCallback(
    (id: string) => {
      let callback = bringToFrontCallbacksRef.current.get(id);
      if (!callback) {
        callback = () => {
          bringItemToFront(id);
        };
        bringToFrontCallbacksRef.current.set(id, callback);
      }
      return callback;
    },
    [bringItemToFront]
  );

  const getActivateCallback = useCallback(
    (id: string) => {
      let callback = activateCallbacksRef.current.get(id);
      if (!callback) {
        callback = () => {
          handleActivateItemById(id);
        };
        activateCallbacksRef.current.set(id, callback);
      }
      return callback;
    },
    [handleActivateItemById]
  );

  const getToggleExpandedCallback = useCallback(
    (id: string) => {
      let callback = toggleExpandedCallbacksRef.current.get(id);
      if (!callback) {
        callback = () => {
          handleToggleExpandedById(id);
        };
        toggleExpandedCallbacksRef.current.set(id, callback);
      }
      return callback;
    },
    [handleToggleExpandedById]
  );

  const getPositionUpdateCallback = useCallback(
    (id: string) => {
      let callback = positionUpdateCallbacksRef.current.get(id);
      if (!callback) {
        callback = (position) => {
          updateItemPosition(id, position);
        };
        positionUpdateCallbacksRef.current.set(id, callback);
      }
      return callback;
    },
    [updateItemPosition]
  );

  const getCardHeightCallback = useCallback(
    (id: string) => {
      let callback = cardHeightCallbacksRef.current.get(id);
      if (!callback) {
        callback = (cardId, height) => {
          updateCardHeight(id, cardId, height);
        };
        cardHeightCallbacksRef.current.set(id, callback);
      }
      return callback;
    },
    [updateCardHeight]
  );

  const handleDragStart = useCallback(() => {
    setIsPanningDisabled(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsPanningDisabled(false);
  }, []);

  useEffect(() => {
    const validIds = new Set(state.items.keys());
    const prune = <T,>(map: Map<string, T>) => {
      for (const id of map.keys()) {
        if (!validIds.has(id)) {
          map.delete(id);
        }
      }
    };

    prune(setRootRefCallbacksRef.current);
    prune(bringToFrontCallbacksRef.current);
    prune(activateCallbacksRef.current);
    prune(toggleExpandedCallbacksRef.current);
    prune(positionUpdateCallbacksRef.current);
    prune(cardHeightCallbacksRef.current);
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
            syncViewportState({
              scale: ref.state.scale,
              positionX: ref.state.positionX,
              positionY: ref.state.positionY,
            });
          }}
          onPanningStop={(ref: ReactZoomPanPinchRef) => {
            syncViewportState({
              scale: ref.state.scale,
              positionX: ref.state.positionX,
              positionY: ref.state.positionY,
            });
            commitViewportState();
          }}
          onZoomStop={(ref: ReactZoomPanPinchRef) => {
            syncViewportState({
              scale: ref.state.scale,
              positionX: ref.state.positionX,
              positionY: ref.state.positionY,
            });
            commitViewportState();
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
                  const repulsionOffset =
                    repulsionOffsets.get(item.id) ?? ZERO_OFFSET;

                  return (
                    <CanvasItemRenderer
                      dragDisabled={dragDisabled}
                      isExpanded={isExpanded}
                      isFocused={isFocused}
                      item={item}
                      itemIndex={itemIndex}
                      key={item.id}
                      onActivate={getActivateCallback(item.id)}
                      onBringToFront={getBringToFrontCallback(item.id)}
                      onCardHeightMeasured={getCardHeightCallback(item.id)}
                      onDragEnd={handleDragEnd}
                      onDragStart={handleDragStart}
                      onPositionUpdate={getPositionUpdateCallback(item.id)}
                      onToggleExpanded={getToggleExpandedCallback(item.id)}
                      repulsionOffset={repulsionOffset}
                      scale={scale}
                      setRootRef={getSetRootRefCallback(item.id)}
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
                onResetPositions={resetItems}
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
