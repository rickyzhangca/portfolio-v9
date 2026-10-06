import { CanvasSessionContext } from "@/context/canvas-session";
import { cleanup, render, screen } from "@testing-library/react";
import type { CSSProperties, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaperCardProjection } from "./paper-card-projection";

const reducedMotion = vi.hoisted(() => vi.fn(() => false));
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      animate,
      children,
      layoutId,
      transition,
      ...elementProps
    }: {
      animate?: { opacity?: number };
      children?: ReactNode;
      layoutId?: string;
      style?: CSSProperties;
      transition?: { duration?: number };
    }) => (
      <div
        data-fade-duration={
          transition?.duration === undefined
            ? undefined
            : String(transition.duration)
        }
        data-fade-opacity={
          animate?.opacity === undefined ? undefined : String(animate.opacity)
        }
        data-layout-id={layoutId}
        {...elementProps}
      >
        {children}
      </div>
    ),
  },
  useReducedMotion: reducedMotion,
}));

afterEach(() => {
  cleanup();
  reducedMotion.mockReturnValue(false);
});

const props = {
  inset: 16,
  layoutId: "document:writing:essay",
  size: { height: 360, width: 240 },
};

describe("paper card projection", () => {
  it("preserves the card bounds and uniformly centers its unchanged preview", () => {
    render(
      <PaperCardProjection {...props}>
        <p>Preview body</p>
      </PaperCardProjection>
    );
    const frame = screen
      .getByText("Preview body")
      .closest<HTMLElement>("[data-paper-frame]");
    const surface = frame?.querySelector<HTMLElement>("[data-paper-surface]");
    const content = frame?.querySelector<HTMLElement>("[data-paper-content]");
    expect(frame?.classList.contains("overflow-hidden")).toBe(false);
    expect(frame?.style).toMatchObject({ height: "360px", width: "240px" });
    expect(surface?.classList.contains("pointer-events-none")).toBe(true);
    expect(surface?.className).toContain(
      "drop-shadow-[0_16px_16px_rgba(0,0,0,0.12)]"
    );
    expect(surface?.className).toContain(
      "group-hover:drop-shadow-[0_12px_24px_rgba(0,0,0,0.24)]"
    );
    expect(content?.classList.contains("pointer-events-none")).toBe(true);
    expect(surface?.style).toMatchObject({ height: "360px", width: "240px" });
    expect(content?.style).toMatchObject({
      height: "312px",
      left: "16px",
      top: "24px",
      width: "208px",
    });
    const preview = content?.querySelector<HTMLElement>("[data-paper-preview]");
    expect(preview?.dataset.fadeOpacity).toBe("1");
    expect(preview?.style).toMatchObject({
      height: "360px",
      transform: `scale(${208 / 240})`,
      transformOrigin: "top left",
      width: "240px",
    });
    expect(surface?.getAttribute("data-layout-id")).toBe(props.layoutId);
    expect(content?.getAttribute("data-layout-id")).toBe(
      `${props.layoutId}:content`
    );
    expect(surface?.parentElement).toBe(content?.parentElement);
  });

  it("disables both shared projections for reduced motion without losing the inset", () => {
    reducedMotion.mockReturnValue(true);
    render(
      <PaperCardProjection {...props}>
        <p>Preview body</p>
      </PaperCardProjection>
    );
    const frame = screen
      .getByText("Preview body")
      .closest<HTMLElement>("[data-paper-frame]");
    const surface = frame?.querySelector<HTMLElement>("[data-paper-surface]");
    const content = frame?.querySelector<HTMLElement>("[data-paper-content]");
    expect(surface?.getAttribute("data-layout-id")).toBeNull();
    expect(content?.getAttribute("data-layout-id")).toBeNull();
    expect(content?.style).toMatchObject({ left: "16px", top: "24px" });
  });

  it("fades the open card's preview out immediately", () => {
    render(
      <CanvasSessionContext.Provider
        value={{
          articleOpen: true,
          articleSource: { cardId: "essay", itemId: "writing" },
          canvasVisible: true,
          hasCanvas: true,
        }}
      >
        <PaperCardProjection {...props}>
          <p>Preview body</p>
        </PaperCardProjection>
      </CanvasSessionContext.Provider>
    );
    const preview = screen.getByText("Preview body").parentElement;
    expect(preview?.dataset.fadeOpacity).toBe("0");
    expect(preview?.dataset.fadeDuration).toBe("0.1");
  });

  it("pins a document label to the top left and starts the paper beneath it", () => {
    render(
      <PaperCardProjection {...props} label="Resume">
        <p>Preview body</p>
      </PaperCardProjection>
    );
    const label = screen.getByText("Resume");
    expect(label.className).toBe(
      "mx-2 mt-2 mb-1 w-fit rounded-full bg-background2 px-5 py-2 font-medium text-foreground1/50 text-sm"
    );
    const frame = label.closest<HTMLElement>("[data-paper-frame]");
    const surface = frame?.querySelector<HTMLElement>("[data-paper-surface]");
    expect(label.closest("[data-paper-surface]")).toBe(surface);
    expect(surface?.getAttribute("data-layout-id")).toBe(props.layoutId);
    const content = frame?.querySelector<HTMLElement>("[data-paper-content]");
    expect(content?.style).toMatchObject({
      height: "288px",
      left: "16px",
      top: "48px",
      width: "208px",
    });
  });

  it("fades a resume or about preview while that document is open", () => {
    render(
      <PaperCardProjection {...props} label="Resume" open>
        <p>Preview body</p>
      </PaperCardProjection>
    );
    const preview = screen.getByText("Preview body").parentElement;
    const label = screen.getByText("Resume");
    expect(preview?.dataset.fadeOpacity).toBe("0");
    expect(preview?.dataset.fadeDuration).toBe("0.1");
    expect(label.parentElement?.style.opacity).toBe("0");
  });
});
