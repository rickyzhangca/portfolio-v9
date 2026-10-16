import { type CSSProperties, memo, useCallback } from "react";
import { SingleCardItem } from "@/components/canvas/single-card-item";
import { CardStack } from "@/components/groups/card-group";
import { FunProjectGroup } from "@/components/groups/fun-project-group";
import { SwagGroup } from "@/components/groups/swag-group";
import { ItemEntranceContext } from "@/context/canvas-entrance";
import { getEntranceOrigin } from "@/lib/canvas-entrance";
import type { CanvasItem, Position } from "@/types/canvas";

interface CanvasItemRendererProps {
  cardRepulsionOffsets?: ReadonlyMap<string, Position>;
  documentOpen?: boolean;
  dragDisabled: boolean;
  /** Milliseconds after the scene's entrance starts that this item rises. */
  entranceDelay?: number;
  /** False while the scene holds its entrance for the first view. */
  entranceStarted?: boolean;
  isExpanded: boolean;
  isFocused: boolean;
  item: CanvasItem;
  itemIndex: number;
  onActivate?: (id: string, cardId?: string, trigger?: HTMLElement) => void;
  onBringToFront: (id: string) => void;
  onCardHeightMeasured?: (id: string, cardId: string, height: number) => void;
  onContentLayoutMeasured?: (id: string, height: number) => void;
  onDragEnd?: () => void;
  onDragStart?: () => void;
  onPageChange?: (id: string, page: number) => void;
  onPositionUpdate: (id: string, position: Position) => void;
  onToggleExpanded: (id: string) => void;
  page?: number;
  repulsionOffset: Position;
  scale: number;
  setRootRef?: (id: string, el: HTMLDivElement | null) => void;
}

const CanvasItemContent = ({
  cardRepulsionOffsets,
  documentOpen = false,
  item,
  scale,
  isExpanded,
  isFocused,
  dragDisabled,
  repulsionOffset,
  onBringToFront: bringToFront,
  onToggleExpanded: toggleExpanded,
  onPositionUpdate: updatePosition,
  onDragStart,
  onDragEnd,
  onCardHeightMeasured: measureCard,
  onContentLayoutMeasured: measureContent,
  onActivate: activate,
  onPageChange: changePage,
  page,
  setRootRef: registerElement,
}: CanvasItemRendererProps) => {
  const onBringToFront = useCallback(
    () => bringToFront(item.id),
    [bringToFront, item.id]
  );
  const onToggleExpanded = useCallback(
    () => toggleExpanded(item.id),
    [toggleExpanded, item.id]
  );
  const onPositionUpdate = useCallback(
    (position: Position) => updatePosition(item.id, position),
    [updatePosition, item.id]
  );
  const onCardHeightMeasured = useCallback(
    (cardId: string, height: number) => measureCard?.(item.id, cardId, height),
    [measureCard, item.id]
  );
  const onActivate = useCallback(
    (trigger?: HTMLElement) => activate?.(item.id, undefined, trigger),
    [activate, item.id]
  );
  const onActivateCard = useCallback(
    (cardId: string, trigger: HTMLElement) =>
      activate?.(item.id, cardId, trigger),
    [activate, item.id]
  );
  const onPageChange = useCallback(
    (nextPage: number) => changePage?.(item.id, nextPage),
    [changePage, item.id]
  );
  const onContentLayoutMeasured = useCallback(
    (height: number) => measureContent?.(item.id, height),
    [measureContent, item.id]
  );
  const setRootRef = useCallback(
    (element: HTMLDivElement | null) => registerElement?.(item.id, element),
    [registerElement, item.id]
  );
  if (item.kind === "single") {
    return (
      <SingleCardItem
        documentOpen={documentOpen}
        dragDisabled={dragDisabled}
        isFocused={isFocused}
        item={item}
        onActivate={onActivate}
        onBringToFront={onBringToFront}
        onCardHeightMeasured={onCardHeightMeasured}
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
        onPositionUpdate={onPositionUpdate}
        repulsionOffset={repulsionOffset}
        scale={scale}
        setRootRef={setRootRef}
      />
    );
  }

  if (item.kind === "funstack") {
    return (
      <FunProjectGroup
        dragDisabled={dragDisabled}
        isExpanded={isExpanded}
        item={item}
        onBringToFront={onBringToFront}
        onCardHeightMeasured={onCardHeightMeasured}
        onContentLayoutMeasured={onContentLayoutMeasured}
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
        onPositionUpdate={onPositionUpdate}
        onToggleExpanded={onToggleExpanded}
        repulsionOffset={repulsionOffset}
        scale={scale}
        setRootRef={setRootRef}
      />
    );
  }

  if (item.kind === "swagstack") {
    return (
      <SwagGroup
        dragDisabled={dragDisabled}
        isExpanded={isExpanded}
        item={item}
        onBringToFront={onBringToFront}
        onCardHeightMeasured={onCardHeightMeasured}
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
        onPositionUpdate={onPositionUpdate}
        onToggleExpanded={onToggleExpanded}
        repulsionOffset={repulsionOffset}
        scale={scale}
        setRootRef={setRootRef}
      />
    );
  }

  // item.kind === "stack"
  return (
    <CardStack
      cardRepulsionOffsets={cardRepulsionOffsets}
      dragDisabled={dragDisabled}
      isExpanded={isExpanded}
      onActivateCard={onActivateCard}
      onBringToFront={onBringToFront}
      onCardHeightMeasured={onCardHeightMeasured}
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
      onPageChange={onPageChange}
      onPositionUpdate={onPositionUpdate}
      onToggleExpanded={onToggleExpanded}
      page={page}
      repulsionOffset={repulsionOffset}
      scale={scale}
      setRootRef={setRootRef}
      stack={item}
    />
  );
};

const CanvasItemRendererComponent = (props: CanvasItemRendererProps) => {
  const { entranceDelay = 0, entranceStarted = true, item, itemIndex } = props;
  const origin = getEntranceOrigin(item);
  return (
    // The entrance moves this wrapper, never the item, so it composes with
    // the item's own drag, repulsion and focus transforms.
    <div
      className="canvas-entrance-item"
      style={
        {
          "--entrance-delay": `${entranceDelay}ms`,
          // Neighbours lean opposite ways, like cards dealt by hand.
          "--entrance-tilt": itemIndex % 2 === 0 ? "-1.5deg" : "1.5deg",
          transformOrigin: `${origin.x}px ${origin.y}px`,
          zIndex: item.zIndex,
        } as CSSProperties
      }
    >
      <ItemEntranceContext.Provider
        value={{ delayMs: entranceDelay, started: entranceStarted }}
      >
        <CanvasItemContent {...props} />
      </ItemEntranceContext.Provider>
    </div>
  );
};

export const CanvasItemRenderer = memo(CanvasItemRendererComponent);
