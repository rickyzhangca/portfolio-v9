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

  // RAF-throttle drag offset updates
  const rafRef = useRef<number | null>(null);
  const pendingOffsetRef = useRef<Position | null>(null);

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
      pendingOffsetRef.current = null;

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

      // Store in ref and RAF-throttle state updates
      pendingOffsetRef.current = { x: deltaX, y: deltaY };
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          const pending = pendingOffsetRef.current;
          if (pending) {
            setDragOffset(pending);
          }
          rafRef.current = null;
        });
      }
    },
    [isDragging, scale, clickThreshold]
  );

  const handleMouseUp = useCallback(() => {
    // Cancel any pending RAF update
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (isDragging && dragStartPos.current) {
      setIsDragging(false);

      // Use pending offset if available, otherwise use current dragOffset
      const finalOffset = pendingOffsetRef.current ?? dragOffset;

      // Calculate final position
      const finalPosition = {
        x: position.x + finalOffset.x,
        y: position.y + finalOffset.y,
      };

      // Reset offset
      setDragOffset({ x: 0, y: 0 });
      dragStartPos.current = null;
      pendingOffsetRef.current = null;

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
    // Expose current position for Framer Motion animation during resets
    currentPosition: {
      x: position.x + dragOffset.x,
      y: position.y + dragOffset.y,
    },
  };
};
