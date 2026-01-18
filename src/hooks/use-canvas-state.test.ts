import { describe, expect, it } from "vitest";
import { createMockGroup } from "@/test-utils/test-helpers";
import { canvasReducer } from "./use-canvas-state";

describe("useCanvasState - Reducer Action Coverage", () => {
  const createMockState = (groups: any[] = []) => {
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

  describe("UPDATE_GROUP_POSITION", () => {
    it("updates position when changed", () => {
      const g1 = createMockGroup("g1", 0, 0);
      const state = createMockState([g1]);
      const newState = canvasReducer(state, {
        type: "UPDATE_GROUP_POSITION",
        payload: { id: "g1", position: { x: 100, y: 100 } },
      });
      expect(newState.groups.get("g1")?.position).toEqual({ x: 100, y: 100 });
    });

    it("returns same state reference when position unchanged", () => {
      const g1 = createMockGroup("g1", 0, 0);
      const state = createMockState([g1]);
      const newState = canvasReducer(state, {
        type: "UPDATE_GROUP_POSITION",
        payload: { id: "g1", position: { x: 0, y: 0 } },
      });
      expect(newState).toBe(state);
    });

    it("returns same state when group not found", () => {
      const state = createMockState([]);
      const newState = canvasReducer(state, {
        type: "UPDATE_GROUP_POSITION",
        payload: { id: "missing", position: { x: 10, y: 10 } },
      });
      expect(newState).toBe(state);
    });
  });

  describe("BRING_GROUP_TO_FRONT", () => {
    it("increments zIndex and maxZIndex", () => {
      const g1 = createMockGroup("g1", 0, 0, 1);
      const state = createMockState([g1]);
      const newState = canvasReducer(state, {
        type: "BRING_GROUP_TO_FRONT",
        payload: { id: "g1" },
      });
      expect(newState.groups.get("g1")?.zIndex).toBe(2);
      expect(newState.maxZIndex).toBe(2);
    });

    it("returns same state when group not found", () => {
      const state = createMockState([]);
      const newState = canvasReducer(state, {
        type: "BRING_GROUP_TO_FRONT",
        payload: { id: "missing" },
      });
      expect(newState).toBe(state);
    });
  });

  describe("SELECT_GROUP", () => {
    it("updates selectedGroupId", () => {
      const state = createMockState([]);
      const newState = canvasReducer(state, {
        type: "SELECT_GROUP",
        payload: { id: "g1" },
      });
      expect(newState.selectedGroupId).toBe("g1");
    });

    it("can set selectedGroupId to null", () => {
      const state = createMockState([]);
      const newState = canvasReducer(state, {
        type: "SELECT_GROUP",
        payload: { id: null },
      });
      expect(newState.selectedGroupId).toBeNull();
    });
  });

  describe("SET_EXPANDED_GROUP", () => {
    it("updates expandedGroupId", () => {
      const state = createMockState([]);
      const newState = canvasReducer(state, {
        type: "SET_EXPANDED_GROUP",
        payload: { id: "g1" },
      });
      expect(newState.expandedGroupId).toBe("g1");
    });

    it("can set expandedGroupId to null", () => {
      const state = createMockState([]);
      const newState = canvasReducer(state, {
        type: "SET_EXPANDED_GROUP",
        payload: { id: null },
      });
      expect(newState.expandedGroupId).toBeNull();
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
  });

  describe("LOAD_STATE", () => {
    it("merges payload into state", () => {
      const state = createMockState([]);
      const groupsMap = new Map();
      groupsMap.set("g1", createMockGroup("g1", 0, 0, 5));
      const newState = canvasReducer(state, {
        type: "LOAD_STATE",
        payload: { groups: groupsMap, maxZIndex: 5 },
      });
      expect(newState.groups.get("g1")).toBeDefined();
      expect(newState.maxZIndex).toBe(5);
    });

    it("preserves existing state properties not in payload", () => {
      const state = createMockState([]);
      state.selectedGroupId = "test";
      const newState = canvasReducer(state, {
        type: "LOAD_STATE",
        payload: { groups: new Map(), maxZIndex: 1 },
      });
      expect(newState.selectedGroupId).toBe("test");
    });
  });

  describe("ADD_GROUP", () => {
    it("adds group with incremented zIndex", () => {
      const g1 = createMockGroup("g1", 0, 0, 1);
      const state = createMockState([g1]);
      const g2 = createMockGroup("g2", 100, 100, 0);
      const newState = canvasReducer(state, {
        type: "ADD_GROUP",
        payload: g2,
      });
      expect(newState.groups.has("g2")).toBe(true);
      expect(newState.groups.get("g2")?.zIndex).toBe(2);
      expect(newState.maxZIndex).toBe(2);
    });
  });

  describe("DELETE_GROUP", () => {
    it("removes group from groups", () => {
      const g1 = createMockGroup("g1", 0, 0);
      const state = createMockState([g1]);
      const newState = canvasReducer(state, {
        type: "DELETE_GROUP",
        payload: { id: "g1" },
      });
      expect(newState.groups.has("g1")).toBe(false);
    });

    it("clears selectedGroupId when deleted group was selected", () => {
      const g1 = createMockGroup("g1", 0, 0);
      const state = createMockState([g1]);
      state.selectedGroupId = "g1";
      const newState = canvasReducer(state, {
        type: "DELETE_GROUP",
        payload: { id: "g1" },
      });
      expect(newState.selectedGroupId).toBeNull();
    });

    it("preserves selectedGroupId when different group deleted", () => {
      const g1 = createMockGroup("g1", 0, 0);
      const g2 = createMockGroup("g2", 100, 100);
      const state = createMockState([g1, g2]);
      state.selectedGroupId = "g1";
      const newState = canvasReducer(state, {
        type: "DELETE_GROUP",
        payload: { id: "g2" },
      });
      expect(newState.selectedGroupId).toBe("g1");
    });

    it("clears expandedGroupId when deleted group was expanded", () => {
      const g1 = createMockGroup("g1", 0, 0);
      const state = createMockState([g1]);
      state.expandedGroupId = "g1";
      const newState = canvasReducer(state, {
        type: "DELETE_GROUP",
        payload: { id: "g1" },
      });
      expect(newState.expandedGroupId).toBeNull();
    });

    it("preserves expandedGroupId when different group deleted", () => {
      const g1 = createMockGroup("g1", 0, 0);
      const g2 = createMockGroup("g2", 100, 100);
      const state = createMockState([g1, g2]);
      state.expandedGroupId = "g1";
      const newState = canvasReducer(state, {
        type: "DELETE_GROUP",
        payload: { id: "g2" },
      });
      expect(newState.expandedGroupId).toBe("g1");
    });
  });

  describe("RESET_GROUPS", () => {
    it("restores initial group positions", () => {
      const g1 = createMockGroup("g1", 100, 100, 1);
      const state = createMockState([g1]);
      const modifiedState = canvasReducer(state, {
        type: "UPDATE_GROUP_POSITION",
        payload: { id: "g1", position: { x: 999, y: 999 } },
      });
      const resetState = canvasReducer(modifiedState, {
        type: "RESET_GROUPS",
        payload: { initialGroups: [g1] },
      });
      expect(resetState.groups.get("g1")?.position).toEqual({ x: 100, y: 100 });
    });

    it("clears selectedGroupId", () => {
      const g1 = createMockGroup("g1", 0, 0);
      const state = createMockState([g1]);
      state.selectedGroupId = "g1";
      const resetState = canvasReducer(state, {
        type: "RESET_GROUPS",
        payload: { initialGroups: [g1] },
      });
      expect(resetState.selectedGroupId).toBeNull();
    });

    it("clears expandedGroupId", () => {
      const g1 = createMockGroup("g1", 0, 0);
      const state = createMockState([g1]);
      state.expandedGroupId = "g1";
      const resetState = canvasReducer(state, {
        type: "RESET_GROUPS",
        payload: { initialGroups: [g1] },
      });
      expect(resetState.expandedGroupId).toBeNull();
    });

    it("restores maxZIndex from initial groups", () => {
      const g1 = createMockGroup("g1", 0, 0, 5);
      const state = createMockState([g1]);
      const resetState = canvasReducer(state, {
        type: "RESET_GROUPS",
        payload: { initialGroups: [g1] },
      });
      expect(resetState.maxZIndex).toBe(5);
    });

    it("handles multiple groups", () => {
      const g1 = createMockGroup("g1", 0, 0, 1);
      const g2 = createMockGroup("g2", 100, 100, 2);
      const state = createMockState([g1, g2]);
      const resetState = canvasReducer(state, {
        type: "RESET_GROUPS",
        payload: { initialGroups: [g1, g2] },
      });
      expect(resetState.groups.size).toBe(2);
      expect(resetState.maxZIndex).toBe(2);
    });
  });

  describe("UPDATE_CARD_HEIGHT", () => {
    it("updates cover card height", () => {
      const group = createMockGroup("g1", 0, 0);
      group.cover = {
        ...group.cover,
        id: "cover",
        size: { width: 200, height: 200 },
      };
      const state = createMockState([group]);
      const newState = canvasReducer(state, {
        type: "UPDATE_CARD_HEIGHT",
        payload: { groupId: "g1", cardId: "cover", height: 300 },
      });
      expect(newState.groups.get("g1")?.cover?.size.height).toBe(300);
    });

    it("returns same state when cover height unchanged", () => {
      const group = createMockGroup("g1", 0, 0);
      group.cover = {
        ...group.cover,
        id: "cover",
        size: { width: 200, height: 200 },
      };
      const state = createMockState([group]);
      const newState = canvasReducer(state, {
        type: "UPDATE_CARD_HEIGHT",
        payload: { groupId: "g1", cardId: "cover", height: 200 },
      });
      expect(newState).toBe(state);
    });

    it("updates project card height", () => {
      const group = createMockGroup("g1", 0, 0);
      const project1 = {
        id: "p1",
        type: "project" as const,
        size: { width: 100, height: 200 },
        content: { title: "Test", description: "", image: "" },
      };
      group.projects = [project1];
      const state = createMockState([group]);
      const newState = canvasReducer(state, {
        type: "UPDATE_CARD_HEIGHT",
        payload: { groupId: "g1", cardId: "p1", height: 250 },
      });
      expect(newState.groups.get("g1")?.projects[0]?.size.height).toBe(250);
    });

    it("returns same state when project height unchanged", () => {
      const group = createMockGroup("g1", 0, 0);
      const project1 = {
        id: "p1",
        type: "project" as const,
        size: { width: 100, height: 200 },
        content: { title: "Test", description: "", image: "" },
      };
      group.projects = [project1];
      const state = createMockState([group]);
      const newState = canvasReducer(state, {
        type: "UPDATE_CARD_HEIGHT",
        payload: { groupId: "g1", cardId: "p1", height: 200 },
      });
      expect(newState).toBe(state);
    });

    it("returns same state when group not found", () => {
      const state = createMockState([]);
      const newState = canvasReducer(state, {
        type: "UPDATE_CARD_HEIGHT",
        payload: { groupId: "missing", cardId: "card", height: 300 },
      });
      expect(newState).toBe(state);
    });

    it("returns same state when card not found in group", () => {
      const group = createMockGroup("g1", 0, 0);
      const state = createMockState([group]);
      const newState = canvasReducer(state, {
        type: "UPDATE_CARD_HEIGHT",
        payload: { groupId: "g1", cardId: "nonexistent", height: 300 },
      });
      expect(newState).toBe(state);
    });

    it("updates correct project when multiple projects exist", () => {
      const group = createMockGroup("g1", 0, 0);
      const project1 = {
        id: "p1",
        type: "project" as const,
        size: { width: 100, height: 200 },
        content: { title: "Test", description: "", image: "" },
      };
      const project2 = {
        id: "p2",
        type: "project" as const,
        size: { width: 100, height: 250 },
        content: { title: "Test", description: "", image: "" },
      };
      group.projects = [project1, project2];
      const state = createMockState([group]);
      const newState = canvasReducer(state, {
        type: "UPDATE_CARD_HEIGHT",
        payload: { groupId: "g1", cardId: "p2", height: 300 },
      });
      expect(newState.groups.get("g1")?.projects[1]?.size.height).toBe(300);
      expect(newState.groups.get("g1")?.projects[0]?.size.height).toBe(200);
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
