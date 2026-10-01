import { memo, useCallback } from "react";
import { SingleCardItem } from "@/components/canvas/single-card-item";
import { CardStack } from "@/components/groups/card-group";
import { FunProjectGroup } from "@/components/groups/fun-project-group";
import { SwagGroup } from "@/components/groups/swag-group";
import type { CanvasItem, Position } from "@/types/canvas";

interface CanvasItemRendererProps {
  cardRepulsionOffsets?: ReadonlyMap<string, Position>;
  dragDisabled: boolean;
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

const CanvasItemRendererComponent = ({
  cardRepulsionOffsets,
  item,
  itemIndex,
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
        stackIndex={itemIndex}
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
      stackIndex={itemIndex}
    />
  );
};

export const CanvasItemRenderer = memo(CanvasItemRendererComponent);
