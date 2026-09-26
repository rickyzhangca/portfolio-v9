import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockCover } from "@/test-utils/test-helpers";
import { RenderCard } from "./render-card";

interface ResizeObserverMock {
  callback: ResizeObserverCallback;
  disconnect: ReturnType<typeof vi.fn>;
  observe: ReturnType<typeof vi.fn>;
}

const observers: ResizeObserverMock[] = [];
const originalResizeObserver = globalThis.ResizeObserver;

class MockResizeObserver {
  callback: ResizeObserverCallback;
  disconnect = vi.fn();
  observe = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    observers.push(this);
  }
}

describe("RenderCard measurement", () => {
  beforeEach(() => {
    observers.length = 0;
    globalThis.ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
    vi.restoreAllMocks();
  });

  it("falls back to layout height, not transformed or content-box height", () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(180);
    const onMeasure = vi.fn();
    const card = createMockCover("cover");
    card.content.image = "/cover.png";
    render(<RenderCard card={card} onMeasure={onMeasure} />);
    const entry = {
      borderBoxSize: [],
      contentRect: { height: 132 },
    } as unknown as ResizeObserverEntry;
    act(() => {
      observers[0]?.callback([entry], {} as ResizeObserver);
    });
    expect(onMeasure).toHaveBeenCalledWith(180);
  });

  it("observes once, reports a changed height once, and disconnects on cleanup", () => {
    const onMeasure = vi.fn();
    const card = createMockCover("cover-1");
    card.content.image = "/cover.png";
    const { unmount } = render(
      <RenderCard card={card} onMeasure={onMeasure} />
    );

    expect(observers).toHaveLength(1);
    expect(observers[0]?.observe).toHaveBeenCalledTimes(1);

    const entry = {
      borderBoxSize: [{ blockSize: 140 }],
    } as unknown as ResizeObserverEntry;

    act(() => {
      observers[0]?.callback([entry], {} as ResizeObserver);
    });

    expect(onMeasure).toHaveBeenCalledTimes(1);
    expect(onMeasure).toHaveBeenCalledWith(140);

    unmount();
    expect(observers[0]?.disconnect).toHaveBeenCalledTimes(1);
  });
});
