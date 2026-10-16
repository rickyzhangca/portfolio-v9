import { XIcon } from "@phosphor-icons/react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { getInteractionPolicy } from "@/cards/registry";
import { AboutModal } from "@/components/about/about-modal";
import { ArticleModal } from "@/components/articles/article-modal";
import { DeskLampRoom } from "@/components/lighting/desk-lamp-room";
import { ResumeModal } from "@/components/resume/resume-modal";
import {
  deskLampAtom,
  fanConfigAtom,
  repulsionConfigAtom,
} from "@/context/atoms";
import {
  CanvasEnvironmentContext,
  useCanvasEnvironment,
} from "@/context/canvas-layout";
import { useCanvasSession } from "@/context/canvas-session";
import {
  type ActiveDocument,
  useCanvasInteractions,
} from "@/hooks/use-canvas-interactions";
import { useCanvasEntrance } from "@/hooks/use-canvas-entrance";
import { useCanvasState } from "@/hooks/use-canvas-state";
import { useCanvasViewport } from "@/hooks/use-canvas-viewport";
import { useDefaultDeskLamp } from "@/hooks/use-default-desk-lamp";
import {
  useCoarsePointer,
  useIgnoreSyntheticMouseEvents,
} from "@/hooks/use-touch-input";
import {
  useArePositionsModified,
  useViewportConfig,
} from "@/hooks/use-viewport-config";
import { ENTRANCE_DURATION_MS, getEntranceDelays } from "@/lib/canvas-entrance";
import { type CanvasLayout, DESKTOP_CANVAS_LAYOUT } from "@/lib/canvas-layout";
import { getCompactPanBounds, type PanBounds } from "@/lib/pan-bounds";
import { getDocumentLayoutId } from "@/lib/document-motion";
import {
  computeRepulsionOffsets,
  computeStackCardRepulsion,
} from "@/lib/repulsion";
import type { CanvasItem } from "@/types/canvas";
import { CanvasControls } from "./canvas-controls";
import { CanvasItemRenderer } from "./canvas-item";

interface CanvasProps {
  initialItems: CanvasItem[];
  layout?: CanvasLayout;
}

const ZERO_OFFSET = { x: 0, y: 0 } as const;

/** A long press would open the browser's image and text menu over the canvas. */
const suppressTouchContextMenu = (event: Event) => {
  if (!(event.target instanceof Element && event.target.closest("a[href]"))) {
    event.preventDefault();
  }
};

export const Canvas = ({
  initialItems,
  layout = DESKTOP_CANVAS_LAYOUT,
}: CanvasProps) => {
  const isCoarsePointer = useCoarsePointer();
  const environment = useMemo(
    () => ({ isCoarsePointer, layout }),
    [isCoarsePointer, layout]
  );
  return (
    <CanvasEnvironmentContext.Provider value={environment}>
      <CanvasScene initialItems={initialItems} />
    </CanvasEnvironmentContext.Provider>
  );
};

