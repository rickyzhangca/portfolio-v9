import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TimecarCardContent } from "@/cards/registry";

vi.mock("@/assets/timecar/car-light.webp", () => ({
  default: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
}));

import { FluxCharge } from "./flux-charge";
import { TimecarCard } from "./timecar-card";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const PIXEL = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
const content: TimecarCardContent = {
  image: PIXEL,
  image2x: PIXEL,
  normalMap: PIXEL,
  surfaceMap: PIXEL,
};

describe("TimecarCard", () => {
  it("drops data-time-travel and room dim immediately when obscured", async () => {
    expect(FluxCharge).toBeDefined();
    let frameCallback: FrameRequestCallback | undefined;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frameCallback = callback;
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(
      () => undefined
    );
    vi.spyOn(window, "matchMedia").mockReturnValue({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: "",
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    });
    vi.spyOn(HTMLImageElement.prototype, "src", "set").mockImplementation(
      () => undefined
    );
    vi.spyOn(HTMLImageElement.prototype, "decode").mockRejectedValue(
      new Error("offline test")
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(PIXEL);
    const gradient = { addColorStop: vi.fn() };
    const context2d = new Proxy(
      {
        createImageData: (w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4),
        }),
        createLinearGradient: () => gradient,
        createRadialGradient: () => gradient,
        getImageData: (_x: number, _y: number, w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4),
        }),
      },
      {
        get: (target, prop) =>
          prop in target ? target[prop as keyof typeof target] : vi.fn(),
        set: () => true,
      }
    );
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((
      kind: string
    ) =>
      kind === "2d"
        ? (context2d as unknown as CanvasRenderingContext2D)
        : null) as typeof HTMLCanvasElement.prototype.getContext);

    const renderScene = (obscured: boolean) => (
      <div className="react-transform-component">
        <div className="canvas-entrance-item" data-testid="wrapper">
          <TimecarCard content={content} obscured={obscured} />
        </div>
      </div>
    );

    const { rerender } = render(renderScene(false));
    const button = screen.getByRole("button", {
      name: "Time travel to earlier portfolios",
    });
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue(
      new DOMRect(100, 100, 248, 117)
    );

    vi.spyOn(button, "matches").mockImplementation(
      (selector) => selector === ":focus-visible"
    );
    fireEvent.focus(button);
    await waitFor(() => expect(frameCallback).toBeDefined());

    act(() => {
      frameCallback?.(performance.now() + 500);
    });

    const wrapper = screen.getByTestId("wrapper");
    expect(wrapper.hasAttribute("data-time-travel")).toBe(true);
    expect(
      document.querySelectorAll(
        ".react-transform-component > div[aria-hidden='true']"
      ).length
    ).toBeGreaterThan(0);

    // Opening a foreground item clears data-time-travel and dim layers at once.
    rerender(renderScene(true));
    expect(wrapper.hasAttribute("data-time-travel")).toBe(false);
    expect(
      document.querySelectorAll(
        ".react-transform-component > div[aria-hidden='true']"
      ).length
    ).toBe(0);

    // While obscured, focusing or hovering does not raise the car again.
    fireEvent.blur(button);
    fireEvent.focus(button);
    act(() => {
      frameCallback?.(performance.now() + 1000);
    });
    expect(wrapper.hasAttribute("data-time-travel")).toBe(false);
  });
});
