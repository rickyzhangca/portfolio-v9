import { useCallback, useEffect, useReducer, useRef } from "react";
import type {
  CanvasAction,
  CanvasItem,
  CanvasState,
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
    case "UPDATE_ITEM_POSITION": {
      const item = state.items.get(action.payload.id);
      if (!item) {
        return state;
      }

      if (
        item.position.x === action.payload.position.x &&
        item.position.y === action.payload.position.y
      ) {
        return state;
      }

      const newItems = new Map(state.items);
      newItems.set(action.payload.id, {
        ...item,
        position: action.payload.position,
      });
      return { ...state, items: newItems };
    }

    case "BRING_ITEM_TO_FRONT": {
      const item = state.items.get(action.payload.id);
      if (item) {
        const newZIndex = state.maxZIndex + 1;
        const newItems = new Map(state.items);
        newItems.set(action.payload.id, {
          ...item,
          zIndex: newZIndex,
        });
        return { ...state, items: newItems, maxZIndex: newZIndex };
      }
      return state;
    }

    case "SELECT_ITEM": {
      return { ...state, selectedItemId: action.payload.id };
    }

    case "SET_EXPANDED_STACK": {
      return { ...state, expandedStackId: action.payload.id };
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

    case "ADD_ITEM": {
      const newItems = new Map(state.items);
      const newZIndex = state.maxZIndex + 1;
      newItems.set(action.payload.id, {
        ...action.payload,
        zIndex: newZIndex,
      });
      return { ...state, items: newItems, maxZIndex: newZIndex };
    }

    case "DELETE_ITEM": {
      const newItems = new Map(state.items);
      newItems.delete(action.payload.id);
      return {
        ...state,
        items: newItems,
        selectedItemId:
          state.selectedItemId === action.payload.id
            ? null
            : state.selectedItemId,
        expandedStackId:
          state.expandedStackId === action.payload.id
            ? null
            : state.expandedStackId,
        focusedItemId:
          state.focusedItemId === action.payload.id
            ? null
            : state.focusedItemId,
      };
    }

    case "RESET_ITEMS": {
      const initialItemsMap = new Map<string, CanvasItem>();
      let maxZIndex = 0;

      for (const item of action.payload.initialItems) {
        initialItemsMap.set(item.id, item);
        maxZIndex = Math.max(maxZIndex, item.zIndex);
      }

      return {
        ...state,
        items: initialItemsMap,
        maxZIndex,
        selectedItemId: null,
        expandedStackId: null,
        focusedItemId: null,
      };
    }

    case "UPDATE_CARD_HEIGHT": {
      const { itemId, cardId, height } = action.payload;
      const item = state.items.get(itemId);
      if (!item) {
        return state;
      }

      const newItems = new Map(state.items);

      if (item.kind === "single") {
        // Single item: update the card directly
        if (item.card.id === cardId && item.card.size.height !== height) {
          newItems.set(itemId, {
            ...item,
            card: {
              ...item.card,
              size: { ...item.card.size, height },
            },
          });
          return { ...state, items: newItems };
        }
        return state;
      }

      if (item.kind === "funstack") {
        // Fun stack item: update the card directly
        if (item.card.id === cardId && item.card.size.height !== height) {
          newItems.set(itemId, {
            ...item,
            card: {
              ...item.card,
              size: { ...item.card.size, height },
            },
          });
          return { ...state, items: newItems };
        }
        return state;
      }

      if (item.kind === "swagstack") {
        // Swag stack item: update the cover card
        if (item.cover.id === cardId && item.cover.size.height !== height) {
          newItems.set(itemId, {
            ...item,
            cover: {
              ...item.cover,
              size: { ...item.cover.size, height },
            },
          });
          return { ...state, items: newItems };
        }
        return state;
      }

      // Stack item (kind === "stack"): check cover and stack cards
      if (item.kind !== "stack") {
        return state;
      }

      if (item.cover.id === cardId) {
        if (item.cover.size.height === height) {
          return state; // No change needed
        }
        newItems.set(itemId, {
          ...item,
          cover: {
            ...item.cover,
            size: { ...item.cover.size, height },
          },
        });
        return { ...state, items: newItems };
      }

      const stackIndex = item.stack.findIndex((c) => c.id === cardId);
      if (stackIndex === -1) {
        return state;
      }

      const stackCard = item.stack[stackIndex];
      if (stackCard.size.height === height) {
        return state; // No change needed
      }

      const newStack = [...item.stack];
      newStack[stackIndex] = {
        ...stackCard,
        size: { ...stackCard.size, height },
      };

      newItems.set(itemId, {
        ...item,
        stack: newStack,
      });
      return { ...state, items: newItems };
    }

    case "SET_FOCUSED_ITEM": {
      return { ...state, focusedItemId: action.payload.id };
    }

    default:
      return state;
  }
};

export const useCanvasState = (initialItems: CanvasItem[] = []) => {
  const initialItemsRef = useRef(initialItems);
  initialItemsRef.current = initialItems;

  const [state, dispatch] = useReducer(canvasReducer, {
    items: new Map(),
    selectedItemId: null,
    expandedStackId: null,
    maxZIndex: initialItems.length,
    viewportState: initialViewportState,
    focusedItemId: null,
  });

  // Initialize with provided items on mount
  useEffect(() => {
    if (initialItems.length > 0) {
      const itemsMap = new Map<string, CanvasItem>();
      let maxZIndex = 0;

      for (const item of initialItems) {
        itemsMap.set(item.id, item);
        maxZIndex = Math.max(maxZIndex, item.zIndex);
      }

      dispatch({
        type: "LOAD_STATE",
        payload: {
          items: itemsMap,
          maxZIndex,
        },
      });
    }
  }, [initialItems]);

  // Action creators
  const updateItemPosition = useCallback((id: string, position: Position) => {
    dispatch({ type: "UPDATE_ITEM_POSITION", payload: { id, position } });
  }, []);

  const bringItemToFront = useCallback((id: string) => {
    dispatch({ type: "BRING_ITEM_TO_FRONT", payload: { id } });
  }, []);

  const selectItem = useCallback((id: string | null) => {
    dispatch({ type: "SELECT_ITEM", payload: { id } });
  }, []);

  const setExpandedStack = useCallback((id: string | null) => {
    dispatch({ type: "SET_EXPANDED_STACK", payload: { id } });
  }, []);

  const updateViewport = useCallback((viewport: ViewportState) => {
    dispatch({ type: "UPDATE_VIEWPORT", payload: viewport });
  }, []);

  const addItem = useCallback((item: CanvasItem) => {
    dispatch({ type: "ADD_ITEM", payload: item });
  }, []);

  const deleteItem = useCallback((id: string) => {
    dispatch({ type: "DELETE_ITEM", payload: { id } });
  }, []);

  const resetItems = useCallback(() => {
    dispatch({
      type: "RESET_ITEMS",
      payload: { initialItems: initialItemsRef.current },
    });
  }, []);

  const updateCardHeight = useCallback(
    (itemId: string, cardId: string, height: number) => {
      dispatch({
        type: "UPDATE_CARD_HEIGHT",
        payload: { itemId, cardId, height },
      });
    },
    []
  );

  const setFocusedItem = useCallback((id: string | null) => {
    dispatch({ type: "SET_FOCUSED_ITEM", payload: { id } });
  }, []);

  return {
    state,
    actions: {
      updateItemPosition,
      bringItemToFront,
      selectItem,
      setExpandedStack,
      updateViewport,
      addItem,
      deleteItem,
      resetItems,
      updateCardHeight,
      setFocusedItem,
    },
  };
};
