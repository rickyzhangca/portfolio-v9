import { describe, expect, it } from "vitest";
import { DEFAULT_FAN_CONFIG } from "@/lib/fan";
import type { CanvasItem, CanvasStackItem } from "@/types/canvas";
import {
  computeRepulsionOffsets,
  computeStackCardRepulsion,
} from "./repulsion";

// Helper to create minimal mock stack items
const createMockGroup = (
  id: string,
  x: number,
  y: number,
  size = { height: 200, width: 200 }
): CanvasStackItem => ({
  cover: {
    content: { company: "Test", image: "" },
    id: `${id}-cover`,
    kind: "cover",
    size,
  },
  id,
  kind: "stack",
  position: { x, y },
  stack: [],
  zIndex: 1,
});

describe("computeRepulsionOffsets", () => {
  it("returns empty map when no expanded group provided", () => {
    const groups = new Map([
      ["g1", createMockGroup("g1", 0, 0)],
      ["g2", createMockGroup("g2", 100, 100)],
    ]);

    const offsets = computeRepulsionOffsets(groups, null);
    expect(offsets.size).toBe(0);
  });

  it("returns empty map when expanded group not found", () => {
    const groups = new Map([["g1", createMockGroup("g1", 0, 0)]]);
    const offsets = computeRepulsionOffsets(groups, "non-existent");
    expect(offsets.size).toBe(0);
  });

  it("returns zero offset for the expanded group itself", () => {
    const groups = new Map([["g1", createMockGroup("g1", 0, 0)]]);
    const offsets = computeRepulsionOffsets(groups, "g1");

    expect(offsets.get("g1")).toEqual({ x: 0, y: 0 });
  });

  it("pushes groups away based on distance", () => {
    // Expanded group at 0,0
    const g1 = createMockGroup("g1", 0, 0);
    // Target group at distance within radius
    const g2 = createMockGroup("g2", 100, 0); // 100px to the right

    const groups = new Map([
      ["g1", g1],
      ["g2", g2],
    ]);

    const config = { radiusPx: 200, strengthPx: 100 };
    const offsets = computeRepulsionOffsets(groups, "g1", config);

    const offsetG2 = offsets.get("g2");
    expect(offsetG2).toBeDefined();

    // Distance is 100, Radius is 200. t = 0.5.
    // Magnitude = strength * (1 - 0.5) = 50.
    // Direction is (1, 0).
    // Expected offset: { x: 50, y: 0 }
    expect(offsetG2?.x).toBeCloseTo(50);
    expect(offsetG2?.y).toBeCloseTo(0);
  });

  it("does not push groups outside radius", () => {
    const g1 = createMockGroup("g1", 0, 0);
    const g2 = createMockGroup("g2", 300, 0); // 300px away

    const groups = new Map([
      ["g1", g1],
      ["g2", g2],
    ]);

    const config = { radiusPx: 200, strengthPx: 100 };
    const offsets = computeRepulsionOffsets(groups, "g1", config);

    const offsetG2 = offsets.get("g2");
    expect(offsetG2).toEqual({ x: 0, y: 0 });
  });

  it("handles groups at exact same position (max push)", () => {
    const g1 = createMockGroup("g1", 0, 0);
    const g2 = createMockGroup("g2", 0, 0);

    const groups = new Map([
      ["g1", g1],
      ["g2", g2],
    ]);

    const config = { strengthPx: 100 };
    const offsets = computeRepulsionOffsets(groups, "g1", config);

    // Should push by full strength on X axis by default logic
    expect(offsets.get("g2")).toEqual({ x: 100, y: 0 });
  });

  it("respects default config values", () => {
    const g1 = createMockGroup("g1", 0, 0);
    // Put g2 very close so it gets pushed
    const g2 = createMockGroup("g2", 10, 0);

    const groups = new Map([
      ["g1", g1],
      ["g2", g2],
    ]);

    const offsets = computeRepulsionOffsets(groups, "g1");
    // Just verify it calculated something using defaults
    expect(offsets.get("g2")?.x).toBeGreaterThan(0);
  });
  it("pushes background items from an explicit article center instead of its cover", () => {
    const items = new Map<string, CanvasItem>([
      ["writing", createMockGroup("writing", 0, 0)],
      ["between", createMockGroup("between", 200, 0)],
    ]);
    const offsets = computeRepulsionOffsets(
      items,
      { center: { x: 500, y: 100 }, itemId: "writing" },
      { radiusPx: 1000, strengthPx: 100 }
    );
    expect(offsets.get("between")).toEqual({ x: -80, y: 0 });
    expect(offsets.get("writing")).toEqual({ x: 0, y: 0 });
  });
});

const writingStack = (count = 3): CanvasStackItem => ({
  ...createMockGroup("writing", 700, 900),
  pageSize: 6,
  stack: Array.from({ length: count }, (_, index) => ({
    content: { slug: "ephemeral-design" },
    id: `article-${index}`,
    kind: "article",
    size: { height: 200, width: 100 },
  })),
});

describe("nested article repulsion", () => {
  it("pushes the cover and sibling cards away from the active card, leaving its anchor fixed", () => {
    const stack = writingStack();
    const result = computeStackCardRepulsion({
      cardId: "article-1",
      config: { radiusPx: 1000, strengthPx: 100 },
      fanConfig: {
        ...DEFAULT_FAN_CONFIG,
        arcStepPx: 0,
        expandGapPx: 20,
        rotateStepDeg: 0,
      },
      stack,
    });
    expect(result?.source).toEqual({
      center: { x: 1090, y: 1000 },
      itemId: "writing",
    });
    expect(result?.offsets.get("article-1")).toEqual({ x: 0, y: 0 });
    expect(result?.offsets.get("writing-cover")?.x).toBeCloseTo(-71);
    expect(result?.offsets.get("article-0")?.x).toBeCloseTo(-88);
    expect(result?.offsets.get("article-2")?.x).toBeCloseTo(88);
    expect(stack.position).toEqual({ x: 700, y: 900 });
  });
  it("uses rotation around the top-left corner and the arc on the current page", () => {
    const result = computeStackCardRepulsion({
      cardId: "article-6",
      fanConfig: {
        ...DEFAULT_FAN_CONFIG,
        arcStepPx: 7,
        expandGapPx: 20,
        rotateStepDeg: 90,
      },
      page: 1,
      stack: writingStack(1000),
    });
    expect(result?.source.center.x).toBeCloseTo(820);
    expect(result?.source.center.y).toBeCloseTo(957);
    expect(result?.offsets.size).toBe(7);
    expect(result?.offsets.has("article-0")).toBe(false);
    expect(result?.offsets.get("article-6")).toEqual({ x: 0, y: 0 });
  });
  it.each(["removed-card", "writing-cover", "article-6"])(
    "rejects an absent or unmounted source %s instead of using the cover center",
    (cardId) => {
      expect(
        computeStackCardRepulsion({
          cardId,
          fanConfig: DEFAULT_FAN_CONFIG,
          stack: writingStack(12),
        })
      ).toBeNull();
    }
  );
});
