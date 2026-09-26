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

## Layout Measurements

Measurements are untransformed border-box pixels: prefer ResizeObserver
`borderBoxSize`, with `offsetHeight` as the fallback. Do not feed
`getBoundingClientRect()` sizes into canvas layout; they include entrance
animations and viewport scaling.

Fun-project detail offsets follow actual measured heights, including late font
or media reflow. Expansion initially uses estimated bounds, then permits one
settled-content auto-pan refinement. Pointer/wheel input, resize, reset, close,
or another activation cancels that refinement. Later layout changes must not
continually recenter the reader. Oversized content retains its top anchor and
remains reachable by panning rather than being forced into the viewport.

## Deprecated Code

Legacy card content components formerly under `src/components/cards/` were
removed after confirming they had no production callers. Add new card
implementations under `src/cards/<kind>/` following the existing pattern.
