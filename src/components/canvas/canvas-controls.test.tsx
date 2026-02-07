import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./canvas-control-panel", () => ({
  CanvasControlPanel: () => <div>Repulsion</div>,
}));

import { CanvasControls } from "./canvas-controls";

describe("CanvasControls", () => {
  it("renders both buttons", () => {
    const onReset = vi.fn();
    const onResetPositions = vi.fn();

    render(
      <CanvasControls onReset={onReset} onResetPositions={onResetPositions} />
    );

    expect(
      screen.getByRole("button", { name: "Open playground" })
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Reset canvas" })).toBeDefined();
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

  it("calls both reset functions when reset button is clicked", () => {
    const onReset = vi.fn();
    const onResetPositions = vi.fn();

    render(
      <CanvasControls onReset={onReset} onResetPositions={onResetPositions} />
    );

    const resetButton = screen.getByRole("button", { name: "Reset canvas" });
    fireEvent.click(resetButton);

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onResetPositions).toHaveBeenCalledTimes(1);
  });

  it("disables reset button when isResetDisabled is true", () => {
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

  it("enables reset button when isResetDisabled is false", () => {
    const onReset = vi.fn();
    const onResetPositions = vi.fn();

    render(
      <CanvasControls
        isResetDisabled={false}
        onReset={onReset}
        onResetPositions={onResetPositions}
      />
    );

    const resetButton = screen.getByRole("button", { name: "Reset canvas" });
    expect(resetButton.getAttribute("disabled")).toBeNull();
  });

  it("enables reset button when isResetDisabled is undefined", () => {
    const onReset = vi.fn();
    const onResetPositions = vi.fn();

    render(
      <CanvasControls onReset={onReset} onResetPositions={onResetPositions} />
    );

    const resetButton = screen.getByRole("button", { name: "Reset canvas" });
    expect(resetButton.getAttribute("disabled")).toBeNull();
  });
});
