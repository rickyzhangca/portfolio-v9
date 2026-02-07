import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CanvasControlResetButton } from "./canvas-control-reset-button";

describe("CanvasControlResetButton", () => {
  it("renders with Reset label", () => {
    render(<CanvasControlResetButton onClick={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Reset" });
    expect(button).toBeDefined();
  });

  it("calls onClick handler when clicked", () => {
    const handleClick = vi.fn();
    render(<CanvasControlResetButton onClick={handleClick} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is true", () => {
    render(<CanvasControlResetButton disabled onClick={vi.fn()} />);

    const button = screen.getByRole("button");
    expect(button.getAttribute("disabled")).toBe("");
  });

  it("is enabled when disabled prop is false", () => {
    render(<CanvasControlResetButton disabled={false} onClick={vi.fn()} />);

    const button = screen.getByRole("button");
    expect(button.getAttribute("disabled")).toBeNull();
  });

  it("is enabled by default when disabled prop is not provided", () => {
    render(<CanvasControlResetButton onClick={vi.fn()} />);

    const button = screen.getByRole("button");
    expect(button.getAttribute("disabled")).toBeNull();
  });

  it("does not call onClick when disabled", () => {
    const handleClick = vi.fn();
    render(<CanvasControlResetButton disabled onClick={handleClick} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("has correct button type", () => {
    render(<CanvasControlResetButton onClick={vi.fn()} />);

    const button = screen.getByRole("button");
    expect(button.getAttribute("type")).toBe("button");
  });
});
