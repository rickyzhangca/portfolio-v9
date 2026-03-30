import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsEvents, track } from "@/lib/analytics";

vi.mock("@/lib/analytics", () => ({
  AnalyticsEvents: {
    CANVAS_VIEW_RESET: "canvas_view_reset",
    CANVAS_POSITION_RESET: "canvas_position_reset",
  },
  track: vi.fn(),
}));

vi.mock("./canvas-control-panel", () => ({
  CanvasControlPanel: () => <div>Repulsion</div>,
}));

import { CanvasControls } from "./canvas-controls";

describe("CanvasControls", () => {
  it("renders the main controls", () => {
    const onReset = vi.fn();
    const onResetPositions = vi.fn();

    render(
      <CanvasControls onReset={onReset} onResetPositions={onResetPositions} />
    );

    expect(
      screen.getByRole("button", { name: "Open playground" })
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Reset canvas" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Time machine" })).toBeDefined();
  });

  it("toggles panel open when playground button is clicked", () => {
    const onReset = vi.fn();
    const onResetPositions = vi.fn();

    render(
      <CanvasControls onReset={onReset} onResetPositions={onResetPositions} />
    );

    const playgroundButton = screen.getByRole("button", {
      name: "Open playground",
    });
    fireEvent.click(playgroundButton);

    expect(screen.getByText("Repulsion")).toBeDefined();
  });

  it("closes panel when playground button is clicked again", () => {
    const onReset = vi.fn();
    const onResetPositions = vi.fn();

    render(
      <CanvasControls onReset={onReset} onResetPositions={onResetPositions} />
    );

    const playgroundButton = screen.getByRole("button", {
      name: "Open playground",
    });
    fireEvent.click(playgroundButton);

    expect(screen.getByText("Repulsion")).toBeDefined();

    fireEvent.click(playgroundButton);

    expect(screen.queryByText("Repulsion")).toBeNull();
  });

  it("tracks reset analytics and calls both reset handlers", () => {
    const onReset = vi.fn();
    const onResetPositions = vi.fn();

    render(
      <CanvasControls onReset={onReset} onResetPositions={onResetPositions} />
    );

    const resetButton = screen.getByRole("button", { name: "Reset canvas" });
    fireEvent.click(resetButton);

    expect(track).toHaveBeenNthCalledWith(1, AnalyticsEvents.CANVAS_VIEW_RESET, {
      zoom_level: 1,
    });
    expect(track).toHaveBeenNthCalledWith(
      2,
      AnalyticsEvents.CANVAS_POSITION_RESET
    );
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onResetPositions).toHaveBeenCalledTimes(1);
  });

  it("disables reset button when requested", () => {
    const onReset = vi.fn();
    const onResetPositions = vi.fn();

    render(
      <CanvasControls
        isResetDisabled
        onReset={onReset}
        onResetPositions={onResetPositions}
      />
    );

    const resetButton = screen.getByRole("button", { name: "Reset canvas" });
    expect(resetButton.getAttribute("disabled")).toBe("");
  });

  it("renders the time machine link with safe external link attributes", () => {
    const onReset = vi.fn();
    const onResetPositions = vi.fn();

    render(
      <CanvasControls onReset={onReset} onResetPositions={onResetPositions} />
    );

    const timeMachineButton = screen.getByRole("button", { name: "Time machine" });
    const timeMachineLink = timeMachineButton.closest("a");

    expect(timeMachineLink).not.toBeNull();
    if (!timeMachineLink) {
      throw new Error("Expected time machine link wrapper");
    }
    expect(timeMachineLink.getAttribute("href")).toBe("https://v8.rickyzhang.me");
    expect(timeMachineLink.getAttribute("target")).toBe("_blank");
    expect(timeMachineLink.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
