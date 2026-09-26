import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initialItems } from "@/scenes/home-scene";
import type { CanvasSingleItem } from "@/types/canvas";
import { SingleCardItem } from "./single-card-item";

afterEach(cleanup);
const findItem = (kind: CanvasSingleItem["card"]["kind"]) => {
  const item = initialItems.find(
    (candidate) => candidate.kind === "single" && candidate.card.kind === kind
  );
  if (!item || item.kind !== "single") {
    throw new Error(`No ${kind} card in the scene`);
  }
  return item;
};
const props = () => ({
  scale: 1,
  isFocused: false,
  dragDisabled: false,
  repulsionOffset: { x: 0, y: 0 },
  onBringToFront: vi.fn(),
  onPositionUpdate: vi.fn(),
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
  onCardHeightMeasured: vi.fn(),
  onActivate: vi.fn(),
});

describe("SingleCardItem", () => {
  it.each([
    "resume",
    "about",
    "macbook",
  ] as const)("supports keyboard and click activation of %s", (kind) => {
    const actions = props();
    const item = findItem(kind);
    const { rerender } = render(<SingleCardItem {...actions} item={item} />);
    const trigger = screen.getByRole("button", { name: `Open ${kind}` });
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.keyDown(trigger, { key: " " });
    fireEvent.keyDown(trigger, { key: "ArrowRight" });
    fireEvent.click(trigger);
    expect(actions.onActivate).toHaveBeenCalledTimes(3);
    rerender(<SingleCardItem {...actions} isFocused item={item} />);
    expect(screen.getByRole("button", { name: `Open ${kind}` })).toBeDefined();
  });

  it("does not activate the card after a drag, and commits its position once", () => {
    const actions = props();
    const item = findItem("about");
    render(<SingleCardItem {...actions} item={item} />);
    const trigger = screen.getByRole("button", { name: "Open about" });
    fireEvent.mouseDown(trigger, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 150, clientY: 160 });
    fireEvent.mouseUp(window);
    fireEvent.click(trigger);
    expect(actions.onActivate).not.toHaveBeenCalled();
    expect(actions.onPositionUpdate).toHaveBeenCalledWith({
      x: item.position.x + 50,
      y: item.position.y + 60,
    });
    expect(actions.onDragEnd).toHaveBeenCalledTimes(1);
  });

  it("does not expose a synthetic activation button on a passive card", () => {
    render(<SingleCardItem {...props()} item={findItem("profilepic")} />);
    expect(
      screen.queryByRole("button", { name: "Open profilepic" })
    ).toBeNull();
  });

  it("suppresses the click when a drag is cancelled by disabling the card", () => {
    const actions = props();
    const item = findItem("about");
    const { rerender } = render(<SingleCardItem {...actions} item={item} />);
    const trigger = screen.getByRole("button", { name: "Open about" });
    fireEvent.mouseDown(trigger, { button: 0, clientX: 100, clientY: 100 });
    rerender(<SingleCardItem {...actions} dragDisabled item={item} />);
    fireEvent.click(trigger);
    expect(actions.onActivate).not.toHaveBeenCalled();
    expect(actions.onDragEnd).toHaveBeenCalledTimes(1);
  });
});
