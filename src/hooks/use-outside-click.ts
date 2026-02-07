import { useEffect, useRef } from "react";

interface UseOutsideClickOptions {
  isActive: boolean;
  onClickOutside: () => void;
  excludedSelectors?: string[];
  moveThreshold?: number;
}

/**
 * Hook to detect clicks outside an element while filtering out drag gestures.
 * Uses pointer events for consistent cross-device behavior.
 */
export const useOutsideClick = ({
  isActive,
  onClickOutside,
  excludedSelectors = ["[data-no-collapse]"],
  moveThreshold = 6,
}: UseOutsideClickOptions) => {
  const pointerDownRef = useRef<{
    clientX: number;
    clientY: number;
    startedOutside: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        pointerDownRef.current = null;
        return;
      }

      const target = event.target as Element | null;
      if (!target) {
        return;
      }

      // Check if target matches any excluded selectors
      const isExcluded = excludedSelectors.some((selector) =>
        target.closest(selector)
      );
      if (isExcluded) {
        pointerDownRef.current = null;
        return;
      }

      pointerDownRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        startedOutside: true,
      };
    };

    const onPointerUp = (event: PointerEvent) => {
      const start = pointerDownRef.current;
      pointerDownRef.current = null;

      if (!start?.startedOutside) {
        return;
      }

      const moved = Math.hypot(
        event.clientX - start.clientX,
        event.clientY - start.clientY
      );

      if (moved < moveThreshold) {
        onClickOutside();
      }
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerUp, true);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerUp, true);
    };
  }, [isActive, onClickOutside, excludedSelectors, moveThreshold]);
};
