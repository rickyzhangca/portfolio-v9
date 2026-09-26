import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockMouseEvent as createRawMouseEvent,
  createMockTouchEvent as createRawTouchEvent,
} from "@/test-utils/test-helpers";
import { useDraggable } from "./use-draggable";

let nextRafId = 1;
const rafCallbacks = new Map<number, FrameRequestCallback>();

const flushRaf = () => {
  const callbacks = Array.from(rafCallbacks.values());
  rafCallbacks.clear();
  for (const callback of callbacks) {
    callback(0);
  }
};

const createMockMouseEvent = (
  x: number,
  y: number,
  clientX: number,
  clientY: number
) =>
  ({
    ...createRawMouseEvent(x, y, clientX, clientY),
    button: 0,
  }) as React.MouseEvent;

const createMockTouchEvent = (
  touches: Array<{ clientX: number; clientY: number }>
) => {
  const identifiedTouches = touches.map((touch, identifier) => ({
    ...touch,
    identifier,
  }));
  return {
    ...createRawTouchEvent(identifiedTouches),
    changedTouches: identifiedTouches,
  } as unknown as React.TouchEvent;
};

const createTouch = (identifier: number, clientX: number, clientY: number) =>
  ({ identifier, clientX, clientY }) as Touch;

const createTouchStartEvent = (touches: Touch[], changedTouches = touches) =>
  ({
    touches,
    changedTouches,
    target: { closest: () => null },
    stopPropagation: vi.fn(),
  }) as unknown as React.TouchEvent;

const dispatchTouchEvent = (
  type: string,
  touches: Touch[],
  changedTouches: Touch[]
) => {
  const event = new Event(type);
  Object.defineProperties(event, {
    changedTouches: { value: changedTouches },
    touches: { value: touches },
  });
  window.dispatchEvent(event);
};

