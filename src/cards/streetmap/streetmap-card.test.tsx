import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StreetmapCardContent } from "@/cards/registry";
import { StreetmapCard } from "./streetmap-card";

const content: StreetmapCardContent = {
  compactView: { scale: 0.1, x: 252_200, y: 283_200 },
  cover: "cover.webp",
  cover2x: "cover-2x.webp",
  tileBase: "https://tiles.example/",
  view: { scale: 0.065, x: 252_200, y: 283_600 },
};

describe("StreetmapCard", () => {
  it("rests on the desk as its cover", () => {
    render(<StreetmapCard content={content} />);
    const cover = screen.getByAltText("Tiny Toronto street map");
    expect(cover.getAttribute("srcset")).toContain("cover-2x.webp 240w");
    expect(screen.queryByRole("application", { hidden: true })).toBeNull();
  });

  it("mounts the sheet once focused, keeping the cover until it is ready", async () => {
    const { rerender } = render(<StreetmapCard content={content} />);
    rerender(<StreetmapCard content={content} isFocused />);
    expect(
      await screen.findByRole("application", { hidden: true })
    ).toBeTruthy();
    // No canvas here to bake the sheet with: the cover stays on the desk.
    expect(screen.getByAltText("Tiny Toronto street map")).toBeTruthy();
  });
});
