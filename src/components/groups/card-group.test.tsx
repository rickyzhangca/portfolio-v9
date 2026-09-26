import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockCard,
  createMockStack,
  createMockStickyNote,
} from "@/test-utils/test-helpers";
import { CardStack } from "./card-group";

const stack = createMockStack("company", 20, 30, 1, undefined, [
  createMockCard("one"),
  createMockCard("two"),
  createMockCard("three"),
  createMockStickyNote("note"),
]);
stack.cover.content.image = "/cover.webp";
for (const card of stack.stack) {
  if (card.kind === "project") {
    card.content.image = "/project.webp";
  }
}
const callbacks = () => ({
  onBringToFront: vi.fn(),
  onToggleExpanded: vi.fn(),
  onPositionUpdate: vi.fn(),
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
  onCardHeightMeasured: vi.fn(),
});
const base = {
  stack,
  stackIndex: 0,
  scale: 1,
  dragDisabled: false,
  repulsionOffset: { x: 0, y: 0 },
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CardStack", () => {
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
