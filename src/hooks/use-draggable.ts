import { useCallback, useEffect, useRef, useState } from "react";
import type { Position } from "@/types/canvas";

interface UseDraggableOptions {
  position: Position;
  scale: number;
  onDragStart?: () => void;
  onDragEnd?: (position: Position) => void;
  disabled?: boolean;
  clickThreshold?: number;
}

export const useDraggable = ({
  position,
  scale,
  onDragStart,
  onDragEnd,
  disabled = false,
  clickThreshold = 6,
}: UseDraggableOptions) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) {
        return;
      }

      // Check if the target has the "no-drag" class
      const target = e.target as HTMLElement;
      if (target.closest(".no-drag")) {
        return;
      }

      e.stopPropagation();

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      setIsDragging(true);
      setDragOffset({ x: 0, y: 0 });
      dragStartPos.current = { x: clientX, y: clientY };
      didDragRef.current = false;

      onDragStart?.();
    },
    [disabled, onDragStart]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!(isDragging && dragStartPos.current)) {
        return;
      }

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const rawDeltaX = clientX - dragStartPos.current.x;
      const rawDeltaY = clientY - dragStartPos.current.y;

      if (!didDragRef.current) {
        didDragRef.current = Math.hypot(rawDeltaX, rawDeltaY) >= clickThreshold;
      }

      // Calculate the delta movement (scale-compensated)
      const deltaX = rawDeltaX / scale;
      const deltaY = rawDeltaY / scale;

      // Update local offset (no global state update)
      setDragOffset({ x: deltaX, y: deltaY });
    },
    [isDragging, scale, clickThreshold]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragStartPos.current) {
      setIsDragging(false);

      // Calculate final position
      const finalPosition = {
        x: position.x + dragOffset.x,
        y: position.y + dragOffset.y,
      };

      // Reset offset
      setDragOffset({ x: 0, y: 0 });
      dragStartPos.current = null;

      // Only update global state once at the end
      onDragEnd?.(finalPosition);
    }
  }, [isDragging, position, dragOffset, onDragEnd]);

  // Attach global mouse/touch move and up listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleMouseMove);
      window.addEventListener("touchend", handleMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchmove", handleMouseMove);
        window.removeEventListener("touchend", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    isDragging,
    didDragRef,
    handleMouseDown,
    style: {
      // Apply base position + drag offset for smooth dragging
      // This element already lives inside the zoom/pan transformed container.
      // `scale` is only needed to convert pointer deltas (screen space) to world space.
      transform: `translate(${position.x + dragOffset.x}px, ${position.y + dragOffset.y}px)`,
    },
  };
};
