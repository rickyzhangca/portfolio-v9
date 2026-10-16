import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCanvasEntrance } from "./use-canvas-entrance";

const DURATION_MS = 900;

const createRoot = (image?: HTMLImageElement) => {
  const root = document.createElement("div");
  if (image) {
    vi.spyOn(image, "getBoundingClientRect").mockReturnValue(
      new DOMRect(10, 10, 100, 100)
    );
    root.append(image);
  }
  return { current: root };
};

const flush = async (ms = 0) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe("useCanvasEntrance", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", (callback: () => void) =>
      setTimeout(callback, 0)
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("holds the scene until visible images decode, then plays and settles", async () => {
    const image = document.createElement("img");
    let decoded: () => void = () => undefined;
    image.decode = () =>
      new Promise<void>((resolve) => {
        decoded = resolve;
      });
    const { result } = renderHook(() =>
      useCanvasEntrance(createRoot(image), DURATION_MS)
    );

    await flush(100);
    expect(result.current).toBe("waiting");

    decoded();
    await flush(50);
    expect(result.current).toBe("playing");

    await flush(DURATION_MS);
    expect(result.current).toBe("done");
  });

  it("plays anyway when the first view takes too long", async () => {
    const image = document.createElement("img");
    image.decode = () => new Promise<void>(() => undefined);
    const { result } = renderHook(() =>
      useCanvasEntrance(createRoot(image), DURATION_MS)
    );

    await flush(1000);
    expect(result.current).toBe("waiting");
    await flush(300);
    expect(result.current).toBe("playing");
  });

  it("does not hold the scene when an image fails to decode", async () => {
    const image = document.createElement("img");
    image.decode = () => Promise.reject(new Error("broken"));
    const { result } = renderHook(() =>
      useCanvasEntrance(createRoot(image), DURATION_MS)
    );

    await flush(50);
    expect(result.current).toBe("playing");
  });
});
