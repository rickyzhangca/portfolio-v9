// Import card types from the card system
import type {
  ArticleCardInstance,
  CardInstance,
  CoverCardInstance,
  FolderCoverCardInstance,
  FunProjectCardInstance,
  ProjectCardInstance,
  StickyNoteCardInstance,
  SwagCoverCardInstance,
} from "@/cards/types";

export type StackCardInstance =
  | ProjectCardInstance
  | StickyNoteCardInstance
  | ArticleCardInstance;

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  height?: number;
  width?: number;
}

export interface SwagItem {
  caption?: string;
  label: string;
  src: string;
}

export interface ViewportState {
  positionX: number;
  positionY: number;
  scale: number;
}

// Canvas item base properties
export interface CanvasItemBase {
  id: string;
  position: Position;
  zIndex: number;
}

// Single card item (standalone card like resume, contact, doc)
export interface CanvasSingleItem extends CanvasItemBase {
  card: CardInstance;
  kind: "single";
}

// A folder containing a typed collection of cards.
export interface CanvasStackItem extends CanvasItemBase {
  cover: CoverCardInstance | FolderCoverCardInstance;
  kind: "stack";
  pageSize?: number;
  stack: StackCardInstance[];
}

// Fun stack item (fun project card that expands to show 8 items)
export interface CanvasFunStackItem extends CanvasItemBase {
  card: FunProjectCardInstance;
  kind: "funstack";
}

// Swag stack item (swag cover that expands to show swag items in grid)
export interface CanvasSwagStackItem extends CanvasItemBase {
  cover: SwagCoverCardInstance;
  kind: "swagstack";
  swags: SwagItem[];
}

export type CanvasItem =
  | CanvasSingleItem
  | CanvasStackItem
  | CanvasFunStackItem
  | CanvasSwagStackItem;

export interface CanvasState {
  expandedStackId: string | null;
  focusedItemId: string | null; // For Macbook zoom toggle
  items: Map<string, CanvasItem>;
  maxZIndex: number;
  selectedItemId: string | null;
  viewportState: ViewportState;
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
