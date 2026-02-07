# Card System Architecture

This directory (`src/cards/`) is the **single source of truth** for all card-related types, policies, and rendering logic.

## Structure

- **`registry.ts`** - Canonical registry of all card kinds with their interaction policies and type definitions
- **`types.ts`** - Re-exports from registry for convenient imports
- **`render-card.tsx`** - Generic card renderer that routes to appropriate card components based on registry
- **`*/`** - Individual card implementations organized by kind

## Responsibility Boundaries

| Concern | Location | Notes |
|---------|----------|-------|
| Card type definitions | `src/cards/registry.ts` | Single source of truth for all card types |
| Interaction policies | `src/cards/registry.ts` | How cards respond to drag/activation |
| Card renderer | `src/cards/render-card.tsx` | Routes to card components based on kind |
| Card implementations | `src/cards/<kind>/` | Individual card component implementations |

## Deprecated Code

The directory `src/components/cards/` contains legacy card content components that are no longer used. New card implementations should be added to `src/cards/<kind>/` following the existing pattern.
