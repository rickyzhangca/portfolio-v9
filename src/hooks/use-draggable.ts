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

type DragInput = { type: "mouse" } | { type: "touch"; identifier: number };

const getTouchById = (touches: TouchList, identifier: number) =>
  Array.from(touches).find((touch) => touch.identifier === identifier);

const isTouchEvent = (event: MouseEvent | TouchEvent): event is TouchEvent =>
  "touches" in event;

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
  const didDragRef = useRef<boolean>(false);
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragInputRef = useRef<DragInput | null>(null);
  const dragOffsetRef = useRef<Position>({ x: 0, y: 0 });
  const pendingOffsetRef = useRef<Position | null>(null);
  const rafRef = useRef<number | null>(null);
  const latestOptionsRef = useRef({
    position,
    scale,
    onDragStart,
    onDragEnd,
    disabled,
    clickThreshold,
  });
  latestOptionsRef.current = {
    position,
    scale,
    onDragStart,
    onDragEnd,
    disabled,
    clickThreshold,
  };

  const finishDrag = useCallback(
    (suppressClick = false, updateState = true) => {
      if (!(isDraggingRef.current && dragStartPosRef.current)) {
        return;
      }

      isDraggingRef.current = false;
      const latestOptions = latestOptionsRef.current;
      const finalOffset = pendingOffsetRef.current ?? dragOffsetRef.current;
      const finalPosition = {
        x: latestOptions.position.x + finalOffset.x,
        y: latestOptions.position.y + finalOffset.y,
      };

      if (suppressClick) {
        didDragRef.current = true;
      }

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      dragStartPosRef.current = null;
      dragInputRef.current = null;
      pendingOffsetRef.current = null;
      dragOffsetRef.current = { x: 0, y: 0 };

      if (updateState) {
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
      }

      latestOptions.onDragEnd?.(finalPosition);
    },
    []
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      const latestOptions = latestOptionsRef.current;
      if (latestOptions.disabled || isDraggingRef.current) {
        return;
      }

      const target = event.target as HTMLElement;
      if (target.closest(".no-drag")) {
        return;
      }

      let input: DragInput;
      let clientX: number;
      let clientY: number;

      if ("touches" in event) {
        const touch = event.changedTouches[0] ?? event.touches[0];
        if (!touch) {
          return;
        }
        input = { type: "touch", identifier: touch.identifier };
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        if (event.button !== 0) {
          return;
        }
        input = { type: "mouse" };
        clientX = event.clientX;
        clientY = event.clientY;
      }

      event.stopPropagation();
      isDraggingRef.current = true;
      dragInputRef.current = input;
      dragStartPosRef.current = { x: clientX, y: clientY };
      didDragRef.current = false;
      pendingOffsetRef.current = null;
      dragOffsetRef.current = { x: 0, y: 0 };

      setIsDragging(true);
      setDragOffset({ x: 0, y: 0 });
      latestOptions.onDragStart?.();
    },
    []
  );

  const handleMove = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const input = dragInputRef.current;
      const startPosition = dragStartPosRef.current;
      if (!(isDraggingRef.current && input && startPosition)) {
        return;
      }

      const latestOptions = latestOptionsRef.current;
      if (latestOptions.disabled) {
        finishDrag(true);
        return;
      }

      let clientX: number;
      let clientY: number;
      if (input.type === "touch") {
        if (!isTouchEvent(event)) {
          return;
        }
        const touch = getTouchById(event.touches, input.identifier);
        if (!touch) {
          return;
        }
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        if (isTouchEvent(event)) {
          return;
        }
        clientX = event.clientX;
        clientY = event.clientY;
      }

      const rawDeltaX = clientX - startPosition.x;
      const rawDeltaY = clientY - startPosition.y;
      if (!didDragRef.current) {
        didDragRef.current =
          Math.hypot(rawDeltaX, rawDeltaY) >= latestOptions.clickThreshold;
      }

      const offset = {
        x: rawDeltaX / latestOptions.scale,
        y: rawDeltaY / latestOptions.scale,
      };
      pendingOffsetRef.current = offset;

      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          if (!isDraggingRef.current) {
            return;
          }

          const pendingOffset = pendingOffsetRef.current;
          if (pendingOffset) {
            dragOffsetRef.current = pendingOffset;
            setDragOffset(pendingOffset);
          }
        });
      }
    },
    [finishDrag]
  );

  const handleMouseUp = useCallback(() => {
    if (dragInputRef.current?.type === "mouse") {
      finishDrag();
    }
  }, [finishDrag]);

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      const input = dragInputRef.current;
      if (input?.type !== "touch") {
        return;
      }

      const changedTouches = Array.from(event.changedTouches);
      const endedActiveTouch = changedTouches.some(
        (touch) => touch.identifier === input.identifier
      );
      if (
        (changedTouches.length > 0 && !endedActiveTouch) ||
        (changedTouches.length === 0 && event.touches.length > 0)
      ) {
        return;
      }

      if (getTouchById(event.touches, input.identifier)) {
        return;
      }

      finishDrag();
    },
    [finishDrag]
  );

  const handleTouchCancel = useCallback(
    (event: TouchEvent) => {
      const input = dragInputRef.current;
      if (input?.type !== "touch") {
        return;
      }

      const changedTouches = Array.from(event.changedTouches);
      const cancelledActiveTouch = changedTouches.some(
        (touch) => touch.identifier === input.identifier
      );
      if (
        (changedTouches.length > 0 && !cancelledActiveTouch) ||
        (changedTouches.length === 0 && event.touches.length > 0)
      ) {
        return;
      }

      finishDrag(true);
    },
    [finishDrag]
  );

  const handleBlur = useCallback(() => {
    finishDrag(true);
  }, [finishDrag]);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    window.addEventListener("blur", handleBlur);
    if (dragInputRef.current?.type === "touch") {
      window.addEventListener("touchmove", handleMove);
      window.addEventListener("touchend", handleTouchEnd);
      window.addEventListener("touchcancel", handleTouchCancel);

      return () => {
        window.removeEventListener("blur", handleBlur);
        window.removeEventListener("touchmove", handleMove);
        window.removeEventListener("touchend", handleTouchEnd);
        window.removeEventListener("touchcancel", handleTouchCancel);
      };
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    handleMove,
    handleMouseUp,
    handleTouchEnd,
    handleTouchCancel,
    handleBlur,
  ]);

  useEffect(() => {
    if (disabled) {
      finishDrag(true);
    }
  }, [disabled, finishDrag]);

  useEffect(
    () => () => {
      finishDrag(true, false);
    },
    [finishDrag]
  );

  return {
    isDragging,
    didDragRef,
    handleMouseDown,
    currentPosition: {
      x: position.x + dragOffset.x,
      y: position.y + dragOffset.y,
    },
  };
};
