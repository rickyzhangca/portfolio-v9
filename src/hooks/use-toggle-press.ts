import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useRef,
} from "react";

const CLICK_MOVE_THRESHOLD_PX = 6;

/**
 * Handlers that turn a press on a draggable cover into a toggle: a pointer that
 * barely moves is a tap, anything further was a pan or a drag, and Enter or
 * Space on the focused cover toggles it for keyboard users.
 */
export const useTogglePress = (onToggle: () => void) => {
  const pressRef = useRef<{ clientX: number; clientY: number } | null>(null);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (
        event.target === event.currentTarget &&
        (event.key === "Enter" || event.key === " ")
      ) {
        event.preventDefault();
        onToggle();
      }
    },
    [onToggle]
  );

  const onPointerCancel = useCallback(() => {
    pressRef.current = null;
  }, []);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest(".no-drag") || event.button !== 0) {
      pressRef.current = null;
      return;
    }
    pressRef.current = { clientX: event.clientX, clientY: event.clientY };
  }, []);

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const start = pressRef.current;
      pressRef.current = null;
      if (!start) {
        return;
      }
      const moved = Math.hypot(
        event.clientX - start.clientX,
        event.clientY - start.clientY
      );
      if (moved < CLICK_MOVE_THRESHOLD_PX) {
        onToggle();
      }
    },
    [onToggle]
  );

  return { onKeyDown, onPointerCancel, onPointerDown, onPointerUp };
};
