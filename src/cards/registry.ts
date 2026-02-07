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
}

export interface EmailCardContent {
  link: {
    label: string;
    url: string;
  };
}

export interface SocialsCardContent {
  linkedinUrl: string;
  twitterUrl: string;
}

export interface StickyNoteCardContent {
  content: string;
  color?: "yellow" | "pink" | "blue" | "green" | "orange";
}

export interface ProfilePicCardContent {
  images: string[];
  alt?: string;
}

export interface SwagCoverCardContent {
  content: string; // "My Swag Collection"
  color?: "yellow" | "pink" | "blue" | "green" | "orange";
}

export interface MacbookSticker {
  src: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MacbookCardContent {
  stickers: MacbookSticker[];
}

export interface FunProjectItem {
  icon: string;
  title: string;
  description: string;
  link?: {
    url: string;
    type?: string;
    count?: number;
  };
  status: "Active" | "Maintaining" | "Archived";
  image?: string;
}

export interface FunProjectCardContent {
  items: FunProjectItem[];
}

// Resume types (moved from canvas.ts)
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
  kind: "cover";
  content: CoverCardContent;
}

export interface ProjectCardInstance extends BaseCardInstance {
  kind: "project";
  content: ProjectCardContent;
}

export interface ResumeCardInstance extends BaseCardInstance {
  kind: "resume";
  content: ResumeData;
}

export interface AboutCardInstance extends BaseCardInstance {
  kind: "about";
  content: AboutCardContent;
}

export interface EmailCardInstance extends BaseCardInstance {
  kind: "email";
  content: EmailCardContent;
}

export interface SocialsCardInstance extends BaseCardInstance {
  kind: "socials";
  content: SocialsCardContent;
}

export interface StickyNoteCardInstance extends BaseCardInstance {
  kind: "stickynote";
  content: StickyNoteCardContent;
}

export interface ProfilePicCardInstance extends BaseCardInstance {
  kind: "profilepic";
  content: ProfilePicCardContent;
}

export interface MacbookCardInstance extends BaseCardInstance {
  kind: "macbook";
  content: MacbookCardContent;
}

export interface FunProjectCardInstance extends BaseCardInstance {
  kind: "funproject";
  content: FunProjectCardContent;
}

export interface SwagCoverCardInstance extends BaseCardInstance {
  kind: "swagcover";
  content: SwagCoverCardContent;
}

/**
 * Union of all card instances
 */
export type CardInstance =
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
  /** The card kind identifier */
  kind: K;
  /** The React component that renders this card */
  component: ComponentType<{ content: CardContentByKind<K> }>;
  /** The interaction policy for this card */
  interactionPolicy: InteractionPolicy;
}

// ============================================================================
// Card Registry
// ============================================================================

/**
 * Lazy card definition - allows deferring component import
 * This avoids circular dependency issues during the migration
 */
export interface LazyCardDefinition<K extends CardKind = CardKind> {
  kind: K;
  interactionPolicy: InteractionPolicy;
}

/**
 * Registry of all card kinds with their interaction policies.
 * Components are registered lazily to avoid import issues during migration.
 */
export const CARD_REGISTRY: Readonly<Record<CardKind, LazyCardDefinition>> =
  Object.freeze({
    cover: {
      kind: "cover",
      interactionPolicy: {
        activate: "none",
        drag: "full",
      },
    },
    project: {
      kind: "project",
      interactionPolicy: {
        activate: "none",
        drag: "full",
      },
    },
    resume: {
      kind: "resume",
      interactionPolicy: {
        activate: "open-modal",
        drag: "full",
      },
    },
    about: {
      kind: "about",
      interactionPolicy: {
        activate: "open-modal",
        drag: "full",
      },
    },
    email: {
      kind: "email",
      interactionPolicy: {
        activate: "none",
        drag: "full",
      },
    },
    socials: {
      kind: "socials",
      interactionPolicy: {
        activate: "none",
        drag: "full",
      },
    },
    stickynote: {
      kind: "stickynote",
      interactionPolicy: {
        activate: "none",
        drag: "full",
      },
    },
    profilepic: {
      kind: "profilepic",
      interactionPolicy: {
        activate: "none",
        drag: "full",
      },
    },
    macbook: {
      kind: "macbook",
      interactionPolicy: {
        activate: "toggle-focus",
        drag: "full",
        focusScale: 2,
      },
    },
    funproject: {
      kind: "funproject",
      interactionPolicy: {
        activate: "none",
        drag: "full",
      },
    },
    swagcover: {
      kind: "swagcover",
      interactionPolicy: {
        activate: "none",
        drag: "full",
      },
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
