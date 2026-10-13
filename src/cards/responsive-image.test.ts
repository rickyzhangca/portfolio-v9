import { describe, expect, it } from "vitest";
import { companyStacks } from "@/scenes/data/companies";
import { writingStack } from "@/scenes/data/writing";
import { getResponsiveImageSources } from "./responsive-image";

const SMALL_VARIANT = /-2x\.webp$/;

const cardImages = [...companyStacks, writingStack].flatMap((stack) => [
  ...("image" in stack.cover.content && stack.cover.content.image
    ? [stack.cover.content.image]
    : []),
  ...stack.stack.flatMap((card) =>
    card.kind === "project" ? [card.content.image] : []
  ),
]);

describe("getResponsiveImageSources", () => {
  it("serves every cover and project screenshot from its 2x copy below 3x", () => {
    expect(cardImages).toHaveLength(31 + 6);
    for (const image of cardImages) {
      const { src, srcSet } = getResponsiveImageSources(image);
      expect(src).toMatch(SMALL_VARIANT);
      expect(srcSet).toBe(`${src} 2x, ${image} 3x`);
    }
  });

  it("leaves images without a smaller copy unchanged", () => {
    expect(getResponsiveImageSources("/elsewhere/photo.webp")).toEqual({
      src: "/elsewhere/photo.webp",
    });
  });
});
