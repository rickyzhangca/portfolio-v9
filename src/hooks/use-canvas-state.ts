import { useCallback, useEffect, useReducer, useRef } from "react";
import type {
  CanvasAction,
  CanvasState,
  CardGroupData,
  Position,
  ViewportState,
} from "@/types/canvas";

const initialViewportState: ViewportState = {
  scale: 1,
  positionX: 0,
  positionY: 0,
};

export const canvasReducer = (
  state: CanvasState,
  action: CanvasAction
): CanvasState => {
  switch (action.type) {
    case "UPDATE_GROUP_POSITION": {
      const group = state.groups.get(action.payload.id);
      if (!group) {
        return state;
      }

      if (
        group.position.x === action.payload.position.x &&
        group.position.y === action.payload.position.y
      ) {
        return state;
      }

      const newGroups = new Map(state.groups);
      newGroups.set(action.payload.id, {
        ...group,
        position: action.payload.position,
      });
      return { ...state, groups: newGroups };
    }

    case "BRING_GROUP_TO_FRONT": {
      const group = state.groups.get(action.payload.id);
      if (group) {
        const newZIndex = state.maxZIndex + 1;
        const newGroups = new Map(state.groups);
        newGroups.set(action.payload.id, {
          ...group,
          zIndex: newZIndex,
        });
        return { ...state, groups: newGroups, maxZIndex: newZIndex };
      }
      return state;
    }

    case "SELECT_GROUP": {
      return { ...state, selectedGroupId: action.payload.id };
    }

    case "SET_EXPANDED_GROUP": {
      return { ...state, expandedGroupId: action.payload.id };
    }

    case "UPDATE_VIEWPORT": {
      return { ...state, viewportState: action.payload };
    }

    case "LOAD_STATE": {
      return {
        ...state,
        ...action.payload,
      };
    }

    case "ADD_GROUP": {
      const newGroups = new Map(state.groups);
      const newZIndex = state.maxZIndex + 1;
      newGroups.set(action.payload.id, {
        ...action.payload,
        zIndex: newZIndex,
      });
      return { ...state, groups: newGroups, maxZIndex: newZIndex };
    }

    case "DELETE_GROUP": {
      const newGroups = new Map(state.groups);
      newGroups.delete(action.payload.id);
      return {
        ...state,
        groups: newGroups,
        selectedGroupId:
          state.selectedGroupId === action.payload.id
            ? null
            : state.selectedGroupId,
        expandedGroupId:
          state.expandedGroupId === action.payload.id
            ? null
            : state.expandedGroupId,
      };
    }

    case "RESET_GROUPS": {
      const initialGroupsMap = new Map<string, CardGroupData>();
      let maxZIndex = 0;

      for (const group of action.payload.initialGroups) {
        initialGroupsMap.set(group.id, group);
        maxZIndex = Math.max(maxZIndex, group.zIndex);
      }

      return {
        ...state,
        groups: initialGroupsMap,
        maxZIndex,
        selectedGroupId: null,
        expandedGroupId: null,
      };
    }

    default:
      return state;
  }
};

export const useCanvasState = (initialGroups: CardGroupData[] = []) => {
  const initialGroupsRef = useRef(initialGroups);
  initialGroupsRef.current = initialGroups;

  const [state, dispatch] = useReducer(canvasReducer, {
    groups: new Map(),
    selectedGroupId: null,
    expandedGroupId: null,
    maxZIndex: initialGroups.length,
    viewportState: initialViewportState,
  });

  // Initialize with provided groups on mount
  useEffect(() => {
    if (initialGroups.length > 0) {
      const groupsMap = new Map<string, CardGroupData>();
      let maxZIndex = 0;

      for (const group of initialGroups) {
        groupsMap.set(group.id, group);
        maxZIndex = Math.max(maxZIndex, group.zIndex);
      }

      dispatch({
        type: "LOAD_STATE",
        payload: {
          groups: groupsMap,
          maxZIndex,
        },
      });
    }
  }, [initialGroups]);

  // Action creators
  const updateGroupPosition = useCallback((id: string, position: Position) => {
    dispatch({ type: "UPDATE_GROUP_POSITION", payload: { id, position } });
  }, []);

  const bringGroupToFront = useCallback((id: string) => {
    dispatch({ type: "BRING_GROUP_TO_FRONT", payload: { id } });
  }, []);

  const selectGroup = useCallback((id: string | null) => {
    dispatch({ type: "SELECT_GROUP", payload: { id } });
  }, []);

  const setExpandedGroup = useCallback((id: string | null) => {
    dispatch({ type: "SET_EXPANDED_GROUP", payload: { id } });
  }, []);

  const updateViewport = useCallback((viewport: ViewportState) => {
    dispatch({ type: "UPDATE_VIEWPORT", payload: viewport });
  }, []);

  const addGroup = useCallback((group: CardGroupData) => {
    dispatch({ type: "ADD_GROUP", payload: group });
  }, []);

  const deleteGroup = useCallback((id: string) => {
    dispatch({ type: "DELETE_GROUP", payload: { id } });
  }, []);

  const resetGroups = useCallback(() => {
    dispatch({
      type: "RESET_GROUPS",
      payload: { initialGroups: initialGroupsRef.current },
    });
  }, []);

  return {
    state,
    actions: {
      updateGroupPosition,
      bringGroupToFront,
      selectGroup,
      setExpandedGroup,
      updateViewport,
      addGroup,
      deleteGroup,
      resetGroups,
    },
  };
};
