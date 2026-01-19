import type { ReactNode } from "react";

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height?: number;
}

export interface ViewportState {
  scale: number;
  positionX: number;
  positionY: number;
}

export type CardType = "cover" | "project" | "doc";

export type DocType = "resume" | "contact";

export interface CoverCardContent {
  company: string;
  title?: string;
  image: string;
}

export interface ProjectCardContent {
  title: string;
  description?: string;
  link?: {
    label?: string;
    url: string;
    icon?: ReactNode;
  };
  image: string;
  richContent?: React.ReactNode;
}

export interface ContactCardContent {
  title: string;
  description?: string;
  link: {
    label: string;
    url: string;
    icon?: ReactNode;
  };
}

export interface ResumeHeader {
  name: string;
  website: string;
  email: string;
  phone: string;
}

export interface ResumeEducation {
  logo: string;
  degree: string;
  institution: string;
  years: string;
  description: string;
}

export interface Experience {
  company: string;
  logo: string;
  title: string;
  caption: string;
  description: string[];
}

export interface SkillCategory {
  category: string;
  skills: string[];
}

export interface ResumeData {
  header: ResumeHeader;
  education: ResumeEducation;
  experiences: Experience[];
  skills: SkillCategory[];
}

export interface DocCardContent {
  docType: DocType;
  // Resume fields
  data?: ResumeData;
  // Contact fields
  title?: string;
  description?: string;
  link?: {
    label: string;
    url: string;
    icon?: ReactNode;
  };
}

export interface CoverCardData {
  id: string;
  type: "cover";
  size: Size;
  content: CoverCardContent;
}

export interface ProjectCardData {
  id: string;
  type: "project";
  size: Size;
  content: ProjectCardContent;
}

export interface DocCardData {
  id: string;
  type: "doc";
  size: Size;
  content: DocCardContent;
}

export type CardData = CoverCardData | ProjectCardData | DocCardData;

// Canvas item base properties
export interface CanvasItemBase {
  id: string;
  position: Position;
  zIndex: number;
}

// Single card item (standalone card like resume, contact, doc)
export interface CanvasSingleItem extends CanvasItemBase {
  kind: "single";
  card: CardData;
}

// Stack item (cover + 1+ cards in the stack)
export interface CanvasStackItem extends CanvasItemBase {
  kind: "stack";
  cover: CardData;
  stack: CardData[];
}

export type CanvasItem = CanvasSingleItem | CanvasStackItem;

export interface CanvasState {
  items: Map<string, CanvasItem>;
  selectedItemId: string | null;
  expandedStackId: string | null;
  maxZIndex: number;
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
    };
