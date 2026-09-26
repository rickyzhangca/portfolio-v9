import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { useCallback, useMemo, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { AboutModal } from "@/components/about/about-modal";
import { ResumeModal } from "@/components/resume/resume-modal";
import { fanConfigAtom, repulsionConfigAtom } from "@/context/atoms";
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
import { computeRepulsionOffsets } from "@/lib/repulsion";
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
  const fanConfig = useAtomValue(fanConfigAtom);
  const repulsionConfig = useAtomValue(repulsionConfigAtom);
  const viewport = useCanvasViewport(
    state.viewportState,
    actions.updateViewport,
    activeDocument !== null
  );
  const getViewport = useCallback(
    () => viewport.viewportRef.current,
    [viewport.viewportRef]
  );
  const interaction = useCanvasInteractions({
    state,
    activeDocument,
    setActiveDocument,
    fanConfig,
    getViewport,
    panTo: viewport.panTo,
    cancelPendingPan: viewport.cancelPendingPan,
    bringItemToFront: actions.bringItemToFront,
    setExpandedStack: actions.setExpandedStack,
    setFocusedItem: actions.setFocusedItem,
  });
  const { effectiveRepulsionConfig } = useViewportConfig({
    viewportDimensions: viewport.dimensions,
    baseRepulsionConfig: repulsionConfig,
  });
  const documentItemId = interaction.activeDocument?.itemId ?? null;
  const sourceId =
    state.expandedStackId ?? documentItemId ?? state.focusedItemId;
  const repulsionOffsets = useMemo(
    () =>
      computeRepulsionOffsets(
        state.items,
        sourceId,
        documentItemId ? effectiveRepulsionConfig : repulsionConfig
      ),
    [
      state.items,
      sourceId,
      documentItemId,
      effectiveRepulsionConfig,
      repulsionConfig,
    ]
  );
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
  const { cancelPendingPan } = viewport;
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
            velocityDisabled: false,
            excluded: ["no-pan"],
          }}
          pinch={{ disabled: true }}
          ref={viewport.transformRef}
          wheel={{ disabled: true }}
        >
          {({ resetTransform }) => (
            <>
              <TransformComponent
                contentClass="relative !w-full !h-full"
                wrapperClass="!w-screen !h-screen !overflow-clip"
              >
                {Array.from(state.items.values()).map((item, itemIndex) => (
                  <CanvasItemRenderer
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
                    onPositionUpdate={actions.updateItemPosition}
                    onToggleExpanded={interaction.toggleExpanded}
                    repulsionOffset={
                      repulsionOffsets.get(item.id) ?? ZERO_OFFSET
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
                          zIndex: item.zIndex - 1,
                          left: -50_000,
                          top: -50_000,
                          width: 100_000,
                          height: 100_000,
                        }}
                      />
                    ) : null;
                  })}
                </AnimatePresence>
              </TransformComponent>
              <CanvasControls
                isResetDisabled={isViewportReset && !arePositionsModified}
                onReset={() => {
                  viewport.cancelPendingPan();
                  resetTransform();
                }}
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
          onClose={interaction.closeDocument}
        />
        <AboutModal
          isOpen={interaction.activeDocument?.kind === "about"}
          onClose={interaction.closeDocument}
        />
      </div>
    </LayoutGroup>
  );
};