describe("useDraggable", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    nextRafId = 1;
    rafCallbacks.clear();

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      const id = nextRafId++;
      rafCallbacks.set(id, callback);
      return id;
    });

    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      rafCallbacks.delete(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with dragging state false", () => {
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
      })
    );

    expect(result.current.isDragging).toBe(false);
    expect(result.current.currentPosition).toEqual({ x: 0, y: 0 });
    expect(result.current.didDragRef.current).toBe(false);
  });

  it("does not start drag when disabled", () => {
    const onDragStart = vi.fn();
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
        disabled: true,
        onDragStart,
      })
    );

    act(() => {
      result.current.handleMouseDown(createMockMouseEvent(0, 0, 100, 100));
    });

    expect(result.current.isDragging).toBe(false);
    expect(onDragStart).not.toHaveBeenCalled();
  });

  it("starts drag on mouse down", () => {
    const onDragStart = vi.fn();
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
        onDragStart,
      })
    );

    act(() => {
      result.current.handleMouseDown(createMockMouseEvent(0, 0, 100, 100));
    });

    expect(result.current.isDragging).toBe(true);
    expect(onDragStart).toHaveBeenCalled();
  });

  it("does not start drag when target has no-drag class", () => {
    const onDragStart = vi.fn();
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
        onDragStart,
      })
    );

    const mockEvent = {
      ...createMockMouseEvent(0, 0, 100, 100),
      target: {
        closest: (sel: string) =>
          sel === ".no-drag" ? document.createElement("div") : null,
      },
      stopPropagation: vi.fn(),
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleMouseDown(mockEvent);
    });

    expect(result.current.isDragging).toBe(false);
    expect(onDragStart).not.toHaveBeenCalled();
  });

  it("updates drag offset on mouse move", () => {
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
      })
    );

    act(() => {
      result.current.handleMouseDown(createMockMouseEvent(0, 0, 100, 100));
    });

    act(() => {
      const moveEvent = new MouseEvent("mousemove", {
        clientX: 150,
        clientY: 150,
      });
      window.dispatchEvent(moveEvent);
    });

    act(() => {
      flushRaf();
    });

    expect(result.current.currentPosition.x).toBe(50);
    expect(result.current.currentPosition.y).toBe(50);
  });

  it("compensates drag by scale factor", () => {
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 2,
      })
    );

    act(() => {
      result.current.handleMouseDown(createMockMouseEvent(0, 0, 100, 100));
    });

    act(() => {
      const moveEvent = new MouseEvent("mousemove", {
        clientX: 200,
        clientY: 200,
      });
      window.dispatchEvent(moveEvent);
    });

    act(() => {
      flushRaf();
    });

    expect(result.current.currentPosition.x).toBe(50);
    expect(result.current.currentPosition.y).toBe(50);
  });

  it("calls onDragEnd with final position on mouse up", () => {
    const onDragEnd = vi.fn();
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
        onDragEnd,
      })
    );

    act(() => {
      result.current.handleMouseDown(createMockMouseEvent(0, 0, 100, 100));
    });

    act(() => {
      const moveEvent = new MouseEvent("mousemove", {
        clientX: 150,
        clientY: 150,
      });
      window.dispatchEvent(moveEvent);
    });

    act(() => {
      const upEvent = new MouseEvent("mouseup");
      window.dispatchEvent(upEvent);
    });

    expect(onDragEnd).toHaveBeenCalledWith({ x: 50, y: 50 });
  });

  it("respects custom click threshold", () => {
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
        clickThreshold: 20,
      })
    );

    act(() => {
      result.current.handleMouseDown(createMockMouseEvent(0, 0, 100, 100));
    });

    act(() => {
      const moveEvent = new MouseEvent("mousemove", {
        clientX: 110,
        clientY: 100,
      });
      window.dispatchEvent(moveEvent);
    });

    expect(result.current.didDragRef.current).toBe(false);
  });

  it("marks as dragged when movement exceeds threshold", () => {
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
        clickThreshold: 6,
      })
    );

    act(() => {
      result.current.handleMouseDown(createMockMouseEvent(0, 0, 100, 100));
    });

    act(() => {
      const moveEvent = new MouseEvent("mousemove", {
        clientX: 110,
        clientY: 100,
      });
      window.dispatchEvent(moveEvent);
    });

    expect(result.current.didDragRef.current).toBe(true);
  });

  it("handles touch events", () => {
    const onDragStart = vi.fn();
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
        onDragStart,
      })
    );

    act(() => {
      result.current.handleMouseDown(
        createMockTouchEvent([{ clientX: 100, clientY: 100 }])
      );
    });

    expect(result.current.isDragging).toBe(true);
    expect(onDragStart).toHaveBeenCalled();
  });

  it("cleans up event listeners on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const { result, unmount } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
      })
    );

    act(() => {
      result.current.handleMouseDown(createMockMouseEvent(0, 0, 100, 100));
    });

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalled();
  });

  it("does not update position when not dragging", () => {
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 100, y: 100 },
        scale: 1,
      })
    );

    act(() => {
      const moveEvent = new MouseEvent("mousemove", {
        clientX: 200,
        clientY: 200,
      });
      window.dispatchEvent(moveEvent);
    });

    expect(result.current.currentPosition).toEqual({ x: 100, y: 100 });
  });

  it("calculates drag delta correctly with negative movement", () => {
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 100, y: 100 },
        scale: 1,
      })
    );

    act(() => {
      result.current.handleMouseDown(createMockMouseEvent(0, 0, 200, 200));
    });

    act(() => {
      const moveEvent = new MouseEvent("mousemove", {
        clientX: 150,
        clientY: 150,
      });
      window.dispatchEvent(moveEvent);
    });

    act(() => {
      flushRaf();
    });

    expect(result.current.currentPosition.x).toBe(50);
    expect(result.current.currentPosition.y).toBe(50);
  });

  it("handles diagonal movement", () => {
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
      })
    );

    act(() => {
      result.current.handleMouseDown(createMockMouseEvent(0, 0, 100, 100));
    });

    act(() => {
      const moveEvent = new MouseEvent("mousemove", {
        clientX: 130,
        clientY: 140,
      });
      window.dispatchEvent(moveEvent);
    });

    act(() => {
      flushRaf();
    });

    expect(result.current.currentPosition.x).toBe(30);
    expect(result.current.currentPosition.y).toBe(40);
  });

  it("does not update onDragEnd when not dragging", () => {
    const onDragEnd = vi.fn();
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
        onDragEnd,
      })
    );

    act(() => {
      const upEvent = new MouseEvent("mouseup");
      window.dispatchEvent(upEvent);
    });

    expect(onDragEnd).not.toHaveBeenCalled();
    expect(result.current.isDragging).toBe(false);
  });

  it("resets drag offset after drag ends", () => {
    const onDragEnd = vi.fn();
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
        onDragEnd,
      })
    );

    act(() => {
      result.current.handleMouseDown(createMockMouseEvent(0, 0, 100, 100));
    });

    act(() => {
      const moveEvent = new MouseEvent("mousemove", {
        clientX: 150,
        clientY: 150,
      });
      window.dispatchEvent(moveEvent);
    });

    act(() => {
      flushRaf();
    });

    expect(result.current.currentPosition).toEqual({ x: 50, y: 50 });

    act(() => {
      const upEvent = new MouseEvent("mouseup");
      window.dispatchEvent(upEvent);
    });

    expect(onDragEnd).toHaveBeenCalled();
  });

  it("handles touch move events", () => {
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
      })
    );

    act(() => {
      result.current.handleMouseDown(
        createMockTouchEvent([{ clientX: 100, clientY: 100 }])
      );
    });

    act(() => {
      const touchMoveEvent = new TouchEvent("touchmove", {
        touches: [
          { identifier: 0, clientX: 150, clientY: 150 } as unknown as Touch,
        ],
      } as TouchEventInit);
      window.dispatchEvent(touchMoveEvent);
    });

    act(() => {
      flushRaf();
    });

    expect(result.current.currentPosition.x).toBe(50);
  });

  it("handles touch end events", () => {
    const onDragEnd = vi.fn();
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
        onDragEnd,
      })
    );

    act(() => {
      result.current.handleMouseDown(
        createMockTouchEvent([{ clientX: 100, clientY: 100 }])
      );
    });

    act(() => {
      const touchEndEvent = new TouchEvent("touchend");
      window.dispatchEvent(touchEndEvent);
    });

    expect(onDragEnd).toHaveBeenCalled();
  });

  it("ignores a non-primary mouse button", () => {
    const onDragStart = vi.fn();
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
        onDragStart,
      })
    );
    const secondaryButtonEvent = {
      ...createMockMouseEvent(0, 0, 100, 100),
      button: 2,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleMouseDown(secondaryButtonEvent);
    });

    expect(result.current.isDragging).toBe(false);
    expect(onDragStart).not.toHaveBeenCalled();
  });

  it("uses the latest callback and position when ending a drag", () => {
    const oldOnDragEnd = vi.fn();
    const latestOnDragEnd = vi.fn();
    const { result, rerender } = renderHook(
      ({ position, onDragEnd }) =>
        useDraggable({ position, scale: 1, onDragEnd }),
      {
        initialProps: {
          position: { x: 0, y: 0 },
          onDragEnd: oldOnDragEnd,
        },
      }
    );

    act(() => {
      result.current.handleMouseDown(createMockMouseEvent(0, 0, 100, 100));
    });
    act(() => {
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 110, clientY: 100 })
      );
      flushRaf();
    });

    rerender({
      position: { x: 50, y: 25 },
      onDragEnd: latestOnDragEnd,
    });
    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup"));
    });

    expect(oldOnDragEnd).not.toHaveBeenCalled();
    expect(latestOnDragEnd).toHaveBeenCalledWith({ x: 60, y: 25 });
  });

  it("uses pending movement and cancels RAF when a drag ends", () => {
    const onDragEnd = vi.fn();
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 3, y: 4 },
        scale: 1,
        onDragEnd,
      })
    );

    act(() => {
      result.current.handleMouseDown(createMockMouseEvent(0, 0, 100, 100));
    });
    act(() => {
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 120, clientY: 115 })
      );
    });
    expect(rafCallbacks.size).toBe(1);

    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup"));
    });

    expect(onDragEnd).toHaveBeenCalledTimes(1);
    expect(onDragEnd).toHaveBeenCalledWith({ x: 23, y: 19 });
    expect(rafCallbacks.size).toBe(0);
  });

  it("tracks the active touch and ignores unrelated touchend events", () => {
    const onDragEnd = vi.fn();
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
        onDragEnd,
      })
    );

    act(() => {
      result.current.handleMouseDown(
        createTouchStartEvent([createTouch(7, 100, 100)])
      );
    });
    act(() => {
      dispatchTouchEvent(
        "touchmove",
        [createTouch(8, 800, 800), createTouch(7, 120, 115)],
        [createTouch(7, 120, 115)]
      );
      flushRaf();
    });
    expect(result.current.currentPosition).toEqual({ x: 20, y: 15 });

    act(() => {
      dispatchTouchEvent(
        "touchend",
        [createTouch(7, 120, 115)],
        [createTouch(8, 800, 800)]
      );
    });
    expect(result.current.isDragging).toBe(true);
    expect(onDragEnd).not.toHaveBeenCalled();

    act(() => {
      dispatchTouchEvent("touchend", [], [createTouch(7, 120, 115)]);
    });
    expect(result.current.isDragging).toBe(false);
    expect(onDragEnd).toHaveBeenCalledWith({ x: 20, y: 15 });
  });

  it("finishes touchcancel once and suppresses click activation", () => {
    const onDragEnd = vi.fn();
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
        onDragEnd,
      })
    );

    act(() => {
      result.current.handleMouseDown(
        createTouchStartEvent([createTouch(3, 100, 100)])
      );
    });
    act(() => {
      dispatchTouchEvent(
        "touchmove",
        [createTouch(3, 105, 100)],
        [createTouch(3, 105, 100)]
      );
    });
    act(() => {
      dispatchTouchEvent("touchcancel", [], [createTouch(3, 105, 100)]);
      dispatchTouchEvent("touchend", [], [createTouch(3, 105, 100)]);
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.didDragRef.current).toBe(true);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
    expect(onDragEnd).toHaveBeenCalledWith({ x: 5, y: 0 });
  });

  it("finishes an active drag on window blur", () => {
    const onDragEnd = vi.fn();
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
        onDragEnd,
      })
    );

    act(() => {
      result.current.handleMouseDown(createMockMouseEvent(0, 0, 100, 100));
    });
    act(() => {
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 110, clientY: 100 })
      );
      window.dispatchEvent(new Event("blur"));
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.didDragRef.current).toBe(true);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
    expect(onDragEnd).toHaveBeenCalledWith({ x: 10, y: 0 });
  });

  it("finishes a touch drag on window blur", () => {
    const onDragEnd = vi.fn();
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
        onDragEnd,
      })
    );

    act(() => {
      result.current.handleMouseDown(
        createTouchStartEvent([createTouch(12, 100, 100)])
      );
    });
    act(() => {
      dispatchTouchEvent(
        "touchmove",
        [createTouch(12, 110, 100)],
        [createTouch(12, 110, 100)]
      );
      window.dispatchEvent(new Event("blur"));
    });

    expect(result.current.isDragging).toBe(false);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
    expect(onDragEnd).toHaveBeenCalledWith({ x: 10, y: 0 });
  });

  it("keeps global listeners stable while RAF updates drag position", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const { result } = renderHook(() =>
      useDraggable({
        position: { x: 0, y: 0 },
        scale: 1,
      })
    );

    act(() => {
      result.current.handleMouseDown(createMockMouseEvent(0, 0, 100, 100));
    });
    act(() => {
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 120, clientY: 100 })
      );
      flushRaf();
    });

    expect(
      addEventListenerSpy.mock.calls.filter(([type]) => type === "mousemove")
    ).toHaveLength(1);
    expect(
      removeEventListenerSpy.mock.calls.filter(([type]) => type === "mousemove")
    ).toHaveLength(0);
  });

  it("finishes safely when disabled mid-drag without enabling a click", () => {
    const onDragEnd = vi.fn();
    const { result, rerender } = renderHook(
      ({ disabled }) =>
        useDraggable({
          position: { x: 2, y: 3 },
          scale: 1,
          disabled,
          onDragEnd,
        }),
      { initialProps: { disabled: false } }
    );

    act(() => {
      result.current.handleMouseDown(createMockMouseEvent(0, 0, 100, 100));
    });
    act(() => {
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 115, clientY: 100 })
      );
    });
    rerender({ disabled: true });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.didDragRef.current).toBe(true);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
    expect(onDragEnd).toHaveBeenCalledWith({ x: 17, y: 3 });

    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup"));
    });
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });

  it("cancels pending RAF and finishes once when unmounted", () => {
    const onDragEnd = vi.fn();
    const { result, unmount } = renderHook(() =>
      useDraggable({
        position: { x: 4, y: 6 },
        scale: 1,
        onDragEnd,
      })
    );

    act(() => {
      result.current.handleMouseDown(createMockMouseEvent(0, 0, 100, 100));
    });
    act(() => {
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 125, clientY: 118 })
      );
    });
    expect(rafCallbacks.size).toBe(1);

    unmount();

    expect(rafCallbacks.size).toBe(0);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
    expect(onDragEnd).toHaveBeenCalledWith({ x: 29, y: 24 });
    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup"));
      flushRaf();
    });
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });

  it("does not finish twice after normal end and StrictMode unmount", () => {
    const onDragEnd = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(StrictMode, null, children);
    const { result, unmount } = renderHook(
      () =>
        useDraggable({
          position: { x: 0, y: 0 },
          scale: 1,
          onDragEnd,
        }),
      { wrapper }
    );

    act(() => {
      result.current.handleMouseDown(createMockMouseEvent(0, 0, 100, 100));
    });
    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup"));
    });
    expect(onDragEnd).toHaveBeenCalledTimes(1);

    unmount();
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });
});
