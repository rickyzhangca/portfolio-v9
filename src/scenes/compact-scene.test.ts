import { describe, expect, it } from "vitest";
import type { CanvasItem } from "@/types/canvas";
import { createCompactScene } from "./compact-scene";
import { initialItems } from "./home-scene";

const footprint = (item: CanvasItem) => {
  if (item.kind === "single") {
    return {
      height: item.card.size.height ?? 0,
      width: item.card.size.width ?? 0,
    };
  }
  const size = item.kind === "funstack" ? item.card.size : item.cover.size;
  return { height: size.height ?? 0, width: size.width ?? 0 };
};

describe("createCompactScene", () => {
  it("keeps every card of the desktop scene", () => {
    const scene = createCompactScene(initialItems, 390);
    expect(scene.map((item) => item.id).sort()).toEqual(
      initialItems.map((item) => item.id).sort()
    );
  });

  it("does not mutate the desktop scene", () => {
    const before = JSON.stringify(initialItems.map((item) => item.position));
    createCompactScene(initialItems, 390);
    expect(JSON.stringify(initialItems.map((item) => item.position))).toBe(
      before
    );
  });

  it("reads top to bottom with the introduction first", () => {
    const scene = createCompactScene(initialItems, 390);
    expect(scene[0]?.id).toBe("profilepic-item");
    const ys = scene.map((item) => item.position.y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    expect(new Set(ys).size).toBe(ys.length);
  });

  it("never overlaps a card with the one above it", () => {
    const scene = createCompactScene(initialItems, 390);
    for (let index = 1; index < scene.length; index += 1) {
      const above = scene[index - 1];
      const item = scene[index];
      if (above && item) {
        expect(item.position.y).toBeGreaterThanOrEqual(
          above.position.y + (above.kind ? footprint(above).height : 0)
        );
      }
    }
  });

  it.each([360, 390, 430, 600])(
    "keeps cards inside a %ipx wide screen",
    (viewportWidth) => {
      for (const item of createCompactScene(initialItems, viewportWidth)) {
        const { width } = footprint(item);
        expect(item.position.x).toBeGreaterThanOrEqual(0);
        // Fixed-size cards may touch the edge but not spill over it.
        expect(item.position.x + (width || 0)).toBeLessThanOrEqual(
          viewportWidth
        );
      }
    }
  );

  it("shrinks project cards that are wider than the screen", () => {
    const scene = createCompactScene(initialItems, 360);
    for (const item of scene) {
      if (item.kind !== "stack") {
        continue;
      }
      for (const card of item.stack) {
        if (card.kind === "project") {
          expect(card.size.width).toBeLessThanOrEqual(360 - 32);
        }
      }
    }
  });

  it("leaves room above the swag cover for the items that fan out over it", () => {
    const scene = createCompactScene(initialItems, 390);
    const swagIndex = scene.findIndex((item) => item.id === "swag-stack");
    const swag = scene[swagIndex];
    const above = scene[swagIndex - 1];
    if (!(swag && above)) {
      throw new Error("Swag must follow another card");
    }
    // Collapsed swag rises 40px above its cover; keep that clear of the row above.
    expect(
      swag.position.y - (above.position.y + footprint(above).height)
    ).toBeGreaterThanOrEqual(40 + 40);
  });
});
