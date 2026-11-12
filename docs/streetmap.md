# Tiny Toronto street map

Read this before changing `src/cards/streetmap/`, `src/lib/map-fold.ts`, `src/lib/map-view.ts`, the map tiles or the `/toronto` route. Moved verbatim from AGENTS.md, regrouped by topic.

## Card and chunk

The Tiny Toronto street map (`src/cards/streetmap/`, kind `streetmap`, `toggle-focus`) rests as its cover image (`src/assets/streetmap/cover.webp`, 3x, with a 2x sibling) and mounts the lazy `streetmap-sheet.tsx` chunk when focused.

The fold is pure geometry in `src/lib/map-fold.ts` (16 panels, open springs that continue from any pose, eased close); the sheet writes their `matrix3d` per frame, shades each face with a CSS gradient and draws its own projected shadow on a 2D canvas, so `SingleCardItem` gives it no drop-shadow or lamp caster.

While the map is focused the canvas controls fade out (`isMapUnfolded` in `canvas.tsx`), so the open sheet fits the window with a small `FIT_MARGIN`.

The booklet lies square on desktop and turned `restTilt` (-5deg) in the phone column, where `NUDGE_X_PX` in `compact-scene.ts` shifts it right to read centred; the controls fade back 650ms after the map closes.

On the desk the booklet shows its folded stack peeking under the cover (`STACK_LAYERS`), a paper grain and rounded fold edges. It sizes itself to the window as it opens (registry `focusScale` stays unset, so compact pan bounds pin the camera to the booklet) and the camera returns 320ms after closing, so the map folds in place first.

## Phone layout

On a phone held upright (compact layout, taller than wide) the open sheet turns a quarter as it grows and its print is laid out tall (`PORTRAIT_PRINT` in `sheet-art.ts`, turned into sheet space through `toSheet`), so the map stands upright and fills the screen; the paper's shading is matte, with no specular hot spot, because a sharp gloss read as plastic. Phones open on `compactView`, wide screens on `view` (zoomed so the harbour is about a quarter of the frame).

## Folds, creases and sharpness

Folds are drawn by `drawCreases`: a wavering fibre hairline, a soft rounding band (light on mountain folds, shaded on valleys, alternating along the accordion) and ink cracks as fine streaks clustered by noise and near crossings; dashed or dotted wear read as a drawn rule.

Sharpness: each panel face is its canvas alone, with its shade a sibling layer over it. A face holding canvas and shade together became one intermediate surface, which Chrome rasterizes at a fraction of the screen's resolution under a 3D transform (measured 177 against 1616 in Chrome), so the map read soft while moving and snapped sharp at rest; do not wrap them back together or flatten the resting sheet to 2D, which reintroduces that snap.

The rows meet in one plane: `getPanelPlacements` lays the cross fold flat once it is within `CROSS_FLAT` of open, because Chrome splits faces that are nearly but not quite coplanar and draws the pieces a pixel off, and the front faces bleed across the cross crease with the other row's real pixels rather than repeated edges, so which coplanar row Chrome draws on top does not show; without both the cross crease visibly jumped as the open sheet settled. Headless bundled Chromium composites 3D in software and stays soft regardless: measure sharpness in Chrome.

The close's cross fold runs 0.52s on a sine ease: its edge swings more than twice as far as an accordion panel's, and on the cubic ease it snapped about three times faster.

## The live map

The map canvas is printed onto the sheet on whole device px (`printMap`), tiles are never coarser than the screen (`getTileLevel`) and are not tinted, washed or desaturated, which had made the map warmer and duller than the live site.

The map is live: `map-tiles.ts` draws Tiny Toronto's content-hashed tiles (index ported from the toronto viewer, `tile-index.ts`) with coarser stand-ins while sharp ones load, `src/lib/map-view.ts` holds the view math, and `sheet-art.ts` prints it onto the paper (multiplied into the paper, slightly desaturated, cyan plate out of register) under a fixed frame, grid and title block with a live scale bar.

Drag pans with a fling, ctrl/⌘ + wheel, Safari gesture events and two-finger pinch zoom around the pointer, plain wheel pans, double-click zooms (Shift out), arrows and +/- work while open; the sheet stops wheel and touch propagation so the canvas stays still, and carries `no-drag` so clicks never toggle it.

Tiles load as plain images (no CORS needed, the canvases are never read), but `tiles/index.json` is fetched, so the tiles bucket's CORS must allow the site's origin (`https://rickyzhang.me`; localhost 5173 and 4173 are allowed for dev and preview).

## The `/toronto` route

`/toronto` is a prerendered page (`src/router/toronto.tsx`, its own share meta, canonical to `/`) that replaces itself with `/` and history state `{ openItem: "streetmap-item" }`. Root passes it to the canvas as `openItemId` and clears the state through `onItemOpened` as soon as the canvas takes it, so a reload or Back does not reopen the map.

`useOpenItemLink` waits for the entrance to finish, glides the camera to the item's focus viewport (`getFocusViewport`, the same target a click pans to; `OPEN_ITEM_GLIDE`, 1.1s) and activates it as if clicked; pointer, wheel, key or touch input during the glide cancels the open, and reduced motion opens it without the glide. The same state can open any single item.
