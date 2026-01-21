/**
 * Card types derived from the registry.
 * This file re-exports types from the registry for convenience.
 */

import type { CardInstance } from "./registry";

export type {
  // Card content types
  AboutCardContent,
  // Card instance types
  AboutCardInstance,
  // Interaction policy types
  ActivationType,
  BaseCardInstance,
  // Utility types
  CardContentByKind,
  CardDefinition,
  CardInstance,
  CardKind,
  CoverCardContent,
  CoverCardInstance,
  DragPolicy,
  EmailCardContent,
  EmailCardInstance,
  Experience,
  FunProjectCardContent,
  FunProjectCardInstance,
  FunProjectItem,
  InteractionPolicy,
  LazyCardDefinition,
  MacbookCardContent,
  MacbookCardInstance,
  MacbookSticker,
  ProfilePicCardContent,
  ProfilePicCardInstance,
  ProjectCardContent,
  ProjectCardInstance,
  ResumeCardInstance,
  ResumeData,
  ResumeEducation,
  ResumeHeader,
  SkillCategory,
  SocialsCardContent,
  SocialsCardInstance,
  StickyNoteCardContent,
  StickyNoteCardInstance,
  SwagCoverCardContent,
  SwagCoverCardInstance,
} from "./registry";

export {
  CARD_REGISTRY,
  getInteractionPolicy,
  hasActivationType,
  isCardKind,
} from "./registry";

// Legacy type alias for backward compatibility during migration
// TODO: Remove this once all files are migrated to CardInstance
export type CardData = CardInstance;
