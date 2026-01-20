/**
 * Card types derived from the registry.
 * This file re-exports types from the registry for convenience.
 */

import type { CardInstance } from "./registry";

export type {
  // Interaction policy types
  ActivationType,
  DragPolicy,
  InteractionPolicy,
  // Card content types
  AboutCardContent,
  CoverCardContent,
  EmailCardContent,
  MacbookCardContent,
  MacbookSticker,
  ProjectCardContent,
  ProfilePicCardContent,
  ResumeData,
  ResumeEducation,
  ResumeHeader,
  SkillCategory,
  SocialsCardContent,
  StickyNoteCardContent,
  Experience,
  // Card instance types
  AboutCardInstance,
  BaseCardInstance,
  CardInstance,
  CardKind,
  CoverCardInstance,
  EmailCardInstance,
  MacbookCardInstance,
  ProfilePicCardInstance,
  ProjectCardInstance,
  ResumeCardInstance,
  SocialsCardInstance,
  StickyNoteCardInstance,
  // Utility types
  CardContentByKind,
} from "./registry";

export type { CardDefinition, LazyCardDefinition } from "./registry";

export {
  CARD_REGISTRY,
  getInteractionPolicy,
  hasActivationType,
  isCardKind,
} from "./registry";

// Legacy type alias for backward compatibility during migration
// TODO: Remove this once all files are migrated to CardInstance
export type CardData = CardInstance;
