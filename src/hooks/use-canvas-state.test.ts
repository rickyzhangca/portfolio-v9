import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createMockFunStack,
  createMockSingle,
  createMockStack,
  createMockSwagStack,
} from "@/test-utils/test-helpers";
import type { CanvasItem } from "@/types/canvas";
import { canvasReducer, useCanvasState } from "./use-canvas-state";

describe("useCanvasState - Reducer Action Coverage", () => {
  const createMockState = (items: CanvasItem[] = []) => {
    const itemsMap = new Map<string, CanvasItem>();
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
      focusedItemId: null,
    };
  };

  describe("UPDATE_ITEM_POSITION", () => {
    it("updates position when changed", () => {
      const i1 = createMockStack("i1", 0, 0);
      const state = createMockState([i1]);
      const newState = canvasReducer(state, {
        type: "UPDATE_ITEM_POSITION",
        payload: { id: "i1", position: { x: 100, y: 100 } },
      });
      expect(newState.items.get("i1")?.position).toEqual({ x: 100, y: 100 });
    });

    it("returns same state reference when position unchanged", () => {
      const i1 = createMockStack("i1", 0, 0);
      const state = createMockState([i1]);
      const newState = canvasReducer(state, {
        type: "UPDATE_ITEM_POSITION",
        payload: { id: "i1", position: { x: 0, y: 0 } },
      });
      expect(newState).toBe(state);
    });

    it("returns same state when item not found", () => {
      const state = createMockState([]);
      const newState = canvasReducer(state, {
        type: "UPDATE_ITEM_POSITION",
        payload: { id: "missing", position: { x: 10, y: 10 } },
      });
      expect(newState).toBe(state);
    });
  });

  describe("BRING_ITEM_TO_FRONT", () => {
    it("increments zIndex and maxZIndex", () => {
      const i1 = createMockStack("i1", 0, 0, 1);
      const state = createMockState([i1]);
      const newState = canvasReducer(state, {
        type: "BRING_ITEM_TO_FRONT",
        payload: { id: "i1" },
      });
      expect(newState.items.get("i1")?.zIndex).toBe(2);
      expect(newState.maxZIndex).toBe(2);
    });

    it("returns same state when item not found", () => {
      const state = createMockState([]);
      const newState = canvasReducer(state, {
        type: "BRING_ITEM_TO_FRONT",
        payload: { id: "missing" },
      });
      expect(newState).toBe(state);
    });
  });

  describe("SELECT_ITEM", () => {
    it("updates selectedItemId", () => {
      const state = createMockState([]);
      const newState = canvasReducer(state, {
        type: "SELECT_ITEM",
        payload: { id: "i1" },
      });
      expect(newState.selectedItemId).toBe("i1");
    });

    it("can set selectedItemId to null", () => {
      const state = createMockState([]);
      const newState = canvasReducer(state, {
        type: "SELECT_ITEM",
        payload: { id: null },
      });
      expect(newState.selectedItemId).toBeNull();
    });
  });

  describe("SET_EXPANDED_STACK", () => {
    it("updates expandedStackId", () => {
      const state = createMockState([]);
      const newState = canvasReducer(state, {
        type: "SET_EXPANDED_STACK",
        payload: { id: "s1" },
      });
      expect(newState.expandedStackId).toBe("s1");
    });

    it("can set expandedStackId to null", () => {
      const state = createMockState([]);
      const newState = canvasReducer(state, {
        type: "SET_EXPANDED_STACK",
        payload: { id: null },
      });
      expect(newState.expandedStackId).toBeNull();
    });
  });

  describe("SET_FOCUSED_ITEM", () => {
    it("updates focusedItemId", () => {
      const state = createMockState([]);
      const newState = canvasReducer(state, {
        type: "SET_FOCUSED_ITEM",
        payload: { id: "i1" },
      });
      expect(newState.focusedItemId).toBe("i1");
    });

    it("can set focusedItemId to null", () => {
      const state = createMockState([]);
      const newState = canvasReducer(state, {
        type: "SET_FOCUSED_ITEM",
        payload: { id: null },
      });
      expect(newState.focusedItemId).toBeNull();
    });
  });

  describe("UPDATE_VIEWPORT", () => {
    it("updates viewportState", () => {
      const state = createMockState([]);
      const newState = canvasReducer(state, {
        type: "UPDATE_VIEWPORT",
        payload: { scale: 2, positionX: 100, positionY: 200 },
      });
      expect(newState.viewportState).toEqual({
        scale: 2,
        positionX: 100,
        positionY: 200,
      });
    });

    it("returns same state reference when viewport values are unchanged", () => {
      const state = createMockState([]);
      const newState = canvasReducer(state, {
        type: "UPDATE_VIEWPORT",
        payload: { scale: 1, positionX: 0, positionY: 0 },
      });
      expect(newState).toBe(state);
    });
  });

  describe("LOAD_STATE", () => {
    it("merges payload into state", () => {
      const state = createMockState([]);
      const itemsMap = new Map();
      itemsMap.set("s1", createMockStack("s1", 0, 0, 5));
      const newState = canvasReducer(state, {
        type: "LOAD_STATE",
        payload: { items: itemsMap, maxZIndex: 5 },
      });
      expect(newState.items.get("s1")).toBeDefined();
      expect(newState.maxZIndex).toBe(5);
    });

    it("preserves existing state properties not in payload", () => {
      const state = createMockState([]);
      const stateWithSelection = { ...state, selectedItemId: "test" };
      const newState = canvasReducer(stateWithSelection, {
        type: "LOAD_STATE",
        payload: { items: new Map(), maxZIndex: 1 },
      });
      expect(newState.selectedItemId).toBe("test");
    });
  });

  describe("ADD_ITEM", () => {
    it("adds stack item with incremented zIndex", () => {
      const s1 = createMockStack("s1", 0, 0, 1);
      const state = createMockState([s1]);
      const s2 = createMockStack("s2", 100, 100, 0);
      const newState = canvasReducer(state, {
        type: "ADD_ITEM",
        payload: s2,
      });
      expect(newState.items.has("s2")).toBe(true);
      expect(newState.items.get("s2")?.zIndex).toBe(2);
      expect(newState.maxZIndex).toBe(2);
    });

    it("adds single item with incremented zIndex", () => {
      const s1 = createMockSingle("s1", 0, 0, 1);
      const state = createMockState([s1]);
      const s2 = createMockSingle("s2", 100, 100, 0);
      const newState = canvasReducer(state, {
        type: "ADD_ITEM",
        payload: s2,
      });
      expect(newState.items.has("s2")).toBe(true);
      expect(newState.items.get("s2")?.zIndex).toBe(2);
      expect(newState.maxZIndex).toBe(2);
    });
  });

  describe("DELETE_ITEM", () => {
    it("removes item from items", () => {
      const i1 = createMockStack("i1", 0, 0);
      const state = createMockState([i1]);
      const newState = canvasReducer(state, {
        type: "DELETE_ITEM",
        payload: { id: "i1" },
      });
      expect(newState.items.has("i1")).toBe(false);
    });

    it("clears selectedItemId when deleted item was selected", () => {
      const i1 = createMockStack("i1", 0, 0);
      const state = createMockState([i1]);
      const stateWithSelection = {
        ...state,
        selectedItemId: "i1" as string | null,
      };
      const newState = canvasReducer(stateWithSelection, {
        type: "DELETE_ITEM",
        payload: { id: "i1" },
      });
      expect(newState.selectedItemId).toBeNull();
    });

    it("preserves selectedItemId when different item deleted", () => {
      const i1 = createMockStack("i1", 0, 0);
      const i2 = createMockStack("i2", 100, 100);
      const state = createMockState([i1, i2]);
      const stateWithSelection = {
        ...state,
        selectedItemId: "i1" as string | null,
      };
      const newState = canvasReducer(stateWithSelection, {
        type: "DELETE_ITEM",
        payload: { id: "i2" },
      });
      expect(newState.selectedItemId).toBe("i1");
    });

    it("clears expandedStackId when deleted stack was expanded", () => {
      const s1 = createMockStack("s1", 0, 0);
      const state = createMockState([s1]);
      const stateWithExpansion = {
        ...state,
        expandedStackId: "s1" as string | null,
      };
      const newState = canvasReducer(stateWithExpansion, {
        type: "DELETE_ITEM",
        payload: { id: "s1" },
      });
      expect(newState.expandedStackId).toBeNull();
    });

    it("preserves expandedStackId when different stack deleted", () => {
      const s1 = createMockStack("s1", 0, 0);
      const s2 = createMockStack("s2", 100, 100);
      const state = createMockState([s1, s2]);
      const stateWithExpansion = {
        ...state,
        expandedStackId: "s1" as string | null,
      };
      const newState = canvasReducer(stateWithExpansion, {
        type: "DELETE_ITEM",
        payload: { id: "s2" },
      });
      expect(newState.expandedStackId).toBe("s1");
    });

    it("clears focusedItemId when deleted item was focused", () => {
      const i1 = createMockStack("i1", 0, 0);
      const state = createMockState([i1]);
      const stateWithFocus = {
        ...state,
        focusedItemId: "i1" as string | null,
      };
      const newState = canvasReducer(stateWithFocus, {
        type: "DELETE_ITEM",
        payload: { id: "i1" },
      });
      expect(newState.focusedItemId).toBeNull();
    });
  });

  describe("RESET_ITEMS", () => {
    it("restores initial item positions", () => {
      const s1 = createMockStack("s1", 100, 100, 1);
      const state = createMockState([s1]);
      const modifiedState = canvasReducer(state, {
        type: "UPDATE_ITEM_POSITION",
        payload: { id: "s1", position: { x: 999, y: 999 } },
      });
      const resetState = canvasReducer(modifiedState, {
        type: "RESET_ITEMS",
        payload: { initialItems: [s1] },
      });
      expect(resetState.items.get("s1")?.position).toEqual({ x: 100, y: 100 });
    });

    it("clears selectedItemId", () => {
      const s1 = createMockStack("s1", 0, 0);
      const state = createMockState([s1]);
      const modifiedState = { ...state, selectedItemId: "s1" as string | null };
      const resetState = canvasReducer(modifiedState, {
        type: "RESET_ITEMS",
        payload: { initialItems: [s1] },
      });
      expect(resetState.selectedItemId).toBeNull();
    });

    it("clears expandedStackId", () => {
      const s1 = createMockStack("s1", 0, 0);
      const state = createMockState([s1]);
      const modifiedState = {
        ...state,
        expandedStackId: "s1" as string | null,
      };
      const resetState = canvasReducer(modifiedState, {
        type: "RESET_ITEMS",
        payload: { initialItems: [s1] },
      });
      expect(resetState.expandedStackId).toBeNull();
    });

    it("clears focusedItemId", () => {
      const s1 = createMockStack("s1", 0, 0);
      const state = createMockState([s1]);
      const modifiedState = {
        ...state,
        focusedItemId: "s1" as string | null,
      };
      const resetState = canvasReducer(modifiedState, {
        type: "RESET_ITEMS",
        payload: { initialItems: [s1] },
      });
      expect(resetState.focusedItemId).toBeNull();
    });

    it("restores maxZIndex from initial items", () => {
      const s1 = createMockStack("s1", 0, 0, 5);
      const state = createMockState([s1]);
      const resetState = canvasReducer(state, {
        type: "RESET_ITEMS",
        payload: { initialItems: [s1] },
      });
      expect(resetState.maxZIndex).toBe(5);
    });

    it("handles multiple items", () => {
      const s1 = createMockStack("s1", 0, 0, 1);
      const s2 = createMockStack("s2", 100, 100, 2);
      const state = createMockState([s1, s2]);
      const resetState = canvasReducer(state, {
        type: "RESET_ITEMS",
        payload: { initialItems: [s1, s2] },
      });
      expect(resetState.items.size).toBe(2);
      expect(resetState.maxZIndex).toBe(2);
    });

    it("handles mixed single and stack items", () => {
      const s1 = createMockSingle("single1", 0, 0, 1);
      const s2 = createMockStack("stack1", 100, 100, 2);
      const state = createMockState([s1, s2]);
      const resetState = canvasReducer(state, {
        type: "RESET_ITEMS",
        payload: { initialItems: [s1, s2] },
      });
      expect(resetState.items.size).toBe(2);
      expect(resetState.maxZIndex).toBe(2);
    });
  });

  describe("UPDATE_CARD_HEIGHT", () => {
    it("updates cover card height in stack item", () => {
      const stack = createMockStack("s1", 0, 0);
      const state = createMockState([stack]);
      const newState = canvasReducer(state, {
        type: "UPDATE_CARD_HEIGHT",
        payload: { itemId: "s1", cardId: "s1-cover", height: 300 },
      });
      if (stack.kind === "stack") {
        const s1 = newState.items.get("s1");
        if (s1?.kind === "stack") {
          expect(s1.cover?.size.height).toBe(300);
        }
      }
    });

    it("updates single item card height", () => {
      const single = createMockSingle("single1", 0, 0);
      const state = createMockState([single]);
      const newState = canvasReducer(state, {
        type: "UPDATE_CARD_HEIGHT",
        payload: { itemId: "single1", cardId: "single1-card", height: 300 },
      });
      if (single.kind === "single") {
        const single1 = newState.items.get("single1");
        if (single1?.kind === "single") {
          expect(single1.card?.size.height).toBe(300);
        }
      }
    });

    it("returns same state when cover height unchanged", () => {
      const stack = createMockStack("s1", 0, 0);
      const state = createMockState([stack]);
      const newState = canvasReducer(state, {
        type: "UPDATE_CARD_HEIGHT",
        payload: { itemId: "s1", cardId: "s1-cover", height: 100 },
      });
      expect(newState).toBe(state);
    });

    it("returns same state when item not found", () => {
      const state = createMockState([]);
      const newState = canvasReducer(state, {
        type: "UPDATE_CARD_HEIGHT",
        payload: { itemId: "missing", cardId: "card", height: 300 },
      });
      expect(newState).toBe(state);
    });

    it("returns same state when card not found in item", () => {
      const stack = createMockStack("s1", 0, 0);
      const state = createMockState([stack]);
      const newState = canvasReducer(state, {
        type: "UPDATE_CARD_HEIGHT",
        payload: { itemId: "s1", cardId: "nonexistent", height: 300 },
      });
      expect(newState).toBe(state);
    });

    it("updates stack card height in stack item", () => {
      const stackCard = {
        id: "stack-card-1",
        kind: "project" as const,
        size: { width: 100, height: 100 },
        content: { title: "Test", image: "" },
      };
      const stack = createMockStack("s1", 0, 0, 1, undefined, [stackCard]);
      const state = createMockState([stack]);
      const newState = canvasReducer(state, {
        type: "UPDATE_CARD_HEIGHT",
        payload: { itemId: "s1", cardId: "stack-card-1", height: 300 },
      });

      const s1 = newState.items.get("s1");
      expect(s1?.kind).toBe("stack");
      if (s1?.kind === "stack") {
        expect(s1.stack[0]?.size.height).toBe(300);
      }
    });

    it("updates funstack card height", () => {
      const funstack = createMockFunStack("fun1", 0, 0);
      const state = createMockState([funstack]);
      const newState = canvasReducer(state, {
        type: "UPDATE_CARD_HEIGHT",
        payload: { itemId: "fun1", cardId: "fun1-card", height: 300 },
      });

      const fun1 = newState.items.get("fun1");
      expect(fun1?.kind).toBe("funstack");
      if (fun1?.kind === "funstack") {
        expect(fun1.card.size.height).toBe(300);
      }
    });

    it("updates swagstack cover height", () => {
      const swagstack = createMockSwagStack("swag1", 0, 0);
      const state = createMockState([swagstack]);
      const newState = canvasReducer(state, {
        type: "UPDATE_CARD_HEIGHT",
        payload: { itemId: "swag1", cardId: "swag1-cover", height: 300 },
      });

      const swag1 = newState.items.get("swag1");
      expect(swag1?.kind).toBe("swagstack");
      if (swag1?.kind === "swagstack") {
        expect(swag1.cover.size.height).toBe(300);
      }
    });

    it("returns same state when funstack card height unchanged", () => {
      const funstack = createMockFunStack("fun1", 0, 0);
      const state = createMockState([funstack]);
      const newState = canvasReducer(state, {
        type: "UPDATE_CARD_HEIGHT",
        payload: { itemId: "fun1", cardId: "fun1-card", height: 100 },
      });
      expect(newState).toBe(state);
    });

    it("returns same state when swagstack cover height unchanged", () => {
      const swagstack = createMockSwagStack("swag1", 0, 0);
      const state = createMockState([swagstack]);
      const newState = canvasReducer(state, {
        type: "UPDATE_CARD_HEIGHT",
        payload: { itemId: "swag1", cardId: "swag1-cover", height: 100 },
      });
      expect(newState).toBe(state);
    });

    it("returns same state when stack card height unchanged", () => {
      const stackCard = {
        id: "stack-card-1",
        kind: "project" as const,
        size: { width: 100, height: 100 },
        content: { title: "Test", image: "" },
      };
      const stack = createMockStack("s1", 0, 0, 1, undefined, [stackCard]);
      const state = createMockState([stack]);
      const newState = canvasReducer(state, {
        type: "UPDATE_CARD_HEIGHT",
        payload: { itemId: "s1", cardId: "stack-card-1", height: 100 },
      });
      expect(newState).toBe(state);
    });
  });

  describe("default case", () => {
    it("returns same state for unknown action type", () => {
      const state = createMockState([]);
      const newState = canvasReducer(state, {
        type: "UNKNOWN" as any,
        payload: {},
      });
      expect(newState).toBe(state);
    });
  });
});

describe("useCanvasState - Actions Identity", () => {
  it("keeps actions object stable across unrelated state updates", () => {
    const initialItems = [createMockStack("s1", 0, 0)];
    const { result } = renderHook(() => useCanvasState(initialItems));
    const initialActions = result.current.actions;

    act(() => {
      result.current.actions.setExpandedStack("s1");
    });
    expect(result.current.actions).toBe(initialActions);

    act(() => {
      result.current.actions.setFocusedItem("s1");
    });
    expect(result.current.actions).toBe(initialActions);

    act(() => {
      result.current.actions.setExpandedStack(null);
      result.current.actions.setFocusedItem(null);
    });
    expect(result.current.actions).toBe(initialActions);
  });
});
