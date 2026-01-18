import { SlidersHorizontalIcon } from "@phosphor-icons/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CanvasControlButton } from "./canvas-control-button";

describe("CanvasControlButton", () => {
  it("renders icon with correct aria-label and title", () => {
    render(
      <CanvasControlButton
        Icon={SlidersHorizontalIcon}
        label="Test Button"
        onClick={vi.fn()}
      />
    );

    const button = screen.getByRole("button", { name: "Test Button" });
    expect(button).toBeDefined();
    expect(button.getAttribute("title")).toBe("Test Button");
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(
      <CanvasControlButton
        Icon={SlidersHorizontalIcon}
        label="Test Button"
        onClick={onClick}
      />
    );

    const button = screen.getByRole("button", { name: "Test Button" });
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is true", () => {
    const onClick = vi.fn();
    render(
      <CanvasControlButton
        disabled
        Icon={SlidersHorizontalIcon}
        label="Test Button"
        onClick={onClick}
      />
    );

    const button = screen.getByRole("button", { name: "Test Button" });
    expect(button.getAttribute("disabled")).toBe("");

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is not disabled when disabled prop is false or undefined", () => {
    render(
      <CanvasControlButton
        Icon={SlidersHorizontalIcon}
        label="Test Button"
        onClick={vi.fn()}
      />
    );

    const button = screen.getByRole("button", { name: "Test Button" });
    expect(button.getAttribute("disabled")).toBeNull();
  });
});
