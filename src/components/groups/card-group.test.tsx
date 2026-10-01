import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockCard,
  createMockStack,
  createMockStickyNote,
} from "@/test-utils/test-helpers";
import type { CanvasStackItem } from "@/types/canvas";
import { CardStack } from "./card-group";

const stack = createMockStack("company", 20, 30, 1, undefined, [
  createMockCard("one"),
  createMockCard("two"),
  createMockCard("three"),
  createMockStickyNote("note"),
]);
if (stack.cover.kind === "cover") {
  stack.cover.content.image = "/cover.webp";
}
for (const card of stack.stack) {
  if (card.kind === "project") {
    card.content.image = "/project.webp";
  }
}
const callbacks = () => ({
  onBringToFront: vi.fn(),
  onCardHeightMeasured: vi.fn(),
  onDragEnd: vi.fn(),
  onDragStart: vi.fn(),
  onPositionUpdate: vi.fn(),
  onToggleExpanded: vi.fn(),
});
const base = {
  dragDisabled: false,
  repulsionOffset: { x: 0, y: 0 },
  scale: 1,
  stack,
  stackIndex: 0,
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CardStack", () => {
  beforeEach(() => vi.useFakeTimers());
  it("lets expansion preempt a delayed scene entrance", async () => {
    vi.useRealTimers();
    const actions = callbacks();
    const { container, rerender } = render(
      <Provider>
        <CardStack {...base} {...actions} isExpanded={false} stackIndex={100} />
      </Provider>
    );
    const card = container.querySelector<HTMLElement>(
      '[data-repulsion-card-id="one"] > div'
    );
    expect(card?.style.opacity).toBe("0");
    rerender(
      <Provider>
        <CardStack {...base} {...actions} isExpanded stackIndex={100} />
      </Provider>
    );
    await waitFor(() => expect(card?.style.opacity).toBe("1"));
  });

  it("renders previews with lazy images and exposes keyboard expansion", () => {
    const actions = callbacks();
    const { rerender } = render(
      <Provider>
        <CardStack {...base} {...actions} isExpanded={false} />
      </Provider>
    );
    act(() => {
      vi.advanceTimersByTime(500);
    });
    const cover = screen.getByRole("button", { name: "Toggle Test Company" });
    expect(cover.getAttribute("aria-expanded")).toBe("false");
    fireEvent.keyDown(cover, { key: "Enter" });
    expect(actions.onToggleExpanded).toHaveBeenCalledTimes(1);
    rerender(
      <Provider>
        <CardStack {...base} {...actions} isExpanded={true} />
      </Provider>
    );
    expect(cover.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen
        .getAllByRole("img", { name: "Test" })
        .every((image) => image.getAttribute("loading") === "lazy")
    ).toBe(true);
    fireEvent.keyDown(cover, { key: " " });
    expect(actions.onToggleExpanded).toHaveBeenCalledTimes(2);
  });

  it("toggles a click, but not a cancelled pointer or a moved gesture", () => {
    const actions = callbacks();
    render(
      <Provider>
        <CardStack {...base} {...actions} isExpanded={false} />
      </Provider>
    );
    const cover = screen.getByRole("button", { name: "Toggle Test Company" });
    fireEvent.pointerDown(cover, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerCancel(cover);
    fireEvent.pointerUp(cover, { clientX: 10, clientY: 10 });
    expect(actions.onToggleExpanded).not.toHaveBeenCalled();
    fireEvent.pointerDown(cover, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(cover, { clientX: 100, clientY: 100 });
    expect(actions.onToggleExpanded).not.toHaveBeenCalled();
    fireEvent.pointerDown(cover, { button: 2, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(cover, { clientX: 10, clientY: 10 });
    expect(actions.onToggleExpanded).not.toHaveBeenCalled();
    fireEvent.pointerDown(cover, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(cover, { clientX: 10, clientY: 10 });
    expect(actions.onToggleExpanded).toHaveBeenCalledTimes(1);
  });

  it("commits dragged coordinates and releases the parent panning lock", () => {
    const actions = callbacks();
    const { unmount } = render(
      <Provider>
        <CardStack {...base} {...actions} isExpanded={false} />
      </Provider>
    );
    const cover = screen.getByRole("button", { name: "Toggle Test Company" });
    fireEvent.mouseDown(cover, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.mouseMove(window, { clientX: 40, clientY: 50 });
    fireEvent.mouseUp(window);
    expect(actions.onBringToFront).toHaveBeenCalledTimes(1);
    expect(actions.onPositionUpdate).toHaveBeenCalledWith({ x: 50, y: 70 });
    expect(actions.onDragEnd).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not schedule rearrangement tracking when unmounted during a drag", () => {
    const actions = callbacks();
    const { unmount } = render(
      <Provider>
        <CardStack {...base} {...actions} isExpanded={false} />
      </Provider>
    );
    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.mouseDown(
      screen.getByRole("button", { name: "Toggle Test Company" }),
      { button: 0, clientX: 10, clientY: 10 }
    );
    fireEvent.mouseMove(window, { clientX: 40, clientY: 50 });
    unmount();
    expect(actions.onDragEnd).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

const writingStack: CanvasStackItem = {
  cover: {
    content: { count: 1000, label: "Writing" },
    id: "cover",
    kind: "folder-cover",
    size: { height: 340, width: 240 },
  },
  id: "writing",
  kind: "stack",
  pageSize: 6,
  position: { x: 0, y: 0 },
  stack: Array.from({ length: 1000 }, (_, index) => ({
    content: { slug: "ephemeral-design" },
    id: `article-${index}`,
    kind: "article",
    size: { height: 360, width: 240 },
  })),
  zIndex: 1,
};
const props = {
  dragDisabled: true,
  onBringToFront: vi.fn(),
  onPositionUpdate: vi.fn(),
  onToggleExpanded: vi.fn(),
  repulsionOffset: { x: 0, y: 0 },
  scale: 1,
  stack: writingStack,
  stackIndex: 0,
};

describe("Writing folder rendering", () => {
  it("repels the cover and sibling cards without moving the document's shared-layout anchor", () => {
    const { container } = render(
      <CardStack
        {...props}
        cardRepulsionOffsets={
          new Map([
            ["cover", { x: -120, y: -20 }],
            ["article-0", { x: 0, y: 0 }],
            ["article-1", { x: 80, y: 10 }],
          ])
        }
        isExpanded
      />
    );
    const cover = container.querySelector<HTMLElement>(
      '[data-repulsion-card-id="cover"]'
    );
    const active = container.querySelector<HTMLElement>(
      '[data-repulsion-card-id="article-0"]'
    );
    const sibling = container.querySelector<HTMLElement>(
      '[data-repulsion-card-id="article-1"]'
    );
    expect(cover?.style.transform).toContain("translateX(-120px)");
    expect(cover?.style.transform).toContain("translateY(-20px)");
    expect(active?.style.transform).toBe("none");
    expect(sibling?.style.transform).toContain("translateX(80px)");
    expect(sibling?.style.transform).toContain("translateY(10px)");
    expect(Number(cover?.style.zIndex)).toBeGreaterThan(
      Number(sibling?.style.zIndex)
    );
  });
  it("mounts only two inert previews while 1000 articles are collapsed", () => {
    const { container } = render(<CardStack {...props} isExpanded={false} />);
    const links = container.querySelectorAll('a[id^="article-"]');
    expect(links).toHaveLength(2);
    expect(container.querySelectorAll("[data-paper-content]")).toHaveLength(2);
    expect(
      Array.from(links).every(
        (link) =>
          link.getAttribute("tabindex") === "-1" && link.closest("[inert]")
      )
    ).toBe(true);
  });
  it("mounts only the active page and lets the pager select the next one", () => {
    const changePage = vi.fn();
    const { container, rerender } = render(
      <CardStack {...props} isExpanded onPageChange={changePage} />
    );
    expect(container.querySelectorAll('a[id^="article-"]')).toHaveLength(6);
    expect(container.querySelectorAll("[data-paper-content]")).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "Next articles" }));
    expect(changePage).toHaveBeenCalledWith(1);
    rerender(
      <CardStack {...props} isExpanded onPageChange={changePage} page={166} />
    );
    expect(container.querySelectorAll('a[id^="article-"]')).toHaveLength(4);
    expect(container.querySelectorAll("[data-paper-content]")).toHaveLength(4);
    expect(container.querySelector("#article-996")).not.toBeNull();
    expect(container.querySelector("#article-0")).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Next articles" })
        .hasAttribute("disabled")
    ).toBe(true);
  });
});
