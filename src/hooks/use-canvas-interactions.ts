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
import { getStackPage } from "@/lib/card-layout";
import type { FanConfig } from "@/lib/fan";
import type { CanvasState, ViewportState } from "@/types/canvas";

interface InteractionOptions {
  activeDocument: ActiveDocument;
  bringItemToFront: (id: string) => void;
  cancelPendingPan: () => void;
  fanConfig: FanConfig;
  getViewport: () => ViewportState;
  panTo: (target: ViewportState) => void;
  setActiveDocument: (document: ActiveDocument) => void;
  setExpandedStack: (id: string | null) => void;
  setFocusedItem: (id: string | null) => void;
  state: CanvasState;
}

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

  const closeStack = useCallback(() => {
    pendingLayoutRef.current = null;
    if (preStackViewportRef.current) {
      panTo(preStackViewportRef.current);
      preStackViewportRef.current = null;
    }
    setExpandedStack(null);
  }, [panTo, setExpandedStack]);

  const closeFocus = useCallback(() => {
    if (preFocusViewportRef.current) {
      panTo(preFocusViewportRef.current);
      preFocusViewportRef.current = null;
    }
    setFocusedItem(null);
  }, [panTo, setFocusedItem]);

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
  useEscapeKey({
    isActive: !!state.expandedStackId || !!state.focusedItemId,
    isLocked,
    onEscape: useCallback(() => {
      if (state.expandedStackId) {
        closeStack();
        track(AnalyticsEvents.KEYBOARD_ESCAPE, { context: "stack" });
      } else {
        closeFocus();
        track(AnalyticsEvents.KEYBOARD_ESCAPE, { context: "macbook" });
      }
    }, [closeFocus, closeStack, state.expandedStackId]),
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
        track(AnalyticsEvents.MACBOOK_ZOOM, { direction: "out" });
        return;
      }
      const viewport = getViewport();
      preFocusViewportRef.current ??= { ...viewport };
      setFocusedItem(id);
      bringItemToFront(id);
      track(AnalyticsEvents.MACBOOK_ZOOM, { direction: "in" });
      panTo({
        positionX:
          window.innerWidth / 2 -
          (item.position.x + (item.card.size.width ?? 0) / 2) * viewport.scale,
        positionY:
          window.innerHeight / 2 -
          (item.position.y + (item.card.size.height ?? 360) / 2) *
            viewport.scale,
        scale: viewport.scale,
      });
    },
    [
      bringItemToFront,
      closeFocus,
      getViewport,
      isLocked,
      panTo,
      setActiveDocument,
      setFocusedItem,
      state.focusedItemId,
      state.items,
      session.openArticle,
    ]
  );

  const toggleExpanded = useCallback(
    (id: string) => {
      const item = state.items.get(id);
      if (isLocked || !item || item.kind === "single") {
        return;
      }
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
              stackPages[id] ?? 0
            );
          case "funstack":
            return getFunStackAutoPanTarget(item, viewport, width, height);
          case "swagstack":
            return getSwagStackAutoPanTarget(
              item,
              viewport,
              width,
              height,
              fanConfig
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
      closeStack,
      fanConfig,
      getViewport,
      isLocked,
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
        nextPage
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
    [fanConfig, getViewport, isLocked, panTo, state.items]
  );

  const measureContentLayout = useCallback(
    (id: string, height: number) => {
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
        height
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
    [isLocked, panTo, state.expandedStackId, state.items]
  );

  const clearReturnPositions = useCallback(() => {
    pendingLayoutRef.current = null;
    preStackViewportRef.current = null;
    preFocusViewportRef.current = null;
  }, []);
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
    closeDocument,
    isLocked,
    measureContentLayout,
    registerElement,
    stackPages,
    toggleExpanded,
  };
};
