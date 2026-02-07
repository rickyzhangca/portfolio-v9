// Import card types from the card system
import type {
  CardInstance,
  CoverCardInstance,
  FunProjectCardInstance,
  ProjectCardInstance,
  SwagCoverCardInstance,
} from "@/cards/types";

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width?: number;
  height?: number;
}

export interface SwagItem {
  src: string;
  label: string;
  caption?: string;
}

export interface ViewportState {
  scale: number;
  positionX: number;
  positionY: number;
}

// Canvas item base properties
export interface CanvasItemBase {
  id: string;
  position: Position;
  zIndex: number;
}

// Single card item (standalone card like resume, contact, doc)
export interface CanvasSingleItem extends CanvasItemBase {
  kind: "single";
  card: CardInstance;
}

// Stack item (cover + 1+ project cards)
// Since stacks are projects-only, the cover must be a cover card
// and the stack must be an array of project cards
export interface CanvasStackItem extends CanvasItemBase {
  kind: "stack";
  cover: CoverCardInstance;
  stack: ProjectCardInstance[];
}

// Fun stack item (fun project card that expands to show 8 items)
export interface CanvasFunStackItem extends CanvasItemBase {
  kind: "funstack";
  card: FunProjectCardInstance;
}

// Swag stack item (swag cover that expands to show swag items in grid)
export interface CanvasSwagStackItem extends CanvasItemBase {
  kind: "swagstack";
  cover: SwagCoverCardInstance;
  swags: SwagItem[];
}

export type CanvasItem =
  | CanvasSingleItem
  | CanvasStackItem
  | CanvasFunStackItem
  | CanvasSwagStackItem;

export interface CanvasState {
  items: Map<string, CanvasItem>;
  selectedItemId: string | null;
  expandedStackId: string | null;
  maxZIndex: number;
  viewportState: ViewportState;
  focusedItemId: string | null; // For Macbook zoom toggle
}

export type CanvasAction =
  | {
      type: "UPDATE_ITEM_POSITION";
      payload: { id: string; position: Position };
    }
  | { type: "BRING_ITEM_TO_FRONT"; payload: { id: string } }
  | { type: "SELECT_ITEM"; payload: { id: string | null } }
  | { type: "SET_EXPANDED_STACK"; payload: { id: string | null } }
  | { type: "UPDATE_VIEWPORT"; payload: ViewportState }
  | { type: "LOAD_STATE"; payload: Partial<CanvasState> }
  | { type: "ADD_ITEM"; payload: CanvasItem }
  | { type: "DELETE_ITEM"; payload: { id: string } }
  | { type: "RESET_ITEMS"; payload: { initialItems: CanvasItem[] } }
  | {
      type: "UPDATE_CARD_HEIGHT";
      payload: { itemId: string; cardId: string; height: number };
    }
  | { type: "SET_FOCUSED_ITEM"; payload: { id: string | null } };

// Card types are exported from @/cards/types
// Import directly from there to maintain clean dependency direction
