import { describe, expect, it } from "vitest";
import type { CardData } from "@/types/canvas";
import {
  COLLAPSED_POSITIONS,
  getOffsets,
  getRotatedBoundingBox,
  STACK_OFFSET_PX,
} from "./card-layout";
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

  it("handles empty projects array", () => {
    const offsets = getOffsets(undefined, [], false, DEFAULT_FAN_CONFIG);
    expect(offsets).toEqual([]);
  });

  it("handles undefined cover when expanded", () => {
    const projects = [createMockCard("p1", 100, 100)];
    const offsets = getOffsets(undefined, projects, true, DEFAULT_FAN_CONFIG);
    expect(offsets[0].x).toBe(DEFAULT_FAN_CONFIG.expandGapPx);
  });

  it("handles cards with varying heights", () => {
    const cover = createMockCard("cover", 200, 200);
    const projects = [
      createMockCard("p1", 100, 150),
      createMockCard("p2", 100, 250),
      createMockCard("p3", 100, 180),
    ];
    const offsets = getOffsets(cover, projects, true, DEFAULT_FAN_CONFIG);

    expect(offsets[0].y).toBe(0);
    expect(offsets[1].y).toBe(0);
    expect(offsets[2].y).toBe(0);
  });

  it("handles negative gap values", () => {
    const cover = createMockCard("cover", 200, 200);
    const projects = [createMockCard("p1", 100, 100)];
    const customConfig = { ...DEFAULT_FAN_CONFIG, expandGapPx: -10 };
    const offsets = getOffsets(cover, projects, true, customConfig);
    expect(offsets[0].x).toBeLessThan(200);
  });

  it("handles zero width cover", () => {
    const cover = createMockCard("cover", 0, 200);
    const projects = [createMockCard("p1", 100, 100)];
    const offsets = getOffsets(cover, projects, true, DEFAULT_FAN_CONFIG);
    expect(offsets[0].x).toBe(DEFAULT_FAN_CONFIG.expandGapPx);
  });
});

describe("getRotatedBoundingBox", () => {
  it("returns same dimensions for 0 degree rotation", () => {
    const result = getRotatedBoundingBox(100, 200, 0);
    expect(result.width).toBe(100);
    expect(result.height).toBe(200);
  });

  it("calculates bounding box for 90 degree rotation", () => {
    const result = getRotatedBoundingBox(100, 200, 90);
    expect(result.width).toBeCloseTo(200);
    expect(result.height).toBeCloseTo(100);
  });

  it("calculates bounding box for 45 degree rotation", () => {
    const result = getRotatedBoundingBox(100, 100, 45);
    const expected = 100 * Math.cos(Math.PI / 4) + 100 * Math.sin(Math.PI / 4);
    expect(result.width).toBeCloseTo(expected);
    expect(result.height).toBeCloseTo(expected);
  });

  it("handles negative rotation angles", () => {
    const result = getRotatedBoundingBox(100, 200, -30);
    expect(result.width).toBeGreaterThan(100);
    expect(result.height).toBeGreaterThan(200);
  });

  it("handles extreme rotation angles", () => {
    const result1 = getRotatedBoundingBox(100, 100, 180);
    const result2 = getRotatedBoundingBox(100, 100, -180);
    expect(result1.width).toBeCloseTo(result2.width);
    expect(result1.height).toBeCloseTo(result2.height);
  });

  it("handles 180 degree rotation", () => {
    const result = getRotatedBoundingBox(100, 200, 180);
    expect(result.width).toBeCloseTo(100);
    expect(result.height).toBeCloseTo(200);
  });

  it("handles small angles", () => {
    const result = getRotatedBoundingBox(100, 100, 5);
    expect(result.width).toBeGreaterThan(100);
    expect(result.height).toBeGreaterThan(100);
  });
});

describe("COLLAPSED_POSITIONS", () => {
  it("has correct number of positions", () => {
    expect(COLLAPSED_POSITIONS).toHaveLength(2);
  });

  it("first position has rotation", () => {
    expect(COLLAPSED_POSITIONS[0].rotate).toBe(5);
  });

  it("first position has correct x and y", () => {
    expect(COLLAPSED_POSITIONS[0].x).toBe(24);
    expect(COLLAPSED_POSITIONS[0].y).toBe(24);
  });

  it("second position has no rotation", () => {
    expect(COLLAPSED_POSITIONS[1].rotate).toBe(0);
  });

  it("second position has correct x and y", () => {
    expect(COLLAPSED_POSITIONS[1].x).toBe(32);
    expect(COLLAPSED_POSITIONS[1].y).toBe(72);
  });
});
