import { act, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockFunStack,
  renderWithProviders,
} from "@/test-utils/test-helpers";
import { FunProjectGroup } from "./fun-project-group";

interface MockResizeObserverEntry {
  target: Element;
  borderBoxSize: Array<{ blockSize: number }>;
  contentRect: { height: number };
}

type ResizeObserverCallback = (entries: MockResizeObserverEntry[]) => void;

const resizeObserverCallbacks: ResizeObserverCallback[] = [];
const originalResizeObserver = globalThis.ResizeObserver;

class MockResizeObserver {
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    resizeObserverCallbacks.push(callback);
  }

  observe() {}

  disconnect() {}

  unobserve() {}
}

const baseProps = {
  scale: 1,
  dragDisabled: false,
  repulsionOffset: { x: 0, y: 0 },
  onBringToFront: vi.fn(),
  onToggleExpanded: vi.fn(),
  onPositionUpdate: vi.fn(),
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
  onCardHeightMeasured: vi.fn(),
};

describe("FunProjectGroup", () => {
  beforeEach(() => {
    resizeObserverCallbacks.length = 0;
    globalThis.ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
  });

  it("does not mount detail cards while collapsed", () => {
    const item = createMockFunStack("fun-1", 0, 0);

    renderWithProviders(
      <FunProjectGroup {...baseProps} isExpanded={false} item={item} />
    );

    expect(screen.queryByText("Test Project")).toBeNull();
  });

  it("mounts detail cards when expanded", () => {
    const item = createMockFunStack("fun-1", 0, 0);

    renderWithProviders(
      <FunProjectGroup {...baseProps} isExpanded={true} item={item} />
    );

    expect(screen.getByText("Test Project")).not.toBeNull();
  });

  it("keeps content cards hidden until measurement pass completes", async () => {
    const item = createMockFunStack("fun-1", 0, 0);

    const { container } = renderWithProviders(
      <FunProjectGroup {...baseProps} isExpanded={true} item={item} />
    );

    const contentCard = container.querySelector(
      '[data-fun-content-card-index="0"]'
    ) as HTMLDivElement | null;
    expect(contentCard).not.toBeNull();
    expect(contentCard?.style.visibility).toBe("hidden");

    act(() => {
      for (const callback of resizeObserverCallbacks) {
        callback([
          {
            target: document.createElement("div"),
            borderBoxSize: [{ blockSize: 500 }],
            contentRect: { height: 500 },
          },
        ]);
      }
    });

    await waitFor(() => {
      expect(contentCard?.style.visibility).toBe("visible");
    });
  });
});
