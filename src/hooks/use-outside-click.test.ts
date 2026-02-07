import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOutsideClick } from "./use-outside-click";

describe("useOutsideClick", () => {
  let onClickOutsideMock: () => void;
  let container: HTMLDivElement;
  let excludedElement: HTMLDivElement;
  let outsideElement: HTMLDivElement;

  beforeEach(() => {
    onClickOutsideMock = vi.fn();
    container = document.createElement("div");
    container.setAttribute("data-testid", "container");
    excludedElement = document.createElement("div");
    excludedElement.setAttribute("data-no-collapse", "");
    outsideElement = document.createElement("div");
    outsideElement.setAttribute("data-testid", "outside");
    document.body.appendChild(container);
    document.body.appendChild(excludedElement);
    document.body.appendChild(outsideElement);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("does not call onClickOutside when isActive is false", () => {
    renderHook(() =>
      useOutsideClick({
        isActive: false,
        onClickOutside: onClickOutsideMock,
      })
    );

    // Simulate click on outside element
    const downEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    outsideElement.dispatchEvent(downEvent);

    const upEvent = new PointerEvent("pointerup", {
      bubbles: true,
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    document.dispatchEvent(upEvent);

    expect(onClickOutsideMock).not.toHaveBeenCalled();
  });

  it("calls onClickOutside when clicking outside the element", () => {
    renderHook(() =>
      useOutsideClick({
        isActive: true,
        onClickOutside: onClickOutsideMock,
      })
    );

    // Simulate click on outside element
    const downEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    outsideElement.dispatchEvent(downEvent);

    const upEvent = new PointerEvent("pointerup", {
      bubbles: true,
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    document.dispatchEvent(upEvent);

    expect(onClickOutsideMock).toHaveBeenCalledTimes(1);
  });

  it("does not call onClickOutside when clicking on excluded selector", () => {
    renderHook(() =>
      useOutsideClick({
        isActive: true,
        onClickOutside: onClickOutsideMock,
        excludedSelectors: ["[data-no-collapse]"],
      })
    );

    // Simulate click on excluded element
    const downEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    excludedElement.dispatchEvent(downEvent);

    const upEvent = new PointerEvent("pointerup", {
      bubbles: true,
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    document.dispatchEvent(upEvent);

    expect(onClickOutsideMock).not.toHaveBeenCalled();
  });

  it("does not call onClickOutside for non-primary mouse button", () => {
    renderHook(() =>
      useOutsideClick({
        isActive: true,
        onClickOutside: onClickOutsideMock,
      })
    );

    // Simulate right-click (button 2)
    const downEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      button: 2,
      clientX: 0,
      clientY: 0,
    });
    outsideElement.dispatchEvent(downEvent);

    const upEvent = new PointerEvent("pointerup", {
      bubbles: true,
      button: 2,
      clientX: 0,
      clientY: 0,
    });
    document.dispatchEvent(upEvent);

    expect(onClickOutsideMock).not.toHaveBeenCalled();
  });

  it("does not call onClickOutside when movement exceeds threshold", () => {
    renderHook(() =>
      useOutsideClick({
        isActive: true,
        onClickOutside: onClickOutsideMock,
        moveThreshold: 5,
      })
    );

    // Start at (0, 0)
    const downEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    outsideElement.dispatchEvent(downEvent);

    // End at (10, 0) - moved 10px, exceeds threshold of 5
    const upEvent = new PointerEvent("pointerup", {
      bubbles: true,
      button: 0,
      clientX: 10,
      clientY: 0,
    });
    document.dispatchEvent(upEvent);

    expect(onClickOutsideMock).not.toHaveBeenCalled();
  });

  it("calls onClickOutside when movement is below threshold", () => {
    renderHook(() =>
      useOutsideClick({
        isActive: true,
        onClickOutside: onClickOutsideMock,
        moveThreshold: 10,
      })
    );

    // Start at (0, 0)
    const downEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    outsideElement.dispatchEvent(downEvent);

    // End at (5, 0) - moved 5px, below threshold of 10
    const upEvent = new PointerEvent("pointerup", {
      bubbles: true,
      button: 0,
      clientX: 5,
      clientY: 0,
    });
    document.dispatchEvent(upEvent);

    expect(onClickOutsideMock).toHaveBeenCalledTimes(1);
  });

  it("calls onClickOutside on pointercancel event", () => {
    renderHook(() =>
      useOutsideClick({
        isActive: true,
        onClickOutside: onClickOutsideMock,
      })
    );

    // Start at (0, 0)
    const downEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    outsideElement.dispatchEvent(downEvent);

    // Cancel the pointer
    const cancelEvent = new PointerEvent("pointercancel", {
      bubbles: true,
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    document.dispatchEvent(cancelEvent);

    expect(onClickOutsideMock).toHaveBeenCalledTimes(1);
  });

  it("removes listeners when isActive changes to false", () => {
    const { rerender } = renderHook(
      ({ isActive }) =>
        useOutsideClick({
          isActive,
          onClickOutside: onClickOutsideMock,
        }),
      { initialProps: { isActive: true } }
    );

    // Deactivate
    rerender({ isActive: false });

    // Simulate click - should not trigger
    const downEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    outsideElement.dispatchEvent(downEvent);

    const upEvent = new PointerEvent("pointerup", {
      bubbles: true,
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    document.dispatchEvent(upEvent);

    expect(onClickOutsideMock).not.toHaveBeenCalled();
  });

  it("removes listeners on unmount", () => {
    const { unmount } = renderHook(() =>
      useOutsideClick({
        isActive: true,
        onClickOutside: onClickOutsideMock,
      })
    );

    unmount();

    // Simulate click after unmount - should not trigger
    const downEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    outsideElement.dispatchEvent(downEvent);

    const upEvent = new PointerEvent("pointerup", {
      bubbles: true,
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    document.dispatchEvent(upEvent);

    expect(onClickOutsideMock).not.toHaveBeenCalled();
  });

  it("uses default move threshold when not specified", () => {
    renderHook(() =>
      useOutsideClick({
        isActive: true,
        onClickOutside: onClickOutsideMock,
      })
    );

    // Start at (0, 0)
    const downEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    outsideElement.dispatchEvent(downEvent);

    // End at (5, 0) - moved 5px, below default threshold of 6
    const upEvent = new PointerEvent("pointerup", {
      bubbles: true,
      button: 0,
      clientX: 5,
      clientY: 0,
    });
    document.dispatchEvent(upEvent);

    expect(onClickOutsideMock).toHaveBeenCalledTimes(1);
  });

  it("uses default excluded selectors when not specified", () => {
    renderHook(() =>
      useOutsideClick({
        isActive: true,
        onClickOutside: onClickOutsideMock,
      })
    );

    // Simulate click on excluded element (data-no-collapse is default)
    const downEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    excludedElement.dispatchEvent(downEvent);

    const upEvent = new PointerEvent("pointerup", {
      bubbles: true,
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    document.dispatchEvent(upEvent);

    expect(onClickOutsideMock).not.toHaveBeenCalled();
  });
});
