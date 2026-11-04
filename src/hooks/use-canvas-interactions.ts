import { useCallback, useEffect, useRef, useState } from "react";
import { getInteractionPolicy } from "@/cards/registry";
import { useCanvasSession } from "@/context/canvas-session";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { AnalyticsEvents, track } from "@/lib/analytics";
import {
  getAutoPanTarget,
  getFunStackAutoPanTarget,
  getSwagStackAutoPanTarget,
} from "@/lib/auto-pan";
import { getCanvasCard } from "@/lib/canvas-card";
import { type CanvasLayout, DESKTOP_CANVAS_LAYOUT } from "@/lib/canvas-layout";
import { getStackPage } from "@/lib/card-layout";
import type { FanConfig } from "@/lib/fan";
import type { CanvasState, ViewportState } from "@/types/canvas";

interface InteractionOptions {
  activeDocument: ActiveDocument;
  bringItemToFront: (id: string) => void;
  cancelPendingPan: () => void;
  fanConfig: FanConfig;
  getViewport: () => ViewportState;
  layout?: CanvasLayout;
  panTo: (target: ViewportState) => void;
  setActiveDocument: (document: ActiveDocument) => void;
  setExpandedStack: (id: string | null) => void;
  setFocusedItem: (id: string | null) => void;
  state: CanvasState;
}

/** How long the street map folds in place before the camera returns. */
const STREETMAP_RETURN_DELAY_MS = 320;

export type ActiveDocument = {
  cardId: string;
  kind: "resume" | "about";
  itemId: string;
} | null;