const CanvasScene = ({ initialItems }: Pick<CanvasProps, "initialItems">) => {
  const { isCoarsePointer, layout } = useCanvasEnvironment();
  const [baselineItems] = useState(initialItems);
  const { state, actions } = useCanvasState(baselineItems);
  const [isDragging, setIsDragging] = useState(false);
  const [activeDocument, setActiveDocument] = useState<ActiveDocument>(null);
  const session = useCanvasSession();
  useIgnoreSyntheticMouseEvents();
  const fanConfig = useAtomValue(fanConfigAtom);
  const repulsionConfig = useAtomValue(repulsionConfigAtom);
  const isLampOn = useAtomValue(deskLampAtom);
  // Phones show one column and reveal content at its own width, so sideways
  // drags only reach empty canvas. The focused laptop is wider than the screen.
  const lockAxisX = layout.compact && state.focusedItemId === null;
  // The bounds depend on interaction state that is created after the viewport.
  const panBoundsRef = useRef<() => PanBounds | null>(() => null);
  const getPanBounds = useCallback(() => panBoundsRef.current(), []);
  const viewport = useCanvasViewport(
    state.viewportState,
    actions.updateViewport,
    activeDocument !== null || session.articleOpen || !session.canvasVisible,
    lockAxisX,
    getPanBounds
  );
  const [entranceDelays] = useState(() => getEntranceDelays(baselineItems));
  const entrance = useCanvasEntrance(
    viewport.containerRef,
    ENTRANCE_DURATION_MS
  );
  // Phones have no controls to switch the lamp off, so it starts off there.
  // Elsewhere it switches on once the cards have settled: starting WebGPU and
  // its lit surfaces mid-entrance would cost the wave its frames.
  useDefaultDeskLamp(!layout.compact && entrance === "done");
  const { onCanvasEntrance } = session;
  useEffect(() => {
    if (entrance !== "waiting") {
      onCanvasEntrance?.();
    }
  }, [entrance, onCanvasEntrance]);
  const getViewport = useCallback(
    () => viewport.viewportRef.current,
    [viewport.viewportRef]
  );
  const interaction = useCanvasInteractions({
    activeDocument,
    bringItemToFront: actions.bringItemToFront,
    cancelPendingPan: viewport.cancelPendingPan,
    fanConfig,
    getViewport,
    layout,
    panTo: viewport.panTo,
    setActiveDocument,
    setExpandedStack: actions.setExpandedStack,
    setFocusedItem: actions.setFocusedItem,
    state,
  });
  panBoundsRef.current = () =>
    getCompactPanBounds({
      expandedStackId: state.expandedStackId,
      fanConfig,
      focusedItemId: state.focusedItemId,
      funContentHeights: interaction.getContentHeights(),
      getFocusScale: (item) =>
        getInteractionPolicy(item.card.kind).focusScale ?? 1,
      items: state.items,
      layout,
      stackPages: interaction.stackPages,
      viewport: {
        height: window.innerHeight,
        scale: viewport.viewportRef.current.scale,
        width: window.innerWidth,
      },
    });
  const { effectiveRepulsionConfig } = useViewportConfig({
    baseRepulsionConfig: repulsionConfig,
    viewportDimensions: viewport.dimensions,
  });
  const documentSource =
    activeDocument ?? (session.articleOpen ? session.articleSource : null);
  const documentItemId = documentSource?.itemId ?? null;
  const sourceId =
    documentItemId ?? state.expandedStackId ?? state.focusedItemId;
  const repulsion = useMemo(() => {
    const sourceItem = documentItemId
      ? state.items.get(documentItemId)
      : undefined;
    const config = documentSource ? effectiveRepulsionConfig : repulsionConfig;
    const stackRepulsion =
      documentSource && sourceItem?.kind === "stack"
        ? computeStackCardRepulsion({
            cardId: documentSource.cardId,
            columns: layout.stackColumns,
            config,
            fanConfig,
            page: interaction.stackPages[sourceItem.id] ?? 0,
            stack: sourceItem,
          })
        : null;
    return {
      cards: stackRepulsion?.offsets,
      items: computeRepulsionOffsets(
        state.items,
        stackRepulsion?.source ?? sourceId,
        config
      ),
      stackId: stackRepulsion?.source.itemId,
    };
  }, [
    state.items,
    sourceId,
    documentItemId,
    documentSource,
    fanConfig,
    layout.stackColumns,
    interaction.stackPages,
    effectiveRepulsionConfig,
    repulsionConfig,
  ]);
  const arePositionsModified = useArePositionsModified(
    state.items,
    baselineItems
  );
  const isViewportReset =
    state.viewportState.scale === 1 &&
    state.viewportState.positionX === 0 &&
    state.viewportState.positionY === 0;
  const onDragStart = useCallback(() => setIsDragging(true), []);
  const onDragEnd = useCallback(() => setIsDragging(false), []);
  const { cancelPendingPan, transformRef } = viewport;
  const resetViewport = useCallback(() => {
    cancelPendingPan();
    transformRef.current?.resetTransform();
  }, [cancelPendingPan, transformRef]);
  const { clearReturnPositions } = interaction;
  const { resetItems: resetSceneItems } = actions;
  const resetItems = useCallback(() => {
    cancelPendingPan();
    clearReturnPositions();
    resetSceneItems();
  }, [cancelPendingPan, clearReturnPositions, resetSceneItems]);
  const activeItem = documentItemId
    ? state.items.get(documentItemId)
    : undefined;
  const overlays = [state.expandedStackId, state.focusedItemId].filter(
    (id): id is string => id !== null
  );
  const showCloseButton =
    isCoarsePointer &&
    !interaction.isLocked &&
    (state.expandedStackId !== null || state.focusedItemId !== null);
  const { canvasVisible } = session;
  const { containerRef } = viewport;

  useEffect(() => {
    const container = containerRef.current;
    if (!(container && isCoarsePointer)) {
      return;
    }
    container.addEventListener("contextmenu", suppressTouchContextMenu);
    return () =>
      container.removeEventListener("contextmenu", suppressTouchContextMenu);
  }, [containerRef, isCoarsePointer]);

  useEffect(() => {
    if (!canvasVisible) {
      return;
    }
    // Pulling the page down must not refresh or bounce while the canvas pans.
    const root = document.documentElement;
    const previous = root.style.overscrollBehavior;
    root.style.overscrollBehavior = "none";
    return () => {
      root.style.overscrollBehavior = previous;
    };
  }, [canvasVisible]);

  return (
    <LayoutGroup>
      <div
        className="h-full w-full overflow-clip"
        data-entrance={entrance === "done" ? undefined : entrance}
        onPointerDownCapture={interaction.cancelLayoutCorrection}
        onWheelCapture={interaction.cancelLayoutCorrection}
        ref={viewport.containerRef}
      >
        <TransformWrapper
          centerOnInit={false}
          doubleClick={{ disabled: true, mode: "zoomIn" }}
          initialScale={1}
          limitToBounds={false}
          maxScale={3}
          minScale={0.3}
          onPanningStop={viewport.onStopped}
          onTransform={viewport.onTransformed}
          onZoomStop={viewport.onStopped}
          panning={{
            disabled: isDragging || interaction.isLocked,
            // A finger has no empty gutter to grab: swipes must pan from cards too.
            excluded: isCoarsePointer ? [] : ["no-pan"],
            lockAxisX,
            velocityDisabled: false,
          }}
          pinch={{ disabled: true }}
          ref={viewport.transformRef}
          wheel={{ disabled: true }}
        >
          {() => (
            <>
              <TransformComponent
                contentClass="relative !w-full !h-full"
                wrapperClass="!w-full !h-full !overflow-clip touch-none [&_img]:[-webkit-touch-callout:none]"
              >
                {Array.from(state.items.values()).map((item, itemIndex) => (
                  <CanvasItemRenderer
                    cardRepulsionOffsets={
                      item.id === repulsion.stackId
                        ? repulsion.cards
                        : undefined
                    }
                    documentOpen={
                      activeDocument?.itemId === item.id &&
                      item.kind === "single" &&
                      activeDocument.cardId === item.card.id
                    }
                    dragDisabled={
                      // On touch a swipe must pan, never lift the card under it.
                      isCoarsePointer ||
                      state.expandedStackId !== null ||
                      interaction.isLocked ||
                      state.focusedItemId !== null
                    }
                    entranceDelay={entranceDelays.get(item.id)}
                    entranceStarted={entrance !== "waiting"}
                    isExpanded={state.expandedStackId === item.id}
                    isFocused={state.focusedItemId === item.id}
                    item={item}
                    itemIndex={itemIndex}
                    key={item.id}
                    onActivate={interaction.activate}
                    onBringToFront={actions.bringItemToFront}
                    onCardHeightMeasured={actions.updateCardHeight}
                    onContentLayoutMeasured={interaction.measureContentLayout}
                    onDragEnd={onDragEnd}
                    onDragStart={onDragStart}
                    onPageChange={interaction.changePage}
                    onPositionUpdate={actions.updateItemPosition}
                    onToggleExpanded={interaction.toggleExpanded}
                    page={interaction.stackPages[item.id] ?? 0}
                    repulsionOffset={
                      repulsion.items.get(item.id) ?? ZERO_OFFSET
                    }
                    scale={viewport.scale}
                    setRootRef={interaction.registerElement}
                  />
                ))}
                <AnimatePresence>
                  {overlays.map((id) => {
                    const item = state.items.get(id);
                    return item ? (
                      <motion.div
                        animate={{ opacity: 0.8 }}
                        className="absolute cursor-pointer bg-background1"
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0 }}
                        key={id}
                        style={{
                          height: 100_000,
                          left: -50_000,
                          top: -50_000,
                          width: 100_000,
                          zIndex: item.zIndex - 1,
                        }}
                      />
                    ) : null;
                  })}
                </AnimatePresence>
              </TransformComponent>
              {isLampOn ? <DeskLampRoom /> : null}
              {/* Phones keep one bounded column: nothing to tune or reset. */}
              {layout.compact ? null : (
                <div className="canvas-entrance-chrome">
                  <CanvasControls
                    isResetDisabled={isViewportReset && !arePositionsModified}
                    onReset={resetViewport}
                    onResetPositions={resetItems}
                  />
                </div>
              )}
              <AnimatePresence>
                {showCloseButton ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center"
                    exit={{ opacity: 0, y: 16 }}
                    initial={{ opacity: 0, y: 16 }}
                    key="close"
                  >
                    <button
                      className="pointer-events-auto flex items-center gap-2 rounded-full bg-foreground1/80 px-5 py-3.5 font-medium text-white shadow-lg backdrop-blur active:bg-foreground1"
                      data-no-collapse
                      onClick={interaction.closeActive}
                      type="button"
                    >
                      <XIcon size={16} weight="bold" />
                      Close
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </>
          )}
        </TransformWrapper>
        <ResumeModal
          data={
            activeItem?.kind === "single" && activeItem.card.kind === "resume"
              ? activeItem.card.content
              : undefined
          }
          isOpen={interaction.activeDocument?.kind === "resume"}
          layoutId={
            activeDocument?.kind === "resume"
              ? getDocumentLayoutId(
                  activeDocument.itemId,
                  activeDocument.cardId
                )
              : undefined
          }
          onClose={interaction.closeDocument}
        />
        <AboutModal
          isOpen={interaction.activeDocument?.kind === "about"}
          layoutId={
            activeDocument?.kind === "about"
              ? getDocumentLayoutId(
                  activeDocument.itemId,
                  activeDocument.cardId
                )
              : undefined
          }
          onClose={interaction.closeDocument}
        />
        <ArticleModal />
      </div>
    </LayoutGroup>
  );
};
