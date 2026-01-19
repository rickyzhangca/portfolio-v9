import type { CanvasItem, Position } from "@/types/canvas";
import { CardStack } from "@/components/groups/card-group";
import { SingleCardItem } from "@/components/canvas/single-card-item";

interface CanvasItemProps {
  item: CanvasItem;
  itemIndex: number;
  scale: number;
  isExpanded: boolean;
  dragDisabled: boolean;
  repulsionOffset: Position;
  onBringToFront: () => void;
  onToggleExpanded: () => void;
  onPositionUpdate: (position: Position) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onCardHeightMeasured?: (cardId: string, height: number) => void;
  onDocClick?: () => void;
  setRootRef?: (el: HTMLDivElement | null) => void;
}

export function CanvasItem({
  item,
  itemIndex,
  scale,
  isExpanded,
  dragDisabled,
  repulsionOffset,
  onBringToFront,
  onToggleExpanded,
  onPositionUpdate,
  onDragStart,
  onDragEnd,
  onCardHeightMeasured,
  onDocClick,
  setRootRef,
}: CanvasItemProps) {
  if (item.kind === "single") {
    return (
      <SingleCardItem
        dragDisabled={dragDisabled}
        item={item}
        scale={scale}
        repulsionOffset={repulsionOffset}
        onBringToFront={onBringToFront}
        onPositionUpdate={onPositionUpdate}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onCardHeightMeasured={onCardHeightMeasured}
        onDocClick={onDocClick}
        setRootRef={setRootRef}
      />
    );
  }

  // item.kind === "stack"
  return (
    <CardStack
      dragDisabled={dragDisabled}
      isExpanded={isExpanded}
      stack={item}
      stackIndex={itemIndex}
      scale={scale}
      repulsionOffset={repulsionOffset}
      onBringToFront={onBringToFront}
      onToggleExpanded={onToggleExpanded}
      onPositionUpdate={onPositionUpdate}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onCardHeightMeasured={onCardHeightMeasured}
      setRootRef={setRootRef}
    />
  );
}
