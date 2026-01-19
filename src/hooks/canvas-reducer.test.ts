import { describe, expect, it } from "vitest";
import type { CanvasState, CanvasStackItem } from "@/types/canvas";
import { canvasReducer } from "./use-canvas-state";

// Helper to create mock state
const createMockState = (items: CanvasStackItem[] = []): CanvasState => {
  const itemsMap = new Map();
  let maxZIndex = 0;
  for (const item of items) {
    itemsMap.set(item.id, item);
    maxZIndex = Math.max(maxZIndex, item.zIndex);
  }
  return {
    items: itemsMap,
    selectedItemId: null,
    expandedStackId: null,
    maxZIndex,
    viewportState: { scale: 1, positionX: 0, positionY: 0 },
  };
};

// Helper for minimal mock stack item
const createMockStack = (
  id: string,
  x = 0,
  y = 0,
  zIndex = 1
): CanvasStackItem => ({
  id,
  kind: "stack",
  position: { x, y },
  zIndex,
  cover: {
    id: "c",
    type: "cover",
    size: { width: 100 },
    content: { company: "C", image: "" },
  },
  stack: [],
});

describe("canvasReducer", () => {
  it("UPDATE_ITEM_POSITION updates position correctly", () => {
    const i1 = createMockStack("i1", 0, 0);
    const state = createMockState([i1]);

    const newState = canvasReducer(state, {
      type: "UPDATE_ITEM_POSITION",
      payload: { id: "i1", position: { x: 100, y: 100 } },
    });

    expect(newState.items.get("i1")?.position).toEqual({ x: 100, y: 100 });
  });

  it("UPDATE_ITEM_POSITION is no-op if position hasn't changed", () => {
    const i1 = createMockStack("i1", 0, 0);
    const state = createMockState([i1]);

    const newState = canvasReducer(state, {
      type: "UPDATE_ITEM_POSITION",
      payload: { id: "i1", position: { x: 0, y: 0 } },
    });

    expect(newState).toBe(state); // Reference equality check
  });

  it("BRING_ITEM_TO_FRONT increments maxZIndex", () => {
    const i1 = createMockStack("i1", 0, 0, 1);
    const i2 = createMockStack("i2", 100, 100, 2);
    const state = createMockState([i1, i2]);

    const newState = canvasReducer(state, {
      type: "BRING_ITEM_TO_FRONT",
      payload: { id: "i1" },
    });

    expect(newState.maxZIndex).toBe(3);
    expect(newState.items.get("i1")?.zIndex).toBe(3);
  });

  it("RESET_ITEMS restores initial state", () => {
    const i1 = createMockStack("original", 0, 0);
    const state = createMockState([i1]);

    // Modify state
    const modifiedState = canvasReducer(state, {
      type: "UPDATE_ITEM_POSITION",
      payload: { id: "original", position: { x: 500, y: 500 } },
    });

    // Reset
    const resetState = canvasReducer(modifiedState, {
      type: "RESET_ITEMS",
      payload: { initialItems: [i1] },
    });

    expect(resetState.items.get("original")?.position).toEqual({ x: 0, y: 0 });
  });

  it("handles non-existent item IDs gracefully", () => {
    const state = createMockState([]);
    const newState = canvasReducer(state, {
      type: "UPDATE_ITEM_POSITION",
      payload: { id: "missing", position: { x: 10, y: 10 } },
    });

    expect(newState).toBe(state);
  });
});
