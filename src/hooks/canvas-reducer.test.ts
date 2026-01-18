import { describe, expect, it } from "vitest";
import type { CanvasState, CardGroupData } from "@/types/canvas";
import { canvasReducer } from "./use-canvas-state";

// Helper to create mock state
const createMockState = (groups: CardGroupData[] = []): CanvasState => {
  const groupsMap = new Map();
  let maxZIndex = 0;
  for (const g of groups) {
    groupsMap.set(g.id, g);
    maxZIndex = Math.max(maxZIndex, g.zIndex);
  }
  return {
    groups: groupsMap,
    selectedGroupId: null,
    expandedGroupId: null,
    maxZIndex,
    viewportState: { scale: 1, positionX: 0, positionY: 0 },
  };
};

// Helper for minimal mock group
const createMockGroup = (
  id: string,
  x = 0,
  y = 0,
  zIndex = 1
): CardGroupData => ({
  id,
  position: { x, y },
  zIndex,
  cover: {
    id: "c",
    type: "company",
    size: { width: 100 },
    content: { company: "C", image: "" },
  },
  projects: [],
});

describe("canvasReducer", () => {
  it("UPDATE_GROUP_POSITION updates position correctly", () => {
    const g1 = createMockGroup("g1", 0, 0);
    const state = createMockState([g1]);

    const newState = canvasReducer(state, {
      type: "UPDATE_GROUP_POSITION",
      payload: { id: "g1", position: { x: 100, y: 100 } },
    });

    expect(newState.groups.get("g1")?.position).toEqual({ x: 100, y: 100 });
  });

  it("UPDATE_GROUP_POSITION is no-op if position hasn't changed", () => {
    const g1 = createMockGroup("g1", 0, 0);
    const state = createMockState([g1]);

    const newState = canvasReducer(state, {
      type: "UPDATE_GROUP_POSITION",
      payload: { id: "g1", position: { x: 0, y: 0 } },
    });

    expect(newState).toBe(state); // Reference equality check
  });

  it("BRING_GROUP_TO_FRONT increments maxZIndex", () => {
    const g1 = createMockGroup("g1", 0, 0, 1);
    const g2 = createMockGroup("g2", 100, 100, 2);
    const state = createMockState([g1, g2]);

    const newState = canvasReducer(state, {
      type: "BRING_GROUP_TO_FRONT",
      payload: { id: "g1" },
    });

    expect(newState.maxZIndex).toBe(3);
    expect(newState.groups.get("g1")?.zIndex).toBe(3);
  });

  it("RESET_GROUPS restores initial state", () => {
    const g1 = createMockGroup("original", 0, 0);
    const state = createMockState([g1]);

    // Modify state
    const modifiedState = canvasReducer(state, {
      type: "UPDATE_GROUP_POSITION",
      payload: { id: "original", position: { x: 500, y: 500 } },
    });

    // Reset
    const resetState = canvasReducer(modifiedState, {
      type: "RESET_GROUPS",
      payload: { initialGroups: [g1] },
    });

    expect(resetState.groups.get("original")?.position).toEqual({ x: 0, y: 0 });
  });

  it("handles non-existent group IDs gracefully", () => {
    const state = createMockState([]);
    const newState = canvasReducer(state, {
      type: "UPDATE_GROUP_POSITION",
      payload: { id: "missing", position: { x: 10, y: 10 } },
    });

    expect(newState).toBe(state);
  });
});
