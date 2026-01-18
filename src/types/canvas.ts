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

export type CardType = "company" | "project" | "contact";

export interface CompanyCardContent {
  company: string;
  title?: string;
  image: string;
}

export interface ProjectCardContent {
  title: string;
  description: string;
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

export type CardContent =
  | CompanyCardContent
  | ProjectCardContent
  | ContactCardContent;

export interface CardData {
  id: string;
  type: CardType;
  size: Size;
  content: CardContent;
  notShipped?: boolean;
}

export interface CardGroupData {
  id: string;
  position: Position;
  zIndex: number;
  cover: CardData | undefined; // Company cover (undefined for contact-only groups)
  projects: CardData[]; // Project cards (or contact card for contact-only groups)
}

export interface CanvasState {
  groups: Map<string, CardGroupData>;
  selectedGroupId: string | null;
  expandedGroupId: string | null;
  maxZIndex: number;
  viewportState: ViewportState;
}

export type CanvasAction =
  | {
      type: "UPDATE_GROUP_POSITION";
      payload: { id: string; position: Position };
    }
  | { type: "BRING_GROUP_TO_FRONT"; payload: { id: string } }
  | { type: "SELECT_GROUP"; payload: { id: string | null } }
  | { type: "SET_EXPANDED_GROUP"; payload: { id: string | null } }
  | { type: "UPDATE_VIEWPORT"; payload: ViewportState }
  | { type: "LOAD_STATE"; payload: Partial<CanvasState> }
  | { type: "ADD_GROUP"; payload: CardGroupData }
  | { type: "DELETE_GROUP"; payload: { id: string } };
