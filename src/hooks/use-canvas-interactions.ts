import { useCallback, useRef } from "react";
import { getInteractionPolicy } from "@/cards/registry";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { AnalyticsEvents, track } from "@/lib/analytics";
import {
  getAutoPanTarget,
  getFunStackAutoPanTarget,
  getSwagStackAutoPanTarget,
} from "@/lib/auto-pan";
import type { FanConfig } from "@/lib/fan";
import type { CanvasState, ViewportState } from "@/types/canvas";

interface InteractionOptions {
  state: CanvasState;
  activeDocument: ActiveDocument;
  setActiveDocument: (document: ActiveDocument) => void;
  fanConfig: FanConfig;
  getViewport: () => ViewportState;
  panTo: (target: ViewportState) => void;
  bringItemToFront: (id: string) => void;
  setExpandedStack: (id: string | null) => void;
  setFocusedItem: (id: string | null) => void;
}

export type ActiveDocument = {
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
  bringItemToFront,
  setExpandedStack,
  setFocusedItem,
}: InteractionOptions) => {
  const elementsRef = useRef(new Map<string, HTMLDivElement>());
  const preStackViewportRef = useRef<ViewportState | null>(null);
  const preFocusViewportRef = useRef<ViewportState | null>(null);
  const isLocked = activeDocument !== null;

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
    isActive: !!state.expandedStackId && !isLocked,
    getElement: useCallback(
      () => elementsRef.current.get(state.expandedStackId ?? ""),
      [state.expandedStackId]
    ),
    onClickOutside: useCallback(() => {
      closeStack();
      track(AnalyticsEvents.STACK_CLOSE, {
        stack_type: state.expandedStackId,
        close_method: "outside_click",
      });
    }, [closeStack, state.expandedStackId]),
  });
  useOutsideClick({
    isActive: !!state.focusedItemId && !isLocked,
    getElement: useCallback(
      () => elementsRef.current.get(state.focusedItemId ?? ""),
      [state.focusedItemId]
    ),
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
    (id: string) => {
      const item = state.items.get(id);
      if (isLocked || !item || item.kind !== "single") {
        return;
      }
      const policy = getInteractionPolicy(item.card.kind);
      if (policy.activate === "open-modal") {
        const kind = item.card.kind;
        if (kind === "resume" || kind === "about") {
          bringItemToFront(id);
          setActiveDocument({ kind, itemId: id });
          track(
            kind === "resume"
              ? AnalyticsEvents.RESUME_VIEW
              : AnalyticsEvents.ABOUT_VIEW
          );
        }
        return;
      }
      if (policy.activate !== "toggle-focus") {
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
        scale: viewport.scale,
        positionX:
          window.innerWidth / 2 -
          (item.position.x + (item.card.size.width ?? 0) / 2) * viewport.scale,
        positionY:
          window.innerHeight / 2 -
          (item.position.y + (item.card.size.height ?? 360) / 2) *
            viewport.scale,
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
            return getAutoPanTarget(item, fanConfig, viewport, width, height);
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
    ]
  );

  const clearReturnPositions = useCallback(() => {
    preStackViewportRef.current = null;
    preFocusViewportRef.current = null;
  }, []);
  const closeDocument = useCallback(
    () => setActiveDocument(null),
    [setActiveDocument]
  );

  return {
    activeDocument,
    isLocked,
    closeDocument,
    activate,
    toggleExpanded,
    registerElement,
    clearReturnPositions,
  };
};
