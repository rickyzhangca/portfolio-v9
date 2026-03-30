import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getCardShadowStyle } from "@/lib/card-shadow";
import { getShadowLighting } from "@/lib/shadow-lighting";
import { ProjectCard } from "./project-card";

describe("ProjectCard", () => {
  it("applies shared surface shadow styles to the image shell", () => {
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
        role: "surface",
        state: "expanded",
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

  it("uses shared accent shadow styles for project metadata pills", () => {
    render(
      <ProjectCard
        content={{
          title: "Demo",
          description: "Shadow cleanup",
          image: "/demo.png",
        }}
        shadowContext={{ maxZIndex: 8, zIndex: 3 }}
      />
    );

    expect(screen.getByText("Demo").parentElement?.style.boxShadow).toBe(
      getCardShadowStyle({
        surface: "card-box-shadow",
        role: "accent",
        tone: "soft",
        state: "expanded",
        zIndex: 3,
        maxZIndex: 8,
      }).boxShadow
    );
    expect(screen.getByText("Shadow cleanup").style.boxShadow).toBe(
      getCardShadowStyle({
        surface: "card-box-shadow",
        role: "accent",
        tone: "soft",
        state: "expanded",
        zIndex: 3,
        maxZIndex: 8,
      }).boxShadow
    );
  });
});
