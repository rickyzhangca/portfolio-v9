---
name: add-swag-item
description: Add a newly dropped `.webp` swag image to this portfolio's existing swag collection by gathering the required metadata, renaming the asset to the next numeric filename, and updating `src/assets/swag/swag.ts`. Use when the user wants to add a new swag item, mentions a dropped swag image, or asks to update the swag collection in this repository.
---

# Add Swag Item

Add swag items to the existing collection in `src/assets/swag`.

Keep the current data model unchanged: each swag item needs `label` and may include `caption`. Do not invent new fields or refactor the collection structure.

## Workflow

1. Inspect `src/assets/swag/swag.ts` and `src/assets/swag/*.webp` only if you need to confirm the current numbering or file layout.
2. Determine the source image:
   - If the user already gave a path to the new `.webp`, use it.
   - Otherwise, look for exactly one newly dropped non-numeric `.webp` inside `src/assets/swag`.
   - If there is no clear source image, ask for the path.
3. Collect missing metadata:
   - Ask for `label` if it was not already provided.
   - Ask for `caption` only if it was not already provided, and allow the user to skip it.
4. Run `scripts/add_swag_item.py` with the repo root, source image path, label, and optional caption.
5. Review the diff to confirm:
   - the image was renamed to the next numeric filename such as `100.webp`
   - a matching `import swag100 from "./100.webp";` line was added
   - a matching object was appended to the `swags` array
6. Report the new numeric filename and summarize the metadata that was added.

## Ask Rules

- Ask only for information that is actually missing.
- Keep questions minimal and direct.
- Do not ask for filename or numbering preferences; the filename is always the next integer.
- If multiple possible source images exist, present the candidate paths and ask the user which one to ingest.

## Command

From the repo root, run:

```bash
python3 agents/skills/add-swag-item/scripts/add_swag_item.py \
  --repo-root "$PWD" \
  --source "/absolute/path/to/new.webp" \
  --label "Swag label" \
  --caption "Optional caption"
```

Omit `--caption` when the user skips it.

If the user did not provide `--source`, the script may be run without it only when there is exactly one non-numeric `.webp` already inside `src/assets/swag`.

## Guardrails

- Do not reorder existing swag entries.
- Do not change existing labels or captions unless the user explicitly asks.
- Do not overwrite an existing numeric image.
- Do not convert image formats; this workflow is only for `.webp`.
- Fail clearly when `swag.ts` does not match the expected import-array-export structure.

## Resource

`scripts/add_swag_item.py` performs the rename/move and updates `src/assets/swag/swag.ts`.
