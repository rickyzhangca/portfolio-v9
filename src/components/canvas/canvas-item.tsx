import type { CanvasItem, Position } from "@/types/canvas";
import { CardStack } from "@/components/groups/card-group";
import { SingleCardItem } from "@/components/canvas/single-card-item";

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
        scale={scale}
        repulsionOffset={repulsionOffset}
        onBringToFront={onBringToFront}
        onPositionUpdate={onPositionUpdate}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onCardHeightMeasured={onCardHeightMeasured}
        onActivate={onActivate}
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
