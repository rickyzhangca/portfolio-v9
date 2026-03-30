import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getCardShadowStyle } from "@/lib/card-shadow";
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

  it("applies the shared paper shadow inline", () => {
    const { container } = render(
      <SwagCoverCard
        content={{ content: "my swag collection" }}
        shadowContext={{ objectHeight: 120 }}
      />
    );

    const wrapper = container.firstElementChild as HTMLDivElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.style.boxShadow).toBe(
      getCardShadowStyle({
        surface: "card-box-shadow",
        z: 6,
        objectHeight: 120,
      }).boxShadow
    );
  });
});
