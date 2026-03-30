import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getCardShadowStyle } from "@/lib/card-shadow";
import { getShadowLighting } from "@/lib/shadow-lighting";
import { SocialsCard } from "./socials-card";

describe("SocialsCard", () => {
  it("uses shared accent shadow styles for the main shell and keys", () => {
    const { container } = render(
      <SocialsCard
        content={{
          linkedinUrl: "https://linkedin.test",
          twitterUrl: "https://twitter.test",
        }}
        shadowContext={{}}
      />
    );

    const shell = container.querySelector(
      "[data-shadow-surface='socials-shell']"
    ) as HTMLDivElement | null;
    const key = container.querySelector(
      "[data-shadow-surface='socials-key']"
    ) as HTMLDivElement | null;

    expect(shell?.style.boxShadow).toBe(
      getCardShadowStyle({
        surface: "card-box-shadow",
        z: 6,
        objectHeight: 96,
      }).boxShadow
    );
    expect(key?.style.boxShadow).toBe(
      getCardShadowStyle({
        surface: "card-box-shadow",
        z: 4,
        objectHeight: 72,
      }).boxShadow
    );
  });

  it("updates shared accent shadows when lighting changes", () => {
    const { container, rerender } = render(
      <SocialsCard
        content={{
          linkedinUrl: "https://linkedin.test",
          twitterUrl: "https://twitter.test",
        }}
        shadowContext={{
          lighting: getShadowLighting(8, "live"),
        }}
      />
    );

    const shell = container.querySelector(
      "[data-shadow-surface='socials-shell']"
    ) as HTMLDivElement | null;
    const morningShadow = shell?.style.boxShadow;

    rerender(
      <SocialsCard
        content={{
          linkedinUrl: "https://linkedin.test",
          twitterUrl: "https://twitter.test",
        }}
        shadowContext={{
          lighting: getShadowLighting(16, "live"),
        }}
      />
    );

    const updatedShell = container.querySelector(
      "[data-shadow-surface='socials-shell']"
    ) as HTMLDivElement | null;

    expect(updatedShell?.style.boxShadow).not.toBe(morningShadow);
  });
});
