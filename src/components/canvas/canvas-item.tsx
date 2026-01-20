import { SingleCardItem } from "@/components/canvas/single-card-item";
import { CardStack } from "@/components/groups/card-group";
import { FunProjectGroup } from "@/components/groups/fun-project-group";
import type { CanvasItem, Position } from "@/types/canvas";

interface CanvasItemRendererProps {
  item: CanvasItem;
  itemIndex: number;
  scale: number;
  isExpanded: boolean;
  isFocused: boolean;
  dragDisabled: boolean;
  repulsionOffset: Position;
  onBringToFront: () => void;
  onToggleExpanded: () => void;
  onPositionUpdate: (position: Position) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onCardHeightMeasured?: (cardId: string, height: number) => void;
  onActivate?: () => void;
  setRootRef?: (el: HTMLDivElement | null) => void;
}

export function CanvasItemRenderer({
  item,
  itemIndex,
  scale,
  isExpanded,
  isFocused,
  dragDisabled,
  repulsionOffset,
  onBringToFront,
  onToggleExpanded,
  onPositionUpdate,
  onDragStart,
  onDragEnd,
  onCardHeightMeasured,
  onActivate,
  setRootRef,
}: CanvasItemRendererProps) {
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
}
