import { describe, expect, it } from "vitest";
import type { ProjectCardInstance } from "@/cards/registry";
import type { CardInstance } from "@/cards/types";
import { getAutoPanTarget } from "@/lib/auto-pan";
import { createMockCover, createMockStack } from "@/test-utils/test-helpers";
import {
  getExpandedStackLayout,
  getOffsets,
  getRotatedBoundingBox,
  getStackPage,
  STACK_OFFSET_PX,
} from "./card-layout";
import { DEFAULT_FAN_CONFIG } from "./fan";

const createMockCard = (
  id: string,
  width = 100,
  height = 100
): ProjectCardInstance => ({
  content: { description: "Test", image: "", title: "Test" },
  id,
  kind: "project",
  size: { height, width },
});

describe("bounded stack pages", () => {
  it("includes the actual left edge when a card rotates around its top-left corner", () => {
    const config = {
      ...DEFAULT_FAN_CONFIG,
      arcStepPx: 0,
      expandGapPx: 0,
      rotateStepDeg: 45,
    };
    const layout = getExpandedStackLayout(
      undefined,
      [createMockCard("rotated", 100, 200)],
      config
    );
    expect(layout.bounds.minX).toBeCloseTo(-200 * Math.sin(Math.PI / 4));
    expect(layout.bounds.maxX).toBeCloseTo(100 * Math.cos(Math.PI / 4));
    expect(layout.bounds.maxY).toBeCloseTo(300 * Math.sin(Math.PI / 4));
  });
  it.each([3, 100, 1000])(
    "limits layout work for %s cards to the current page",
    (count) => {
      const cards = Array.from({ length: count }, (_, index) =>
        createMockCard(`p${index}`, 240, 360)
      );
      const stack = {
        ...createMockStack(
          "writing",
          0,
          0,
          1,
          createMockCover("cover", 240, 340),
          cards
        ),
        pageSize: 6,
      };
      const page = getStackPage(stack, 0);
      expect(page.cards).toHaveLength(Math.min(count, 6));
      expect(page.pageCount).toBe(Math.ceil(count / 6));
      const layout = getExpandedStackLayout(
        stack.cover,
        page.cards,
        DEFAULT_FAN_CONFIG
      );
      expect(layout.placements).toHaveLength(Math.min(count, 6));
      const smallStack = { ...stack, stack: cards.slice(0, 6) };
      expect(
        getAutoPanTarget(
          stack,
          DEFAULT_FAN_CONFIG,
          { positionX: 0, positionY: 0, scale: 1 },
          800,
          600
        )
      ).toEqual(
        getAutoPanTarget(
          smallStack,
          DEFAULT_FAN_CONFIG,
          { positionX: 0, positionY: 0, scale: 1 },
          800,
          600
        )
      );
    }
  );
  it("clamps invalid pages and exposes the final partial page", () => {
    const stack = {
      ...createMockStack(
        "writing",
        0,
        0,
        1,
        createMockCover("cover"),
        Array.from({ length: 14 }, (_, index) => createMockCard(`p${index}`))
      ),
      pageSize: 6,
    };
    expect(getStackPage(stack, 999).cards.map(({ id }) => id)).toEqual([
      "p12",
      "p13",
    ]);
    expect(getStackPage(stack, -1).page).toBe(0);
    expect(getStackPage(stack, Number.NaN).page).toBe(0);
    expect(getStackPage({ ...stack, stack: [] }).pageCount).toBe(1);
  });
});

describe("getOffsets", () => {
  it("returns stacked offsets when not expanded", () => {
    const projects = [
      createMockCard("p1"),
      createMockCard("p2"),
      createMockCard("p3"),
    ];

    const offsets = getOffsets(
      {} as CardInstance,
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
