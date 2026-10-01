import type { ComponentType, ReactNode } from "react";

// ============================================================================
// Interaction Policy Types
// ============================================================================

/**
 * How a card responds to click/activation
 */
export type ActivationType =
  | "none" // No activation behavior
  | "open-modal" // Opens a modal (resume, about)
  | "toggle-focus"; // Toggles focused zoom state (macbook)

/**
 * How a card responds to drag interactions
 */
export type DragPolicy =
  | "full" // Entire card is draggable
  | "handle" // Only a specific handle is draggable
  | "none"; // Card is not draggable

/**
 * Interaction policy for a card kind
 */
export interface InteractionPolicy {
  /** How the card responds to activation */
  activate: ActivationType;
  /** How the card responds to drag */
  drag: DragPolicy;
  /** Optional scale factor when focused (used by macbook) */
  focusScale?: number;
}

// ============================================================================
// Card Content Types
// ============================================================================

export interface CoverCardContent {
  company: string;
  image: string;
  title?: string;
}

export interface ArticleCardContent {
  slug: string;
}

export interface FolderCoverCardContent {
  count: number;
  label: string;
}

export interface ProjectCardContent {
  description?: string;
  image: string;
  link?: {
    label?: string;
    url: string;
    icon?: ReactNode;
  };
  title: string;
}

export interface EmailCardContent {
  link: {
    label: string;
    url: string;
  };
}

export interface SocialsCardContent {
  githubUrl: string;
  linkedinUrl: string;
  twitterUrl: string;
}

export interface StickyNoteCardContent {
  color?: "yellow" | "pink" | "blue" | "green" | "orange";
  content: string;
}

export interface ProfilePicCardContent {
  alt?: string;
  images: string[];
}

export interface SwagCoverCardContent {
  color?: "yellow" | "pink" | "blue" | "green" | "orange";
  content: string; // "My Swag Collection"
}

export interface MacbookSticker {
  description: string;
  height: number;
  src: string;
  width: number;
  x: number;
  y: number;
}

export interface MacbookCardContent {
  stickers: MacbookSticker[];
}

export interface FunProjectItem {
  description: string;
  icon: string;
  image?: string;
  link?: {
    url: string;
    type?: string;
    count?: number;
  };
  status: "Active" | "Maintaining" | "Archived";
  title: string;
}

export interface FunProjectCardContent {
  items: FunProjectItem[];
}

// Resume types (moved from canvas.ts)
export interface ResumeHeader {
  email: string;
  name: string;
  phone: string;
  website: string;
}

export interface ResumeEducation {
  degree: string;
  description: string;
  institution: string;
  logo: string;
  years: string;
}

export interface Experience {
  caption: string;
  company: string;
  description: string[];
  logo: string;
  title: string;
}

export interface SkillCategory {
  category: string;
  skills: string[];
}

export interface ResumeData {
  education: ResumeEducation;
  experiences: Experience[];
  header: ResumeHeader;
  skills: SkillCategory[];
}

// About card type (minimal, markdown-driven)
export type AboutCardContent = Record<string, never>;

// ============================================================================
// Card Definition Types
// ============================================================================

/**
 * Base card instance interface - all cards have id, size, and content
 */
export interface BaseCardInstance {
  id: string;
  size: {
    width?: number;
    height?: number;
  };
}

/**
 * Card instance for each kind
 */
export interface CoverCardInstance extends BaseCardInstance {
  content: CoverCardContent;
  kind: "cover";
}

export interface ArticleCardInstance extends BaseCardInstance {
  content: ArticleCardContent;
  kind: "article";
}

export interface FolderCoverCardInstance extends BaseCardInstance {
  content: FolderCoverCardContent;
  kind: "folder-cover";
}

export interface ProjectCardInstance extends BaseCardInstance {
  content: ProjectCardContent;
  kind: "project";
}

export interface ResumeCardInstance extends BaseCardInstance {
  content: ResumeData;
  kind: "resume";
}

export interface AboutCardInstance extends BaseCardInstance {
  content: AboutCardContent;
  kind: "about";
}

export interface EmailCardInstance extends BaseCardInstance {
  content: EmailCardContent;
  kind: "email";
}

export interface SocialsCardInstance extends BaseCardInstance {
  content: SocialsCardContent;
  kind: "socials";
}

export interface StickyNoteCardInstance extends BaseCardInstance {
  content: StickyNoteCardContent;
  kind: "stickynote";
}

