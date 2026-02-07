# AGENTS.md

Agent reference for `portfolio-v9`.
This is a Vite + React + TypeScript app with Tailwind, Jotai, and Vitest.
Use `pnpm` only (`packageManager` is pinned in `package.json`).

## Runtime and tooling snapshot
- Node-based frontend app, ESM (`"type": "module"`).
- Bundler: Vite (via `rolldown-vite` override).
- Styling: Tailwind CSS v4.
- State: Jotai + local React state/reducers.
- Testing: Vitest (`happy-dom`) + Testing Library.
- Lint/format: Biome, extended from `ultracite` presets.

## Commands
- Install dependencies: `pnpm install`
- Start dev server: `pnpm dev`
- Build (TS project refs + bundle): `pnpm build`
- Preview build output: `pnpm preview`
- Format check: `pnpm format`
- Format write: `pnpm format:write`
- Lint check: `pnpm lint`
- Lint write/fix: `pnpm lint:write`
- Clean style pass (format + lint write): `pnpm clean`
- Run tests once (CI mode): `pnpm test`
- Run tests with coverage: `pnpm coverage`

## Single-test and focused-test recipes
- Run one test file: `pnpm test -- src/lib/utils.test.ts`
- Run one folder/pattern: `pnpm test -- --run src/components/canvas`
- Run a single test by name: `pnpm test -- -t "repulsion offsets"`
- Run tests matching multiple words: `pnpm test -- -t "canvas controls"`
- Open watch mode directly: `pnpm vitest --watch`
- Watch one file: `pnpm vitest src/hooks/use-draggable.test.ts --watch`
- Update coverage only for current changes (manual): use targeted `pnpm test -- ...` first, then `pnpm coverage`

## Project layout
- Entry point: `src/main.tsx`
- App shell: `src/app.tsx`
- Route/scene composition: `src/scenes/*`
- Reusable UI: `src/components/**`
- Canvas-specific UI: `src/components/canvas/**`
- Card model/render registry: `src/cards/**`
- Hooks and reducers: `src/hooks/**`
- Pure utilities: `src/lib/**`
- Global state atoms: `src/context/atoms.ts`
- Shared types: `src/types/**`
- Test helpers/providers: `src/test-utils/**`
- Content markdown/assets: `src/content/**`, `src/assets/**`, `public/**`

## Path aliases and TS config
- Prefer alias imports from `@/` for `src/*` modules.
- Alias is configured in both `vite.config.ts` and `tsconfig*.json`.
- TypeScript is strict; keep code compliant with:
  - `strict`, `noUnusedLocals`, `noUnusedParameters`
  - `noFallthroughCasesInSwitch`
  - `noUncheckedSideEffectImports`
  - `verbatimModuleSyntax`

## Formatting and linting rules
- Biome is the source of truth for formatting and linting.
- Do not introduce ESLint/Prettier-specific directives.
- Keep `noExcessiveCognitiveComplexity` disabled unless explicitly requested.
- VS Code settings expect Biome formatter + explicit organize/fix actions.
- Prefer small, local fixes over broad stylistic rewrites.

## Import conventions
- Import order: Node built-ins, third-party, `@/` aliases, then relative.
- Use `import type` for type-only imports.
- Keep imports organized (Biome can do this).
- Avoid default exports for components unless file already uses one.

## TypeScript conventions
- Prefer `interface` for component props and object contracts.
- Prefer `type` for unions, mapped helpers, and utility composition.
- Avoid `any`; use narrowed unions/generics instead.
- Keep shared domain types close to `src/types/*`.
- Use `as const` for static config/tuple literals.
- In `src/lib`, keep functions pure and DOM-free.

## React and hooks conventions
- Use function components with named exports.
- Keep render paths clear with guard clauses/early returns.
- Use `useMemo`/`useCallback` for expensive or identity-sensitive values.
- Use `useLayoutEffect` when logic depends on measured layout.
- Avoid inline handlers in hot render paths unless memoized.
- Co-locate local state unless it is truly shared (then use atoms).

## State and reducer conventions
- Treat reducer state as immutable.
- For `Map` and array updates, create new copies before writes.
- Return original state when an action is a true no-op.
- Keep action payloads typed; avoid stringly-typed loose payloads.
- Canvas state contracts live in `src/types/canvas.ts`.

## Styling conventions
- Tailwind utilities are primary; avoid ad-hoc CSS when utilities suffice.
- Use `tw(...)` helper from `src/lib/utils.ts` for class composition.
- Keep class strings readable and grouped logically.
- Prefer existing tokens (e.g., background/foreground token classes).
- Use inline style objects only for truly dynamic runtime values.

## Naming and file conventions
- Components: `PascalCase` identifiers.
- Hooks: `useXxx` naming.
- Files for components/hooks/utilities are typically kebab-case.
- Constants: `UPPER_SNAKE_CASE` for module-level constants, otherwise clear `camelCase`.
- Prefer descriptive prop and variable names over abbreviations.

## Error handling expectations
- Use guard clauses for invalid/missing state.
- Preserve behavior of `src/components/error-boundary.tsx`.
- Avoid silent failures; prefer explicit safe fallbacks.
- Add suppression comments (`biome-ignore`) only with a concise reason.

## Testing guidance
- Test files are colocated as `*.test.ts` / `*.test.tsx`.
- Prefer `@testing-library/react` for component behavior.
- Use helpers from `src/test-utils/test-helpers.tsx`.
- Current coverage thresholds (`vitest.config.ts`):
  - Statements: 80
  - Lines: 80
  - Branches: 65
  - Functions: 60
- Prefer behavior assertions over snapshots unless snapshot is clearly justified.

## Accessibility and UX guardrails
- Provide `aria-label` for icon-only buttons.
- Always set `type="button"` on non-submit button controls.
- Preserve keyboard navigation and focus-visible affordances.
- Keep semantic headings/labels intact during refactors.

## Performance guardrails
- Memoize heavy render branches/components when profiling supports it.
- Avoid repeated expensive calculations inside render.
- Use `requestAnimationFrame` for animation-driven updates.
- Use `ResizeObserver` for responsive measurement logic.

## Agent-specific workflow notes
- Make focused changes; avoid broad refactors unless asked.
- Match existing patterns before introducing new abstractions.
- Prefer updating existing files over creating parallel alternatives.
- If scripts/tooling change, update this file in the same PR.

## Cursor and Copilot rules status
- `.cursor/rules/`: not present in this repository.
- `.cursorrules`: not present in this repository.
- `.github/copilot-instructions.md`: not present in this repository.
- If any of these files are added later, treat them as authoritative and sync this guide.

## When unsure
- Follow local patterns from neighboring files.
- Choose the smallest correct change.
- Run targeted tests first, then broader checks.
- Document any non-obvious tradeoff in PR/commit notes.
