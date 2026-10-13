import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isSyntheticMouseEvent,
  SYNTHETIC_MOUSE_WINDOW_MS,
  useCoarsePointer,
  useIgnoreSyntheticMouseEvents,
} from "./use-touch-input";

const mouseEvent = (
  type: string,
  sourceCapabilities?: { firesTouchEvents: boolean } | null
) => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "sourceCapabilities", {
    value: sourceCapabilities,
  });
  return event;
};

const pointerEvent = (type: string, pointerType: string, pointerId = 1) => {
  const event = new Event(type, { bubbles: true }) as PointerEvent;
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: pointerType },
  });
  return event;
};

describe("isSyntheticMouseEvent", () => {
  const idle = { activePointers: 0, lastTouchEndAt: Number.NEGATIVE_INFINITY };

  it("trusts the browser's own label when it provides one", () => {
    expect(
      isSyntheticMouseEvent(
        mouseEvent("mousedown", { firesTouchEvents: true }),
        idle
      )
    ).toBe(true);
    expect(
      isSyntheticMouseEvent(
        mouseEvent("mousedown", { firesTouchEvents: false }),
        { activePointers: 1, lastTouchEndAt: Date.now() }
      )
    ).toBe(false);
  });

  it("recognises an echo by its timing when there is no label", () => {
    const event = mouseEvent("mousedown", null);
    expect(
      isSyntheticMouseEvent(event, {
        activePointers: 0,
        lastTouchEndAt: event.timeStamp - 20,
      })
    ).toBe(true);
    expect(
      isSyntheticMouseEvent(event, {
        activePointers: 0,
        lastTouchEndAt: event.timeStamp - SYNTHETIC_MOUSE_WINDOW_MS - 1,
      })
    ).toBe(false);
    expect(isSyntheticMouseEvent(event, idle)).toBe(false);
  });
});

describe("useIgnoreSyntheticMouseEvents", () => {
  const reached = vi.fn();

  beforeEach(() => {
    Object.defineProperty(window, "ontouchstart", {
      configurable: true,
      value: null,
    });
    window.addEventListener("mousedown", reached);
  });
  afterEach(() => {
    window.removeEventListener("mousedown", reached);
    // biome-ignore lint/performance/noDelete: restores the absent property
    delete (window as { ontouchstart?: unknown }).ontouchstart;
    vi.clearAllMocks();
  });

  it("drops the mouse echo of a tap but not a real mouse press", () => {
    renderHook(() => useIgnoreSyntheticMouseEvents());
    window.dispatchEvent(pointerEvent("pointerdown", "touch"));
    window.dispatchEvent(pointerEvent("pointerup", "touch"));
    window.dispatchEvent(mouseEvent("mousedown"));
    expect(reached).not.toHaveBeenCalled();

    window.dispatchEvent(pointerEvent("pointerdown", "mouse", 2));
    window.dispatchEvent(mouseEvent("mousedown"));
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it("leaves mouse events alone when no touch ever happened", () => {
    renderHook(() => useIgnoreSyntheticMouseEvents());
    window.dispatchEvent(mouseEvent("mousedown"));
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it("does nothing without touch events, which the mouse echo then serves", () => {
    // biome-ignore lint/performance/noDelete: simulates a mouse-only browser
    delete (window as { ontouchstart?: unknown }).ontouchstart;
    renderHook(() => useIgnoreSyntheticMouseEvents());
    window.dispatchEvent(pointerEvent("pointerdown", "touch"));
    window.dispatchEvent(pointerEvent("pointerup", "touch"));
    window.dispatchEvent(mouseEvent("mousedown"));
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it("stops listening once unmounted", () => {
    const { unmount } = renderHook(() => useIgnoreSyntheticMouseEvents());
    unmount();
    window.dispatchEvent(pointerEvent("pointerdown", "touch"));
    window.dispatchEvent(pointerEvent("pointerup", "touch"));
    window.dispatchEvent(mouseEvent("mousedown"));
    expect(reached).toHaveBeenCalledTimes(1);
  });
});

describe("useCoarsePointer", () => {
  const originalMatchMedia = window.matchMedia;
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("follows the pointer media query", () => {
    let listener: (() => void) | undefined;
    const query = {
      addEventListener: (_: string, callback: () => void) => {
        listener = callback;
      },
      matches: false,
      removeEventListener: vi.fn(),
    };
    window.matchMedia = vi.fn(
      () => query
    ) as unknown as typeof window.matchMedia;
    const { result, rerender } = renderHook(() => useCoarsePointer());
    expect(result.current).toBe(false);
    query.matches = true;
    listener?.();
    rerender();
    expect(result.current).toBe(true);
  });
});
