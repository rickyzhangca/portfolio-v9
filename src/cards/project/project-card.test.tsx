import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getCardShadowStyle } from "@/lib/card-shadow";
import { ProjectCard } from "./project-card";

describe("ProjectCard", () => {
  it("applies shared media shadow styles to the image shell", () => {
    render(
      <ProjectCard
        content={{
          title: "Demo",
          image: "/demo.png",
        }}
        shadowContext={{ maxZIndex: 8, zIndex: 3 }}
      />
    );

    const mediaShell = screen.getByAltText("Demo").parentElement;
    expect(mediaShell).not.toBeNull();
    expect(mediaShell?.style.boxShadow).toBe(
      getCardShadowStyle({
        surface: "card-box-shadow",
        preset: "media",
        state: "hover",
        zIndex: 3,
        maxZIndex: 8,
      }).boxShadow
    );
  });
});
