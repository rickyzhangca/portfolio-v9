import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SwagCoverCard } from "./swag-cover-card";

describe("SwagCoverCard", () => {
  it("uses yellow styling when color is omitted", () => {
    const { container } = render(
      <SwagCoverCard content={{ content: "my swag collection" }} />
    );

    const wrapper = container.firstElementChild;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toContain("bg-yellow-200");
  });
});
