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

const renderKeycaps = (table: Record<string, FunProjectKeycap>) => {
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
});
