import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useEscapeKey } from "./use-escape-key";

describe("useEscapeKey", () => {
  it("calls onEscape when Escape key is pressed", () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey({ isActive: true, onEscape }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("does not call onEscape when isActive is false", () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey({ isActive: false, onEscape }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(onEscape).not.toHaveBeenCalled();
  });

  it("does not call onEscape when isLocked is true", () => {
    const onEscape = vi.fn();
    renderHook(() =>
      useEscapeKey({ isActive: true, onEscape, isLocked: true })
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(onEscape).not.toHaveBeenCalled();
  });

  it("does not call onEscape for other keys", () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey({ isActive: true, onEscape }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });

    expect(onEscape).not.toHaveBeenCalled();
  });
});
