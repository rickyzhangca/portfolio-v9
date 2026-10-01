import { describe, expect, it } from "vitest";
import {
  createMockCard,
  createMockCover,
  createMockSingle,
  createMockStack,
} from "@/test-utils/test-helpers";
import { getCanvasCard } from "./canvas-card";

describe("canvas document identity", () => {
  it("resolves the actual nested card instead of treating the folder as a document", () => {
    const card = createMockCard("article");
    const cover = createMockCover("cover");
    const stack = createMockStack("folder", 0, 0, 1, cover, [card]);
    expect(getCanvasCard(stack, card.id)).toBe(card);
    expect(getCanvasCard(stack, cover.id)).toBe(cover);
    expect(getCanvasCard(stack)).toBeUndefined();
    expect(getCanvasCard(stack, "removed-card")).toBeUndefined();
  });
  it("retains single-card activation and rejects mismatched card IDs", () => {
    const item = createMockSingle("resume");
    expect(getCanvasCard(item)).toBe(item.card);
    expect(getCanvasCard(item, item.card.id)).toBe(item.card);
    expect(getCanvasCard(item, "another-card")).toBeUndefined();
  });
});
