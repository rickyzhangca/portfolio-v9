import { useEffect, useState } from "react";

/** How long after a touch pointer ends that mouse events count as its echo. */
export const SYNTHETIC_MOUSE_WINDOW_MS = 1000;

type MouseEventWithCapabilities = MouseEvent & {
  sourceCapabilities?: { firesTouchEvents?: boolean } | null;
};

interface TouchActivity {
  activePointers: number;
  lastTouchEndAt: number;
}

/**
 * Browsers replay a tap as mousemove, mousedown and mouseup after the touch
 * ends. Chromium labels those with `sourceCapabilities`; other engines are
 * recognised by arriving shortly after a touch or pen pointer.
 */
export const isSyntheticMouseEvent = (
  event: MouseEventWithCapabilities,
  { activePointers, lastTouchEndAt }: TouchActivity
) => {
  const firesTouchEvents = event.sourceCapabilities?.firesTouchEvents;
  if (typeof firesTouchEvents === "boolean") {
    return firesTouchEvents;
  }
  return (
    activePointers > 0 ||
    event.timeStamp - lastTouchEndAt < SYNTHETIC_MOUSE_WINDOW_MS
  );
};

/**
 * react-zoom-pan-pinch treats the replayed mousedown of a tap as a new gesture
 * and cancels whatever camera animation the tap just started. Dropping those
 * echoes before they reach the library keeps tap-driven auto-pan reliable, and
 * stops cards from starting a second drag cycle.
 */
export const useIgnoreSyntheticMouseEvents = () => {
  useEffect(() => {
    // Without touch events the drag hooks depend on the mouse echo.
    if (!("ontouchstart" in window)) {
      return;
    }
    const activity: TouchActivity = {
      activePointers: 0,
      lastTouchEndAt: Number.NEGATIVE_INFINITY,
    };
    const activePointerIds = new Set<number>();
    const trackPointer = (event: PointerEvent) => {
      if (event.pointerType === "mouse") {
        // A real mouse is in use: never swallow its events.
        activePointerIds.clear();
        activity.lastTouchEndAt = Number.NEGATIVE_INFINITY;
      } else if (event.type === "pointerdown") {
        activePointerIds.add(event.pointerId);
      } else {
        activePointerIds.delete(event.pointerId);
        activity.lastTouchEndAt = event.timeStamp;
      }
      activity.activePointers = activePointerIds.size;
    };
    const ignoreEcho = (event: MouseEvent) => {
      if (isSyntheticMouseEvent(event, activity)) {
        event.stopImmediatePropagation();
      }
    };
    const pointerEvents = [
      "pointerdown",
      "pointerup",
      "pointercancel",
    ] as const;
    const mouseEvents = ["mousedown", "mousemove", "mouseup"] as const;
    for (const type of pointerEvents) {
      window.addEventListener(type, trackPointer, true);
    }
    for (const type of mouseEvents) {
      window.addEventListener(type, ignoreEcho, true);
    }
    return () => {
      for (const type of pointerEvents) {
        window.removeEventListener(type, trackPointer, true);
      }
      for (const type of mouseEvents) {
        window.removeEventListener(type, ignoreEcho, true);
      }
    };
  }, []);
};

const COARSE_POINTER_QUERY = "(pointer: coarse)";

/** True when the primary input is a finger: swipes should pan, not drag cards. */
export const useCoarsePointer = () => {
  const [isCoarse, setIsCoarse] = useState(
    () => window.matchMedia?.(COARSE_POINTER_QUERY).matches ?? false
  );
  useEffect(() => {
    const query = window.matchMedia?.(COARSE_POINTER_QUERY);
    if (!query) {
      return;
    }
    const update = () => setIsCoarse(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return isCoarse;
};
