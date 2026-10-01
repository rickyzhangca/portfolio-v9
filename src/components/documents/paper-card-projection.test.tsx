import { cleanup, render, screen } from "@testing-library/react";
import type { CSSProperties, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaperCardProjection } from "./paper-card-projection";

const reducedMotion = vi.hoisted(() => vi.fn(() => false));
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      layoutId,
      transition: _transition,
      ...elementProps
    }: {
      children?: ReactNode;
      layoutId?: string;
      style?: CSSProperties;
      transition?: unknown;
    }) => (
      <div data-layout-id={layoutId} {...elementProps}>
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
    expect(content?.classList.contains("pointer-events-none")).toBe(true);
    expect(surface?.style).toMatchObject({ height: "360px", width: "240px" });
    expect(content?.style).toMatchObject({
      height: "312px",
      left: "16px",
      top: "24px",
      width: "208px",
    });
    expect(content?.querySelector("div")?.style).toMatchObject({
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
});
