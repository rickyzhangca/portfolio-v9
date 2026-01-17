import { useAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { CardGroup } from "@/components/groups/card-group";
import { repulsionConfigAtom } from "@/context/atoms";
import { useCanvasState } from "@/hooks/use-canvas-state";
import { computeRepulsionOffsets } from "@/lib/repulsion";
import type { CardGroupData } from "@/types/canvas";
import { CanvasControls } from "./canvas-controls";

interface CanvasProps {
  initialGroups: CardGroupData[];
}

export const Canvas = ({ initialGroups }: CanvasProps) => {
  const { state, actions } = useCanvasState(initialGroups);
  const [isPanningDisabled, setIsPanningDisabled] = useState(false);
  const [scale, setScale] = useState(1);
  const [repulsionConfig] = useAtom(repulsionConfigAtom);

  const groupElementsRef = useRef(new Map<string, HTMLDivElement | null>());
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerDownRef = useRef<{
    clientX: number;
    clientY: number;
    startedOutsideExpandedGroup: boolean;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleWheel = (e: WheelEvent) => {
      const isOverNoPan = (e.target as Element).closest(".no-pan");
      const isPinchGesture = e.ctrlKey || e.metaKey;

      // Always prevent default to stop browser zoom behavior
      e.preventDefault();

      const instance = transformRef.current?.instance;
      if (!instance) {
        return;
      }

      const { positionX, positionY, scale } = instance.transformState;

      if (isPinchGesture) {
        // Handle pinch-to-zoom (trackpad pinch fires wheel events with ctrlKey=true)
        // Skip zoom if over a no-pan element
        if (isOverNoPan) {
          return;
        }

        // Calculate zoom based on deltaY (negative = zoom in, positive = zoom out)
        const zoomSensitivity = 0.01;
        const zoomDelta = -e.deltaY * zoomSensitivity;
        const newScale = Math.min(3, Math.max(0.3, scale * (1 + zoomDelta)));

        // Get the mouse position relative to the container
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate the point in canvas space that should stay fixed
        const pointXInCanvas = (mouseX - positionX) / scale;
        const pointYInCanvas = (mouseY - positionY) / scale;

        // Calculate new position so the point under cursor stays fixed
        const newX = mouseX - pointXInCanvas * newScale;
        const newY = mouseY - pointYInCanvas * newScale;

        transformRef.current?.setTransform(newX, newY, newScale, 0);
      } else {
        // Handle two-finger pan (works everywhere, including over no-pan elements for navigation)
        const newX = positionX - e.deltaX;
        const newY = positionY - e.deltaY;
        transformRef.current?.setTransform(newX, newY, scale, 0);
      }
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
    const expandedGroupId = state.expandedGroupId;
    if (!expandedGroupId) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target) {
        return;
      }

      if (target.closest("[data-no-collapse]")) {
        pointerDownRef.current = null;
        return;
      }

      const expandedEl = groupElementsRef.current.get(expandedGroupId);
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
        actions.setExpandedGroup(null);
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
  }, [state.expandedGroupId, actions.setExpandedGroup]);

  const repulsionOffsets = useMemo(
    () =>
      computeRepulsionOffsets(
        state.groups,
        state.expandedGroupId,
        repulsionConfig
      ),
    [state.groups, state.expandedGroupId, repulsionConfig]
  );

  const isViewportReset =
    state.viewportState.scale === 1 &&
    state.viewportState.positionX === 0 &&
    state.viewportState.positionY === 0;

  return (
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
          disabled: isPanningDisabled,
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
              {/* Render groups */}
              {Array.from(state.groups.values()).map((group) => {
                const expandedGroupId = state.expandedGroupId;
                const isExpanded = expandedGroupId === group.id;
                const dimmed = expandedGroupId !== null && !isExpanded;
                const dragDisabled = expandedGroupId !== null;
                const repulsionOffset = repulsionOffsets.get(group.id) ?? {
                  x: 0,
                  y: 0,
                };

                return (
                  <CardGroup
                    dimmed={dimmed}
                    dragDisabled={dragDisabled}
                    group={group}
                    isExpanded={isExpanded}
                    key={group.id}
                    onBringToFront={() => actions.bringGroupToFront(group.id)}
                    onDragEnd={() => setIsPanningDisabled(false)}
                    onDragStart={() => setIsPanningDisabled(true)}
                    onPositionUpdate={(position) =>
                      actions.updateGroupPosition(group.id, position)
                    }
                    onToggleExpanded={() => {
                      if (isExpanded) {
                        actions.setExpandedGroup(null);
                        return;
                      }

                      actions.bringGroupToFront(group.id);
                      actions.setExpandedGroup(group.id);
                    }}
                    repulsionOffset={repulsionOffset}
                    scale={scale}
                    setRootRef={(el) => registerGroupElement(group.id, el)}
                  />
                );
              })}
            </TransformComponent>

            <CanvasControls
              isResetDisabled={isViewportReset}
              onReset={() => resetTransform()}
            />
          </>
        )}
      </TransformWrapper>
    </div>
  );
};
