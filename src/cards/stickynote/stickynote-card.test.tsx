import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
