// Import card types from the card system
import type {
  CardInstance,
  CoverCardInstance,
  ProjectCardInstance,
} from "@/cards/types";

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width?: number;
  height?: number;
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

export type CanvasItem = CanvasSingleItem | CanvasStackItem;

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

// Re-export commonly used card types for convenience
export type {
  AboutCardContent,
  AboutCardInstance,
  BaseCardInstance,
  CardInstance,
  CardKind,
  CoverCardContent,
  CoverCardInstance,
  EmailCardContent,
  EmailCardInstance,
  MacbookCardContent,
  MacbookCardInstance,
  MacbookSticker,
  ProfilePicCardContent,
  ProfilePicCardInstance,
  ProjectCardContent,
  ProjectCardInstance,
  ResumeCardInstance,
  ResumeData,
  SocialsCardContent,
  SocialsCardInstance,
  StickyNoteCardContent,
  StickyNoteCardInstance,
} from "@/cards/types";

// Legacy exports for backward compatibility during migration
// TODO: Remove these once all files are migrated
export type { CardData } from "@/cards/types";
