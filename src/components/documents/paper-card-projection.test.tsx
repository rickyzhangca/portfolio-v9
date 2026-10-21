import { CanvasSessionContext } from "@/context/canvas-session";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { CSSProperties, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaperCardProjection } from "./paper-card-projection";

const reducedMotion = vi.hoisted(() => vi.fn(() => false));
const paperLayout = vi.hoisted(() => ({
  complete: undefined as (() => void) | undefined,
  start: undefined as (() => void) | undefined,
}));
const frameLoop = vi.hoisted(() => ({
  cancelled: [] as (() => void)[],
  postRender: [] as (() => void)[],
}));
vi.mock("framer-motion", () => ({
  cancelFrame: (callback: () => void) => frameLoop.cancelled.push(callback),
  frame: {
    postRender: (callback: () => void) => frameLoop.postRender.push(callback),
  },
  motion: {
    div: ({
      animate,
      children,
      layoutId,
      onLayoutAnimationComplete,
      onLayoutAnimationStart,
      transition,
      ...elementProps
    }: {
      animate?: { opacity?: number };
      children?: ReactNode;
      layoutId?: string;
      onLayoutAnimationComplete?: () => void;
      onLayoutAnimationStart?: () => void;
      style?: CSSProperties;
      transition?: { duration?: number };
    }) => {
      if (onLayoutAnimationStart) {
        paperLayout.start = onLayoutAnimationStart;
        paperLayout.complete = onLayoutAnimationComplete;
      }
      return (
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
      );
    },
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
    render(
      <PaperCardProjection {...props} shadow="soft">
        <p>Tucked preview</p>
      </PaperCardProjection>
    );
    expect(
      screen
        .getByText("Tucked preview")
        .closest("[data-paper-frame]")
        ?.querySelector("[data-paper-surface]")?.className
    ).toContain("drop-shadow-[0_6px_10px_rgba(0,0,0,0.06)]");
    expect(content?.classList.contains("pointer-events-none")).toBe(true);
    expect(surface?.style).toMatchObject({ height: "360px", width: "240px" });
    expect(content?.style).toMatchObject({
      height: "312px",
      left: "16px",
      top: "24px",
      width: "208px",
    });
    const preview = content?.querySelector<HTMLElement>("[data-paper-preview]");
    expect(preview?.style.opacity).toBe("");
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

  it("leaves the open card's preview to Motion's crossfade", () => {
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
    // The reader's paper covers it until the shared crossfade, and fading it
    // as well dimmed the text mid-flight.
    const preview = screen.getByText("Preview body").parentElement;
    expect(preview?.hasAttribute("data-paper-preview")).toBe(true);
    expect(preview?.style.opacity).toBe("");
  });

  it("raises the shared content box with a lifted preview", () => {
    render(
      <PaperCardProjection {...props} previewLift={12}>
        <p>Preview body</p>
      </PaperCardProjection>
    );
    const content = screen
      .getByText("Preview body")
      .closest<HTMLElement>("[data-paper-content]");
    const scale = 208 / 240;
    expect(content?.style).toMatchObject({
      height: "312px",
      top: `${24 - 12 * scale}px`,
      width: "208px",
    });
    // The visible preview still ends where the unlifted one did.
    expect(
      Number.parseFloat(
        content?.querySelector<HTMLElement>("[data-paper-preview]")?.style
          .height ?? ""
      )
    ).toBeCloseTo((312 + 12 * scale) / scale);
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
    // The box keeps the paper's proportions, so Motion scales it as it does
    // the reader's; the visible preview stops above the card's inset.
    expect(content?.style).toMatchObject({
      height: "312px",
      left: "16px",
      top: "48px",
      width: "208px",
    });
    expect(
      Number.parseFloat(
        content?.querySelector<HTMLElement>("[data-paper-preview]")?.style
          .height ?? ""
      )
    ).toBeCloseTo(288 / (208 / 240));
  });

  it("returns the label at once, held at its own size while the paper scales", () => {
    const { container, rerender } = render(
      <PaperCardProjection {...props} label="About" open>
        <p>Preview body</p>
      </PaperCardProjection>
    );
    const label = screen.getByText("About").parentElement;
    expect(label?.style.opacity).toBe("0");
    expect(label?.style.transition).toBe("none");

    rerender(
      <PaperCardProjection {...props} label="About">
        <p>Preview body</p>
      </PaperCardProjection>
    );
    expect(label?.style.opacity).toBe("1");
    expect(label?.style.transition).toBe("opacity 0.16s ease-out");

    const box = (width: number, height: number) =>
      ({ height, width }) as DOMRect;
    const card = container.querySelector<HTMLElement>("[data-paper-frame]");
    const paper = container.querySelector<HTMLElement>("[data-paper-surface]");
    vi.spyOn(card as HTMLElement, "getBoundingClientRect").mockReturnValue(
      box(240, 360)
    );
    vi.spyOn(paper as HTMLElement, "getBoundingClientRect").mockReturnValue(
      box(720, 1080)
    );
    act(() => paperLayout.start?.());
    const correct = frameLoop.postRender.at(-1);
    correct?.();
    expect(label?.style.transform).toBe(`scale(${240 / 720}, ${360 / 1080})`);

    act(() => paperLayout.complete?.());
    expect(frameLoop.cancelled).toContain(correct);
    expect(label?.style.transform).toBe("");
  });

  it("hides the label but not the preview while that document is open", () => {
    render(
      <PaperCardProjection {...props} label="Resume" open>
        <p>Preview body</p>
      </PaperCardProjection>
    );
    const preview = screen.getByText("Preview body").parentElement;
    const label = screen.getByText("Resume");
    expect(preview?.style.opacity).toBe("");
    expect(label.parentElement?.style.opacity).toBe("0");
  });
});
