import { act, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockFunStack,
  renderWithProviders,
} from "@/test-utils/test-helpers";

vi.mock("../markdown-renderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

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

  observe() {
    // Intentionally empty for tests.
  }

  disconnect() {
    // Intentionally empty for tests.
  }

  unobserve() {
    // Intentionally empty for tests.
  }
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
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("reports untransformed border-box heights and the exact inter-card gap", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(500);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 680, 200)
    );
    const item = createMockFunStack("fun-1");
    item.card.content.items.push({
      ...item.card.content.items[0],
      title: "Second project",
    });
    const onContentLayoutMeasured = vi.fn();
    renderWithProviders(
      <FunProjectGroup
        {...baseProps}
        isExpanded
        item={item}
        onContentLayoutMeasured={onContentLayoutMeasured}
      />
    );
    await waitFor(() => {
      expect(onContentLayoutMeasured).toHaveBeenLastCalledWith(1016);
    });
  });

  it("uses border-box layout dimensions when the observer lacks borderBoxSize", async () => {
    const offsetHeight = vi
      .spyOn(HTMLElement.prototype, "offsetHeight", "get")
      .mockReturnValue(500);
    const onContentLayoutMeasured = vi.fn();
    renderWithProviders(
      <FunProjectGroup
        {...baseProps}
        isExpanded
        item={createMockFunStack("fun-1")}
        onContentLayoutMeasured={onContentLayoutMeasured}
      />
    );
    await waitFor(() => {
      expect(onContentLayoutMeasured).toHaveBeenLastCalledWith(500);
    });
    offsetHeight.mockReturnValue(650);
    act(() => {
      for (const callback of resizeObserverCallbacks) {
        callback([
          {
            target: document.createElement("div"),
            borderBoxSize: [],
            contentRect: { height: 602 },
          },
        ]);
      }
    });
    await waitFor(() => {
      expect(onContentLayoutMeasured).toHaveBeenLastCalledWith(650);
    });
  });

  it("cancels pending layout reports when collapsed", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(500);
    const onContentLayoutMeasured = vi.fn();
    const item = createMockFunStack("fun-1");
    const { rerender } = renderWithProviders(
      <FunProjectGroup
        {...baseProps}
        isExpanded
        item={item}
        onContentLayoutMeasured={onContentLayoutMeasured}
      />
    );
    await screen.findByText("A test fun project");
    rerender(
      <FunProjectGroup
        {...baseProps}
        isExpanded={false}
        item={item}
        onContentLayoutMeasured={onContentLayoutMeasured}
      />
    );
    expect(onContentLayoutMeasured).not.toHaveBeenCalled();
  });

  it("restarts settling when asynchronous content changes a measured height", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(500);
    const onContentLayoutMeasured = vi.fn();
    await act(async () => {
      await import("../markdown-renderer");
      renderWithProviders(
        <FunProjectGroup
          {...baseProps}
          isExpanded
          item={createMockFunStack("fun-1")}
          onContentLayoutMeasured={onContentLayoutMeasured}
        />
      );
    });
    const content = screen
      .getByText("A test fun project")
      .closest<HTMLElement>("[data-fun-content-card-index]");
    act(() => vi.advanceTimersByTime(200));
    act(() => {
      for (const callback of resizeObserverCallbacks) {
        callback([
          {
            target: document.createElement("div"),
            borderBoxSize: [{ blockSize: 700 }],
            contentRect: { height: 652 },
          },
        ]);
      }
    });
    act(() => vi.advanceTimersByTime(100));
    expect(content?.style.visibility).toBe("hidden");
    act(() => vi.advanceTimersByTime(180));
    expect(content?.style.visibility).toBe("visible");
    act(() => vi.advanceTimersByTime(120));
    expect(onContentLayoutMeasured).toHaveBeenLastCalledWith(700);
  });

  it("does not mount detail cards while collapsed", () => {
    const item = createMockFunStack("fun-1", 0, 0);

    renderWithProviders(
      <FunProjectGroup {...baseProps} isExpanded={false} item={item} />
    );

    expect(screen.queryByText("Test Project")).toBeNull();
  });

  it("mounts detail cards when expanded", async () => {
    const item = createMockFunStack("fun-1", 0, 0);

    renderWithProviders(
      <FunProjectGroup {...baseProps} isExpanded={true} item={item} />
    );

    await screen.findByText("A test fun project");
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

    await screen.findByText("A test fun project");

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
