import { describe, expect, it } from "vitest";
import type { CardData } from "@/types/canvas";
import { getOffsets, STACK_OFFSET_PX } from "./card-layout";
import { DEFAULT_FAN_CONFIG } from "./fan";

const createMockCard = (id: string, width = 100, height = 100): CardData => ({
  id,
  type: "project",
  size: { width, height },
  content: { title: "Test", description: "Test", image: "" },
});

describe("getOffsets", () => {
  it("returns stacked offsets when not expanded", () => {
    const projects = [
      createMockCard("p1"),
      createMockCard("p2"),
      createMockCard("p3"),
    ];

    const offsets = getOffsets(
      {} as CardData,
      projects,
      false,
      DEFAULT_FAN_CONFIG
    );

    expect(offsets).toHaveLength(3);
    offsets.forEach((offset, index) => {
      expect(offset.x).toBe(index * STACK_OFFSET_PX);
      expect(offset.y).toBe(index * STACK_OFFSET_PX);
    });
  });

  it("calculates fan layout when expanded", () => {
    const cover = createMockCard("cover", 200, 200);
    const projects = [
      createMockCard("p1", 100, 100),
      createMockCard("p2", 100, 100),
    ];

    // config: gap 18px
    const offsets = getOffsets(cover, projects, true, DEFAULT_FAN_CONFIG);

    // First project should be at coverWidth + gap
    const expectedX1 = 200 + DEFAULT_FAN_CONFIG.expandGapPx;
    expect(offsets[0].x).toBe(expectedX1);
    expect(offsets[0].y).toBe(0);

    // Second project should be further right
    expect(offsets[1].x).toBeGreaterThan(expectedX1);
  });

  it("wraps to next row after MAX_PER_ROW", () => {
    const cover = createMockCard("cover", 200, 200);
    // 4 projects. Max per row is 3. So 4th should be on next row.
    const projects = [
      createMockCard("p1"),
      createMockCard("p2"),
      createMockCard("p3"),
      createMockCard("p4"),
    ];

    const offsets = getOffsets(cover, projects, true, DEFAULT_FAN_CONFIG);

    // First 3 should be on row 0 (y=0)
    expect(offsets[0].y).toBe(0);
    expect(offsets[1].y).toBe(0);
    expect(offsets[2].y).toBe(0);

    // 4th should be on next row (y > 0)
    expect(offsets[3].y).toBeGreaterThan(0);
    // 4th should start at same X as first column (coverWidth + gap)
    expect(offsets[3].x).toBe(200 + DEFAULT_FAN_CONFIG.expandGapPx);
  });
});
