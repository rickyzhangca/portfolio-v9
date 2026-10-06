import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { useCallback, useMemo, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { AboutModal } from "@/components/about/about-modal";
import { ArticleModal } from "@/components/articles/article-modal";
import { ResumeModal } from "@/components/resume/resume-modal";
import { fanConfigAtom, repulsionConfigAtom } from "@/context/atoms";
import { useCanvasSession } from "@/context/canvas-session";
import {
  type ActiveDocument,
  useCanvasInteractions,
} from "@/hooks/use-canvas-interactions";
import { useCanvasState } from "@/hooks/use-canvas-state";
import { useCanvasViewport } from "@/hooks/use-canvas-viewport";
import {
  useArePositionsModified,
  useViewportConfig,
} from "@/hooks/use-viewport-config";
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
}

const ZERO_OFFSET = { x: 0, y: 0 } as const;

export const Canvas = ({ initialItems }: CanvasProps) => {
  const [baselineItems] = useState(initialItems);
  const { state, actions } = useCanvasState(baselineItems);
  const [isDragging, setIsDragging] = useState(false);
  const [activeDocument, setActiveDocument] = useState<ActiveDocument>(null);
  const session = useCanvasSession();
  const fanConfig = useAtomValue(fanConfigAtom);
  const repulsionConfig = useAtomValue(repulsionConfigAtom);
  const viewport = useCanvasViewport(
    state.viewportState,
    actions.updateViewport,
    activeDocument !== null || session.articleOpen || !session.canvasVisible
  );
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
    panTo: viewport.panTo,
    setActiveDocument,
    setExpandedStack: actions.setExpandedStack,
    setFocusedItem: actions.setFocusedItem,
    state,
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

  return (
    <LayoutGroup>
      <div
        className="h-screen w-screen overflow-clip"
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
            excluded: ["no-pan"],
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
                wrapperClass="!w-screen !h-screen !overflow-clip"
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
                      state.expandedStackId !== null ||
                      interaction.isLocked ||
                      state.focusedItemId !== null
                    }
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
              <CanvasControls
                isResetDisabled={isViewportReset && !arePositionsModified}
                onReset={resetViewport}
                onResetPositions={resetItems}
              />
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
