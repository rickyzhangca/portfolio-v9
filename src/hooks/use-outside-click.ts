import { useEffect, useRef } from "react";

interface UseOutsideClickOptions {
  isActive: boolean;
  onClickOutside: () => void;
  getElement?: () => HTMLElement | null | undefined;
  excludedSelectors?: string[];
  moveThreshold?: number;
}

const DEFAULT_EXCLUDED_SELECTORS = ["[data-no-collapse]"];
/**
 * Hook to detect clicks outside an element while filtering out drag gestures.
 * Uses pointer events for consistent cross-device behavior.
 */
export const useOutsideClick = ({
  isActive,
  onClickOutside,
  getElement,
  excludedSelectors = DEFAULT_EXCLUDED_SELECTORS,
  moveThreshold = 6,
}: UseOutsideClickOptions) => {
  const pointerDownRef = useRef<{
    clientX: number;
    clientY: number;
    startedOutside: boolean;
    pointerId: number;
    moved: boolean;
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

      const target = event.target;
      if (!(target instanceof Element)) {
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
        startedOutside: !getElement?.()?.contains(target),
        pointerId: event.pointerId,
        moved: false,
      };
    };

    const onPointerMove = (event: PointerEvent) => {
      const start = pointerDownRef.current;
      if (start?.pointerId === event.pointerId) {
        start.moved ||=
          Math.hypot(
            event.clientX - start.clientX,
            event.clientY - start.clientY
          ) >= moveThreshold;
      }
    };
    const onPointerCancel = () => {
      pointerDownRef.current = null;
    };
    const onPointerUp = (event: PointerEvent) => {
      const start = pointerDownRef.current;
      if (start?.pointerId !== event.pointerId) {
        return;
      }
      pointerDownRef.current = null;

      if (!start?.startedOutside || start.moved) {
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
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerCancel, true);
    window.addEventListener("blur", onPointerCancel);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerCancel, true);
      window.removeEventListener("blur", onPointerCancel);
      pointerDownRef.current = null;
    };
  }, [isActive, onClickOutside, getElement, excludedSelectors, moveThreshold]);
};