export const useCanvasInteractions = ({
  state,
  activeDocument,
  setActiveDocument,
  fanConfig,
  getViewport,
  layout = DESKTOP_CANVAS_LAYOUT,
  panTo,
  cancelPendingPan,
  bringItemToFront,
  setExpandedStack,
  setFocusedItem,
}: InteractionOptions) => {
  const session = useCanvasSession();
  const [stackPages, setStackPages] = useState<Record<string, number>>({});
  const elementsRef = useRef(new Map<string, HTMLDivElement>());
  const preStackViewportRef = useRef<ViewportState | null>(null);
  const preFocusViewportRef = useRef<ViewportState | null>(null);
  const pendingLayoutRef = useRef<{
    id: string;
    viewport: ViewportState;
  } | null>(null);
  const isLocked =
    activeDocument !== null || session.articleOpen || !session.canvasVisible;

  const cancelLayoutCorrection = useCallback(() => {
    pendingLayoutRef.current = null;
    cancelPendingPan();
  }, [cancelPendingPan]);

  useEffect(() => {
    window.addEventListener("resize", cancelLayoutCorrection);
    return () => window.removeEventListener("resize", cancelLayoutCorrection);
  }, [cancelLayoutCorrection]);

  const registerElement = useCallback(
    (id: string, element: HTMLDivElement | null) => {
      if (element) {
        elementsRef.current.set(id, element);
      } else {
        elementsRef.current.delete(id);
      }
    },
    []
  );

  /** The camera centred on a single item at the current zoom. */
  const getFocusViewport = useCallback(
    (id: string): ViewportState | null => {
      const item = state.items.get(id);
      if (item?.kind !== "single") {
        return null;
      }
      const { scale } = getViewport();
      return {
        positionX:
          window.innerWidth / 2 -
          (item.position.x + (item.card.size.width ?? 0) / 2) * scale,
        positionY:
          window.innerHeight / 2 -
          (item.position.y + (item.card.size.height ?? 360) / 2) * scale,
        scale,
      };
    },
    [getViewport, state.items]
  );

  const closeStack = useCallback(() => {
    pendingLayoutRef.current = null;
    if (preStackViewportRef.current) {
      panTo(preStackViewportRef.current);
      preStackViewportRef.current = null;
    }
    setExpandedStack(null);
  }, [panTo, setExpandedStack]);

  const isStreetmap = useCallback(
    (id: string | null) => {
      const item = id ? state.items.get(id) : undefined;
      return item?.kind === "single" && item.card.kind === "streetmap";
    },
    [state.items]
  );
  const returnTimerRef = useRef(0);
  const cancelFocusReturn = useCallback(() => {
    window.clearTimeout(returnTimerRef.current);
    returnTimerRef.current = 0;
  }, []);
  useEffect(() => cancelFocusReturn, [cancelFocusReturn]);

  const closeFocus = useCallback(() => {
    const target = preFocusViewportRef.current;
    preFocusViewportRef.current = null;
    cancelFocusReturn();
    if (target && isStreetmap(state.focusedItemId)) {
      // The street map folds where it is held, then the camera carries the
      // booklet back as it drops; a camera that moved meanwhile stays put.
      const { positionX, positionY } = getViewport();
      returnTimerRef.current = window.setTimeout(() => {
        returnTimerRef.current = 0;
        const now = getViewport();
        if (
          Math.abs(now.positionX - positionX) < 2 &&
          Math.abs(now.positionY - positionY) < 2
        ) {
          panTo(target);
        }
      }, STREETMAP_RETURN_DELAY_MS);
    } else if (target) {
      panTo(target);
    }
    setFocusedItem(null);
  }, [
    cancelFocusReturn,
    getViewport,
    isStreetmap,
    panTo,
    setFocusedItem,
    state.focusedItemId,
  ]);

  useOutsideClick({
    getElement: useCallback(
      () => elementsRef.current.get(state.expandedStackId ?? ""),
      [state.expandedStackId]
    ),
    isActive: !!state.expandedStackId && !isLocked,
    onClickOutside: useCallback(() => {
      closeStack();
      track(AnalyticsEvents.STACK_CLOSE, {
        close_method: "outside_click",
        stack_type: state.expandedStackId,
      });
    }, [closeStack, state.expandedStackId]),
  });
  useOutsideClick({
    getElement: useCallback(
      () => elementsRef.current.get(state.focusedItemId ?? ""),
      [state.focusedItemId]
    ),
    isActive: !!state.focusedItemId && !isLocked,
    onClickOutside: closeFocus,
  });
  const trackFocus = useCallback(
    (id: string, opening: boolean) => {
      if (isStreetmap(id)) {
        track(AnalyticsEvents.STREETMAP_TOGGLE, {
          direction: opening ? "open" : "close",
        });
      } else {
        track(AnalyticsEvents.MACBOOK_ZOOM, {
          direction: opening ? "in" : "out",
        });
      }
    },
    [isStreetmap]
  );
  useEscapeKey({
    isActive: !!state.expandedStackId || !!state.focusedItemId,
    isLocked,
    onEscape: useCallback(() => {
      if (state.expandedStackId) {
        closeStack();
        track(AnalyticsEvents.KEYBOARD_ESCAPE, { context: "stack" });
      } else {
        closeFocus();
        track(AnalyticsEvents.KEYBOARD_ESCAPE, {
          context: isStreetmap(state.focusedItemId) ? "streetmap" : "macbook",
        });
      }
    }, [
      closeFocus,
      closeStack,
      isStreetmap,
      state.expandedStackId,
      state.focusedItemId,
    ]),
  });

  const activate = useCallback(
    (id: string, cardId?: string, trigger?: HTMLElement) => {
      const item = state.items.get(id);
      if (isLocked || !item) {
        return;
      }
      const card = getCanvasCard(item, cardId);
      if (!card) {
        return;
      }
      const policy = getInteractionPolicy(card.kind);
      pendingLayoutRef.current = null;
      cancelFocusReturn();
      if (policy.activate === "open-modal") {
        const { kind } = card;
        if (kind === "resume" || kind === "about") {
          bringItemToFront(id);
          setActiveDocument({ cardId: card.id, itemId: id, kind });
          track(
            kind === "resume"
              ? AnalyticsEvents.RESUME_VIEW
              : AnalyticsEvents.ABOUT_VIEW
          );
        } else if (card.kind === "article" && trigger) {
          bringItemToFront(id);
          session.openArticle?.(
            card.content.slug,
            { cardId: card.id, itemId: id },
            trigger
          );
        }
        return;
      }
      if (policy.activate !== "toggle-focus" || item.kind !== "single") {
        return;
      }
      if (state.focusedItemId === id) {
        closeFocus();
        trackFocus(id, false);
        return;
      }
      const viewport = getViewport();
      preFocusViewportRef.current ??= { ...viewport };
      setFocusedItem(id);
      bringItemToFront(id);
      trackFocus(id, true);
      const target = getFocusViewport(id);
      if (target) {
        panTo(target);
      }
    },
    [
      bringItemToFront,
      cancelFocusReturn,
      closeFocus,
      getFocusViewport,
      getViewport,
      isLocked,
      panTo,
      setActiveDocument,
      setFocusedItem,
      state.focusedItemId,
      state.items,
      session.openArticle,
      trackFocus,
    ]
  );

  const toggleExpanded = useCallback(
    (id: string) => {
      const item = state.items.get(id);
      if (isLocked || !item || item.kind === "single") {
        return;
      }
      cancelFocusReturn();
      if (state.expandedStackId === id) {
        closeStack();
        return;
      }
      const viewport = getViewport();
      const { innerWidth: width, innerHeight: height } = window;
      const target = (() => {
        switch (item.kind) {
          case "stack":
            return getAutoPanTarget(
              item,
              fanConfig,
              viewport,
              width,
              height,
              stackPages[id] ?? 0,
              layout
            );
          case "funstack":
            return getFunStackAutoPanTarget(
              item,
              viewport,
              width,
              height,
              undefined,
              layout
            );
          case "swagstack":
            return getSwagStackAutoPanTarget(
              item,
              viewport,
              width,
              height,
              fanConfig,
              layout
            );
          default:
            return null;
        }
      })();
      pendingLayoutRef.current =
        item.kind === "funstack"
          ? {
              id,
              viewport: target
                ? {
                    positionX: target.x,
                    positionY: target.y,
                    scale: target.scale,
                  }
                : { ...viewport },
            }
          : null;
      bringItemToFront(id);
      setExpandedStack(id);
      if (target) {
        preStackViewportRef.current ??= { ...viewport };
        panTo({
          positionX: target.x,
          positionY: target.y,
          scale: target.scale,
        });
      }
    },
    [
      bringItemToFront,
      cancelFocusReturn,
      closeStack,
      fanConfig,
      getViewport,
      isLocked,
      layout,
      panTo,
      setExpandedStack,
      state.expandedStackId,
      state.items,
      stackPages,
    ]
  );

  const changePage = useCallback(
    (id: string, page: number) => {
      const item = state.items.get(id);
      if (isLocked || item?.kind !== "stack") {
        return;
      }
      const nextPage = getStackPage(item, page).page;
      setStackPages((previous) =>
        previous[id] === nextPage ? previous : { ...previous, [id]: nextPage }
      );
      const current = getViewport();
      const target = getAutoPanTarget(
        item,
        fanConfig,
        current,
        window.innerWidth,
        window.innerHeight,
        nextPage,
        layout
      );
      if (target) {
        preStackViewportRef.current ??= { ...current };
        panTo({
          positionX: target.x,
          positionY: target.y,
          scale: target.scale,
        });
      }
    },
    [fanConfig, getViewport, isLocked, layout, panTo, state.items]
  );

  const contentHeightsRef = useRef<Record<string, number>>({});
  const getContentHeights = useCallback(() => contentHeightsRef.current, []);

  const measureContentLayout = useCallback(
    (id: string, height: number) => {
      // Remembered even when no camera correction follows: it bounds scrolling.
      contentHeightsRef.current[id] = height;
      const pending = pendingLayoutRef.current;
      if (pending?.id !== id || state.expandedStackId !== id) {
        return;
      }
      pendingLayoutRef.current = null;
      const item = state.items.get(id);
      if (isLocked || item?.kind !== "funstack") {
        return;
      }
      // Use the requested destination, not an intermediate animation frame.
      const current = pending.viewport;
      const target = getFunStackAutoPanTarget(
        item,
        current,
        window.innerWidth,
        window.innerHeight,
        height,
        layout
      );
      // Refine once per expansion, never continuously follow late media changes.
      if (
        target &&
        (Math.abs(target.x - current.positionX) > 1 ||
          Math.abs(target.y - current.positionY) > 1)
      ) {
        preStackViewportRef.current ??= { ...current };
        panTo({
          positionX: target.x,
          positionY: target.y,
          scale: target.scale,
        });
      }
    },
    [isLocked, layout, panTo, state.expandedStackId, state.items]
  );

  /** Touch has no Escape key: closes whichever stack or focused card is open. */
  const closeActive = useCallback(() => {
    if (isLocked) {
      return;
    }
    if (state.expandedStackId) {
      closeStack();
      track(AnalyticsEvents.STACK_CLOSE, {
        close_method: "close_button",
        stack_type: state.expandedStackId,
      });
    } else if (state.focusedItemId) {
      closeFocus();
    }
  }, [
    closeFocus,
    closeStack,
    isLocked,
    state.expandedStackId,
    state.focusedItemId,
  ]);

  const clearReturnPositions = useCallback(() => {
    pendingLayoutRef.current = null;
    preStackViewportRef.current = null;
    preFocusViewportRef.current = null;
    cancelFocusReturn();
  }, [cancelFocusReturn]);
  const closeDocument = useCallback(
    () => setActiveDocument(null),
    [setActiveDocument]
  );

  return {
    activate,
    activeDocument,
    cancelLayoutCorrection,
    changePage,
    clearReturnPositions,
    closeActive,
    closeDocument,
    getContentHeights,
    getFocusViewport,
    isLocked,
    measureContentLayout,
    registerElement,
    stackPages,
    toggleExpanded,
  };
};
