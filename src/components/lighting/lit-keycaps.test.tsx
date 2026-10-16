import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FunProjectKeycap } from "@/cards/registry";
import { LitKeycaps } from "./lit-keycaps";

const surface = vi.hoisted(() => ({ run: vi.fn(() => () => undefined) }));

// WebGPU is not available here: record what would be drawn instead.
vi.mock("./lit-surface", () => ({ runLitSurface: surface.run }));

const ITEMS = ["First", "Second"].map((title) => ({
  description: "",
  icon: `${title}.webp`,
  status: "Active" as const,
  title,
}));

const NO_LIFTS = new Map();

const CAP: FunProjectKeycap = { body: ["#f2f2f2", "#f2f2f2"], glyph: "a.webp" };

const renderKeycaps = (
  table: Record<string, FunProjectKeycap>,
  popAt?: (index: number) => number
) => {
  const loadCaps = () => Promise.resolve(table);
  return render(
    <div>
      <img alt="First" data-keycap="" height={72} src="first.webp" width={64} />
      <img
        alt="Second"
        data-keycap=""
        height={72}
        src="second.webp"
        width={64}
      />
      <LitKeycaps
        lifts={NO_LIFTS}
        loadCaps={loadCaps}
        onReady={vi.fn()}
        items={ITEMS}
        popAt={popAt}
      />
    </div>
  );
};

describe("LitKeycaps", () => {
  beforeEach(() => {
    // Loaded 64 px icons over 8 px walls.
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(64);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(72);
  });

  afterEach(() => {
    surface.run.mockClear();
    vi.restoreAllMocks();
  });

  it("draws once every icon has a cap", async () => {
    renderKeycaps({ First: CAP, Second: CAP });

    await waitFor(() => {
      expect(surface.run).toHaveBeenCalledTimes(1);
    });
  });

  it("leaves the pictures when an icon has no cap", async () => {
    renderKeycaps({ First: CAP });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(surface.run).not.toHaveBeenCalled();
  });

  it("grows each cap in with its icon's pop", async () => {
    renderKeycaps({ First: CAP, Second: CAP }, (index) =>
      index === 0 ? 0.5 : 0
    );
    await waitFor(() => {
      expect(surface.run).toHaveBeenCalledTimes(1);
    });

    const [options] = surface.run.mock.calls[0] as unknown as [
      { draw: (surface: { render: () => void }, view: object) => void },
    ];
    const renderFrame = vi.fn();
    options.draw(
      { render: renderFrame },
      {
        height: 72,
        intensity: 1,
        light: { x: 0, y: 0, z: 1 },
        pixelScale: 1,
        width: 128,
      }
    );
    const [frame] = renderFrame.mock.calls[0] as [
      { caps: { scale: number; thickness: number; top: number[] }[] },
    ];
    // Half grown, around the middle of its 64 px footprint.
    expect(frame.caps[0]?.scale).toBe(0.5);
    expect(frame.caps[0]?.top[2]).toBe(32);
    expect(frame.caps[1]?.scale).toBe(0);
  });
});
