import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getCardShadowStyle } from "@/lib/card-shadow";
import { getShadowLighting } from "@/lib/shadow-lighting";
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

  it("updates the media shell when the lighting changes", () => {
    const { rerender } = render(
      <ProjectCard
        content={{
          title: "Demo",
          image: "/demo.png",
        }}
        shadowContext={{
          maxZIndex: 8,
          zIndex: 3,
          lighting: getShadowLighting(8, "live"),
        }}
      />
    );

    const mediaShell = screen.getByAltText("Demo").parentElement;
    const morningShadow = mediaShell?.style.boxShadow;

    rerender(
      <ProjectCard
        content={{
          title: "Demo",
          image: "/demo.png",
        }}
        shadowContext={{
          maxZIndex: 8,
          zIndex: 3,
          lighting: getShadowLighting(16, "live"),
        }}
      />
    );

    expect(screen.getByAltText("Demo").parentElement?.style.boxShadow).not.toBe(
      morningShadow
    );
  });
});
