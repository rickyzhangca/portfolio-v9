export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ViewportState {
  scale: number;
  positionX: number;
  positionY: number;
}

export type CardType = "company" | "project" | "contact";

export interface CompanyCardContent {
  title: string;
  description?: string;
  image: string;
}

export interface ProjectCardContent {
  title: string;
  description: string;
  links: Array<{
    label: string;
    url: string;
    icon?: string;
  }>;
  image: string;
  richContent?: React.ReactNode;
}

export interface ContactCardContent {
  title: string;
  description?: string;
  links: Array<{
    label: string;
    url: string;
    icon?: string;
  }>;
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
}

export interface CardGroupData {
  id: string;
  position: Position;
  zIndex: number;
  cards: CardData[]; // index 0 is the cover card
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
