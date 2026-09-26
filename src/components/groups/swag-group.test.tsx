import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createMockSwagStack } from "@/test-utils/test-helpers";
import { SwagGroup } from "./swag-group";

const item = {
  ...createMockSwagStack("swag", 10, 20),
  swags: Array.from({ length: 12 }, (_, i) => ({
    src: `/swag-${i}.webp`,
    label: `Swag ${i}`,
    caption: `Caption ${i}`,
  })),
};
const props = () => ({
  item,
  scale: 1,
  stackIndex: 0,
  dragDisabled: false,
  repulsionOffset: { x: 0, y: 0 },
  onBringToFront: vi.fn(),
  onToggleExpanded: vi.fn(),
  onPositionUpdate: vi.fn(),
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
  onCardHeightMeasured: vi.fn(),
});
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const Providers = ({ children }: { children: React.ReactNode }) => (
  <Provider>
    <TooltipProvider>{children}</TooltipProvider>
  </Provider>
);

describe("SwagGroup", () => {
  it("limits collapsed previews to six and exposes all items on expansion", () => {
    const actions = props();
    const { rerender } = render(<SwagGroup {...actions} isExpanded={false} />, {
      wrapper: Providers,
    });
    expect(screen.getAllByRole("img")).toHaveLength(6);
    const cover = screen.getByRole("button", {
      name: "Toggle swag collection",
    });
    fireEvent.keyDown(cover, { key: "Enter" });
    expect(actions.onToggleExpanded).toHaveBeenCalledTimes(1);
    rerender(<SwagGroup {...actions} isExpanded={true} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getAllByRole("img")).toHaveLength(12);
    expect(cover.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen
        .getAllByRole("img")
        .every((image) => image.getAttribute("loading") === "lazy")
    ).toBe(true);
    rerender(<SwagGroup {...actions} isExpanded={false} />);
    expect(screen.getAllByRole("img")).toHaveLength(6);
  });

  it("handles cover click, cancellation and dragging independently", () => {
    const actions = props();
    render(<SwagGroup {...actions} isExpanded={false} />, {
      wrapper: Providers,
    });
    const cover = screen.getByRole("button", {
      name: "Toggle swag collection",
    });
    fireEvent.pointerDown(cover, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerCancel(cover);
    fireEvent.pointerUp(cover, { clientX: 10, clientY: 10 });
    expect(actions.onToggleExpanded).not.toHaveBeenCalled();
    fireEvent.pointerDown(cover, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(cover, { clientX: 10, clientY: 10 });
    expect(actions.onToggleExpanded).toHaveBeenCalledTimes(1);
    fireEvent.mouseDown(cover, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.mouseMove(window, { clientX: 50, clientY: 70 });
    fireEvent.mouseUp(window);
    expect(actions.onPositionUpdate).toHaveBeenCalledWith({ x: 50, y: 80 });
    expect(actions.onDragEnd).toHaveBeenCalledTimes(1);
  });
});
