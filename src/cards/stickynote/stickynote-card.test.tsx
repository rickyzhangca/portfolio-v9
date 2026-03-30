import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getCardShadowStyle } from "@/lib/card-shadow";
import { StickyNoteCard } from "./stickynote-card";

describe("StickyNoteCard", () => {
  it("uses yellow styling when color is omitted", () => {
    const { container } = render(
      <StickyNoteCard content={{ content: "hello world" }} />
    );

    const wrapper = container.firstElementChild;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toContain("bg-yellow-200");
  });

  it("applies the shared paper shadow inline", () => {
    const { container } = render(
      <StickyNoteCard
        content={{ content: "hello world" }}
        shadowContext={{ maxZIndex: 5, zIndex: 2 }}
      />
    );

    const wrapper = container.firstElementChild as HTMLDivElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.style.boxShadow).toBe(
      getCardShadowStyle({
        surface: "card-box-shadow",
        role: "surface",
        tone: "paper",
        zIndex: 2,
        maxZIndex: 5,
      }).boxShadow
    );
  });
});
