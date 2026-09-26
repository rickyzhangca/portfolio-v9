import { memo, useCallback } from "react";
import { SingleCardItem } from "@/components/canvas/single-card-item";
import { CardStack } from "@/components/groups/card-group";
import { FunProjectGroup } from "@/components/groups/fun-project-group";
import { SwagGroup } from "@/components/groups/swag-group";
import type { CanvasItem, Position } from "@/types/canvas";

interface CanvasItemRendererProps {
  item: CanvasItem;
  itemIndex: number;
  scale: number;
  isExpanded: boolean;
  isFocused: boolean;
  dragDisabled: boolean;
  repulsionOffset: Position;
  onBringToFront: (id: string) => void;
  onToggleExpanded: (id: string) => void;
  onPositionUpdate: (id: string, position: Position) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onCardHeightMeasured?: (id: string, cardId: string, height: number) => void;
  onActivate?: (id: string) => void;
  setRootRef?: (id: string, el: HTMLDivElement | null) => void;
}

const CanvasItemRendererComponent = ({
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
  onActivate: activate,
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
    () => activate?.(item.id),
    [activate, item.id]
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
      dragDisabled={dragDisabled}
      isExpanded={isExpanded}
      onBringToFront={onBringToFront}
      onCardHeightMeasured={onCardHeightMeasured}
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
      onPositionUpdate={onPositionUpdate}
      onToggleExpanded={onToggleExpanded}
      repulsionOffset={repulsionOffset}
      scale={scale}
      setRootRef={setRootRef}
      stack={item}
      stackIndex={itemIndex}
    />
  );
};

export const CanvasItemRenderer = memo(CanvasItemRendererComponent);
