# AGENTS.md

This repo is a Vite + React + TypeScript app using Tailwind, Jotai, and Vitest.
Use `pnpm` (see `packageManager` in `package.json`).

## Commands
- Install deps: `pnpm install`
- Dev server: `pnpm dev`
- Build (typecheck + bundle): `pnpm build`
- Clean (format + lint write): `pnpm clean`
- Run all tests (CI mode): `pnpm test`
- Coverage: `pnpm coverage`

### Single-test recipes
- One file: `pnpm test -- src/lib/utils.test.ts`
- One test name: `pnpm test -- -t "repulsion offsets"`
- Filter by path pattern: `pnpm test -- --run src/components`
- Watch mode (direct): `pnpm vitest --watch`

## Project structure
- `src/` holds app code; entry is `src/main.tsx`.
- Use path alias `@/` for `src/` (see `vite.config.ts`, `tsconfig.json`).
- `src/components/` UI components and cards.
- `src/hooks/` contains custom hooks (state + interactions).
- `src/lib/` pure helpers (animation, repulsion, utils).
- `src/context/` Jotai atoms.
- `src/test-utils/` test helpers and providers.

## Formatting and linting
- Use Biome for formatting/linting (see `biome.jsonc`).
- Biome rules extend `ultracite/biome/core` and `ultracite/biome/react`.
- `noExcessiveCognitiveComplexity` is disabled; do not re-enable without discussion.
- Editor defaults: format on save and explicit Biome fixes (see `.vscode/settings.json`).

## TypeScript conventions
- Strict TypeScript (`strict`, `noUnusedLocals`, `noUnusedParameters`).
- Use `import type` for type-only imports.
- Prefer `interface` for React props, `type` for unions and helpers.
- Keep types close to usage; export shared types from `src/types/*`.
- Favor `as const` for config objects and static tuples.
- Avoid `any`; prefer narrow unions or generics.
- Keep functions pure in `src/lib` and avoid DOM access there.

## React and hooks
- Use function components with `export const Component = () => {}`.
- Prefer `useCallback`/`useMemo` for stable handlers/derived data.
- Use `useLayoutEffect` when measuring layout or size.
- Keep JSX return trees readable with early returns/guard clauses.
- Avoid inline function props in hot paths unless memoized.
- For UI state, co-locate state in component or use atoms in `src/context`.

## Styling and class names
- Tailwind CSS is the primary styling tool.
- Prefer the `tw` helper (`src/lib/utils.ts`) for conditional classes.
- Keep class strings readable; split long chains with `tw(...)` arrays.
- Use design tokens already in the codebase (e.g., `bg-background2`).
- Avoid inline styles unless needed for dynamic sizes/positions.

## State management
- Jotai atoms live in `src/context/atoms.ts`.
- When updating Maps or arrays, create new copies (no mutation).
- Reducers should return the original state on no-op updates.
- Keep actions typed; avoid stringly-typed payloads.

## Error handling
- Use guard clauses for missing data or invalid state.
- Preserve existing ErrorBoundary behavior (`src/components/error-boundary.tsx`).
- Avoid silent failures; return defaults and keep UI stable.
- Use `biome-ignore` only with a comment explaining why.

## Testing
- Tests live in `src/**/__tests__` or `*.test.ts(x)` (current repo uses `*.test.*`).
- Runner: Vitest in `happy-dom` environment.
- Prefer `@testing-library/react` for UI tests.
- Use helpers from `src/test-utils/test-helpers.tsx` (e.g., `renderWithProviders`).
- Coverage thresholds enforced in `vitest.config.ts`.
- Avoid snapshot tests unless necessary.

## Imports and ordering
- Order imports: Node built-ins, third-party, aliased `@/`, then relative.
- Keep imports sorted; Biome can organize them.
- Do not use default exports for components unless existing file does.

## Naming
- Components: `PascalCase` (files often kebab-case).
- Hooks: `useThing`.
- Constants: `UPPER_SNAKE_CASE` or `camelCase` for local consts.
- Props: descriptive names; avoid single-letter except for loop indexes.

## File naming
- Components live in kebab-case files (e.g., `canvas-control-panel.tsx`).
- Hook files use `use-*.ts` naming.
- Utility modules are short, descriptive nouns (`repulsion.ts`, `fan.ts`).

## Data and assets
- App data lives in `src/data/data.ts`.
- Static assets under `src/assets/` and `public/`.
- Use `import` for local assets when needed in components.

## Canvas system notes
- Canvas items are in `src/types/canvas.ts` and stored in Maps.
- Keep viewport updates in `use-canvas-state` actions.
- Avoid direct DOM manipulations outside hooks.

## Lint-safe patterns
- Handle unused callback params with `_` prefix.
- Prefer early `return` over nested `if` blocks.
- Avoid `console.log` in production components.

## Accessibility
- Provide `aria-label` for icon-only controls (see canvas buttons).
- Use `type="button"` on button elements.
- Preserve focus-visible styles and keyboard navigation.
- Avoid disabling pointer events unless required.
- Keep labels and headings semantic where possible.

## Performance
- Use `memo` for heavy components when needed (see `Card`).
- Avoid expensive recalculations; prefer `useMemo`.
- Use `requestAnimationFrame` for animation-driven updates.
- Use `ResizeObserver` for element size tracking.

## Testing examples
- Canvas reducer tests use `canvas-reducer.test.ts`.
- Interaction helpers in `src/test-utils/mock-provider.tsx`.
- Consider `vi.fn()` for spies and `vi.useFakeTimers()` if needed.

## Tooling notes
- Vite config adds alias `@` and Tailwind plugin.
- React compiler plugin enabled via Babel.
- TS build uses `tsc -b` via `pnpm build`.

## Documentation
- Inline comments only when logic is non-obvious.
- Update this guide when scripts or tooling change.

## When in doubt
- Match surrounding code style and patterns.
- Prefer minimal, focused changes.
- Ask before large refactors or dependency changes.
- Keep AGENTS.md updated when scripts or tooling change.
