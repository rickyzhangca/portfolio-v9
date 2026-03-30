import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getShadowRecipe, toShadowFilter } from "@/lib/card-shadow";
import { getShadowLighting } from "@/lib/shadow-lighting";
import { FunProjectCard } from "./fun-project-card";

const content = {
  items: [
    {
      icon: "/demo-icon.png",
      title: "Demo cube",
      description: "Demo",
      status: "Active" as const,
    },
  ],
};

describe("FunProjectCard", () => {
  it("uses centralized accent shadows for project cubes at rest", () => {
    render(
      <FunProjectCard
        content={content}
        shadowContext={{
          lighting: getShadowLighting(12, "debug"),
        }}
      />
    );

    expect(screen.getByAltText("Demo cube").style.filter).toBe(
      toShadowFilter(
        getShadowRecipe({
          z: 4,
          objectHeight: 64,
          lighting: getShadowLighting(12, "debug"),
        })
      )
    );
  });

  it("updates cube shadows when lighting changes", () => {
    const { rerender } = render(
      <FunProjectCard
        content={content}
        shadowContext={{
          lighting: getShadowLighting(8, "debug"),
        }}
      />
    );

    const morningShadow = screen.getByAltText("Demo cube").style.filter;

    rerender(
      <FunProjectCard
        content={content}
        shadowContext={{
          lighting: getShadowLighting(16, "debug"),
        }}
      />
    );

    expect(screen.getByAltText("Demo cube").style.filter).not.toBe(
      morningShadow
    );
  });
});
