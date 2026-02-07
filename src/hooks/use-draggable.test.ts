import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockMouseEvent,
  createMockTouchEvent,
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
        touches: [{ clientX: 150, clientY: 150 } as unknown as Touch],
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
});
