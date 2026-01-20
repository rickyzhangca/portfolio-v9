import { describe, expect, it } from "vitest";
import type { CanvasStackItem } from "@/types/canvas";
import { computeRepulsionOffsets } from "./repulsion";

// Helper to create minimal mock stack items
const createMockGroup = (
  id: string,
  x: number,
  y: number,
  size = { width: 200, height: 200 }
): CanvasStackItem => ({
  id,
  position: { x, y },
  zIndex: 1,
  kind: "stack",
  cover: {
    id: `${id}-cover`,
    kind: "cover",
    size,
    content: { company: "Test", image: "" },
  },
  stack: [],
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
});
