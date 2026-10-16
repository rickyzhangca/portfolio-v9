import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "jotai";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsEvents, track } from "@/lib/analytics";

vi.mock("@/lib/analytics", () => ({
  AnalyticsEvents: {
    CANVAS_POSITION_RESET: "canvas_position_reset",
    CANVAS_VIEW_RESET: "canvas_view_reset",
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
    expect(screen.getByRole("link", { name: "Time machine" })).toBeDefined();
  });

  it("toggles panel open when playground button is clicked", async () => {
    const onReset = vi.fn();
    const onResetPositions = vi.fn();

    render(
      <CanvasControls onReset={onReset} onResetPositions={onResetPositions} />
    );

    const playgroundButton = screen.getByRole("button", {
      name: "Open playground",
    });
    fireEvent.click(playgroundButton);

    expect(await screen.findByText("Repulsion")).toBeDefined();
  });

  it("closes panel when playground button is clicked again", async () => {
    const onReset = vi.fn();
    const onResetPositions = vi.fn();

    render(
      <CanvasControls onReset={onReset} onResetPositions={onResetPositions} />
    );

    const playgroundButton = screen.getByRole("button", {
      name: "Open playground",
    });
    fireEvent.click(playgroundButton);

    expect(await screen.findByText("Repulsion")).toBeDefined();
    expect(playgroundButton.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(playgroundButton);

    // The panel stays mounted while the blob morphs back into the button.
    expect(playgroundButton.getAttribute("aria-expanded")).toBe("false");
    await waitFor(() => expect(screen.queryByText("Repulsion")).toBeNull(), {
      timeout: 3000,
    });
  });

  it("closes the panel with Escape and returns focus to its button", async () => {
    render(<CanvasControls onReset={vi.fn()} onResetPositions={vi.fn()} />);

    const playgroundButton = screen.getByRole("button", {
      name: "Open playground",
    });
    fireEvent.click(playgroundButton);
    const panel = await screen.findByRole("region", { name: "Playground" });

    fireEvent.keyDown(panel, { key: "Escape" });

    expect(playgroundButton.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(playgroundButton);
  });

  it("tracks reset analytics and calls both reset handlers", () => {
    const onReset = vi.fn();
    const onResetPositions = vi.fn();

    render(
      <CanvasControls onReset={onReset} onResetPositions={onResetPositions} />
    );

    const resetButton = screen.getByRole("button", { name: "Reset canvas" });
    fireEvent.click(resetButton);

    expect(track).toHaveBeenNthCalledWith(
      1,
      AnalyticsEvents.CANVAS_VIEW_RESET,
      {
        zoom_level: 1,
      }
    );
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

    const timeMachineLink = screen.getByRole("link", {
      name: "Time machine",
    });

    expect(timeMachineLink.getAttribute("href")).toBe(
      "https://v8.rickyzhang.me"
    );
    expect(timeMachineLink.getAttribute("target")).toBe("_blank");
    expect(timeMachineLink.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("hides the desk lamp without WebGPU", () => {
    render(<CanvasControls onReset={vi.fn()} onResetPositions={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: "Realistic lighting" })
    ).toBeNull();
  });

  it.each([
    ["Chrome on a phone", ["Chromium", "Google Chrome"], "Android", true],
    [
      "Chrome on an Android tablet",
      ["Chromium", "Google Chrome"],
      "Android",
      false,
    ],
    ["a browser with no Chromium brand", ["Google Chrome"], "macOS", false],
  ])("hides the desk lamp in %s", (_, brands, platform, mobile) => {
    vi.stubGlobal("navigator", {
      ...navigator,
      gpu: {},
      userAgentData: {
        brands: brands.map((brand) => ({ brand })),
        mobile,
        platform,
      },
    });
    try {
      render(<CanvasControls onReset={vi.fn()} onResetPositions={vi.fn()} />);

      expect(
        screen.queryByRole("button", { name: "Realistic lighting" })
      ).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("hides the desk lamp in browsers without client hints", () => {
    vi.stubGlobal("navigator", { ...navigator, gpu: {} });
    try {
      render(<CanvasControls onReset={vi.fn()} onResetPositions={vi.fn()} />);

      expect(
        screen.queryByRole("button", { name: "Realistic lighting" })
      ).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("shows the desk lamp without client hints when forced", () => {
    vi.stubGlobal("navigator", { ...navigator, gpu: {} });
    window.history.replaceState(null, "", "/?lamp=force");
    try {
      render(<CanvasControls onReset={vi.fn()} onResetPositions={vi.fn()} />);

      expect(
        screen.getByRole("button", { name: "Realistic lighting" })
      ).toBeDefined();
    } finally {
      window.history.replaceState(null, "", "/");
      vi.unstubAllGlobals();
    }
  });

  it.each([
    ["Google Chrome", "macOS"],
    ["Microsoft Edge", "Windows"],
    ["Brave", "Linux"],
    ["Not?A_Brand", "Chrome OS"],
  ])("toggles the desk lamp in desktop %s on %s", (brand, platform) => {
    vi.stubGlobal("navigator", {
      ...navigator,
      gpu: {},
      userAgentData: {
        brands: [{ brand: "Chromium" }, { brand }],
        mobile: false,
        platform,
      },
    });
    try {
      // A store per case: the lamp switched on in one must not carry over.
      render(
        <Provider>
          <CanvasControls onReset={vi.fn()} onResetPositions={vi.fn()} />
        </Provider>
      );

      const lamp = screen.getByRole("button", { name: "Realistic lighting" });
      expect(lamp.getAttribute("aria-pressed")).toBe("false");
      fireEvent.click(lamp);
      expect(lamp.getAttribute("aria-pressed")).toBe("true");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