export interface ProfilePicCardInstance extends BaseCardInstance {
  content: ProfilePicCardContent;
  kind: "profilepic";
}

export interface MacbookCardInstance extends BaseCardInstance {
  content: MacbookCardContent;
  kind: "macbook";
}

export interface FunProjectCardInstance extends BaseCardInstance {
  content: FunProjectCardContent;
  kind: "funproject";
}

export interface SwagCoverCardInstance extends BaseCardInstance {
  content: SwagCoverCardContent;
  kind: "swagcover";
}

/**
 * Union of all card instances
 */
export type CardInstance =
  | ArticleCardInstance
  | FolderCoverCardInstance
  | CoverCardInstance
  | ProjectCardInstance
  | ResumeCardInstance
  | AboutCardInstance
  | EmailCardInstance
  | SocialsCardInstance
  | StickyNoteCardInstance
  | ProfilePicCardInstance
  | MacbookCardInstance
  | FunProjectCardInstance
  | SwagCoverCardInstance;

/**
 * Card kind union type
 */
export type CardKind = CardInstance["kind"];

/**
 * Content type for a specific card kind
 */
export type CardContentByKind<K extends CardKind> = Extract<
  CardInstance,
  { kind: K }
>["content"];

/**
 * Card definition - maps kind to component and policy
 */
export interface CardDefinition<K extends CardKind = CardKind> {
  /** The React component that renders this card */
  component: ComponentType<{ content: CardContentByKind<K> }>;
  /** The interaction policy for this card */
  interactionPolicy: InteractionPolicy;
  /** The card kind identifier */
  kind: K;
}

// ============================================================================
// Card Registry
// ============================================================================

/**
 * Lazy card definition - allows deferring component import
 * This avoids circular dependency issues during the migration
 */
export interface LazyCardDefinition<K extends CardKind = CardKind> {
  interactionPolicy: InteractionPolicy;
  kind: K;
}

/**
 * Registry of all card kinds with their interaction policies.
 * Components are registered lazily to avoid import issues during migration.
 */
export const CARD_REGISTRY: Readonly<Record<CardKind, LazyCardDefinition>> =
  Object.freeze({
    about: {
      interactionPolicy: {
        activate: "open-modal",
        drag: "full",
      },
      kind: "about",
    },
    article: {
      interactionPolicy: { activate: "open-modal", drag: "full" },
      kind: "article",
    },
    cover: {
      interactionPolicy: {
        activate: "none",
        drag: "full",
      },
      kind: "cover",
    },
    email: {
      interactionPolicy: {
        activate: "none",
        drag: "full",
      },
      kind: "email",
    },
    "folder-cover": {
      interactionPolicy: { activate: "none", drag: "full" },
      kind: "folder-cover",
    },
    funproject: {
      interactionPolicy: {
        activate: "none",
        drag: "full",
      },
      kind: "funproject",
    },
    macbook: {
      interactionPolicy: {
        activate: "toggle-focus",
        drag: "full",
        focusScale: 2,
      },
      kind: "macbook",
    },
    profilepic: {
      interactionPolicy: {
        activate: "none",
        drag: "full",
      },
      kind: "profilepic",
    },
    project: {
      interactionPolicy: {
        activate: "none",
        drag: "full",
      },
      kind: "project",
    },
    resume: {
      interactionPolicy: {
        activate: "open-modal",
        drag: "full",
      },
      kind: "resume",
    },
    socials: {
      interactionPolicy: {
        activate: "none",
        drag: "full",
      },
      kind: "socials",
    },
    stickynote: {
      interactionPolicy: {
        activate: "none",
        drag: "full",
      },
      kind: "stickynote",
    },
    swagcover: {
      interactionPolicy: {
        activate: "none",
        drag: "full",
      },
      kind: "swagcover",
    },
  } as const);

/**
 * Get interaction policy for a card kind
 */
export function getInteractionPolicy(kind: CardKind): InteractionPolicy {
  return CARD_REGISTRY[kind].interactionPolicy;
}

/**
 * Check if a card kind has a specific activation type
 */
export function hasActivationType(
  kind: CardKind,
  type: ActivationType
): boolean {
  return getInteractionPolicy(kind).activate === type;
}

/**
 * Get all card kinds
 */
export function getCardKinds(): readonly CardKind[] {
  return Object.keys(CARD_REGISTRY) as readonly CardKind[];
}

/**
 * Type guard to check if a kind is a valid card kind
 */
export function isCardKind(value: string): value is CardKind {
  return Object.hasOwn(CARD_REGISTRY, value);
}
