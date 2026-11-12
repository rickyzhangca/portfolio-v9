# Desk lamp and lit surfaces

Read this before changing the desk lamp (`desk-lamp.ts`, `DeskLampRoom`), lit surfaces (`lit-surface.ts`, `PaperLighting`, `LampSprite`), keycaps or the lamp playground. Moved verbatim from AGENTS.md; the Current state section overrides older sentences marked as superseded.

## Current state

Current lamp scheduling and paper shadows supersede the always-running loop and WebGPU shadow canvases described in the rendering history below. `desk-lamp.ts` sleeps once the pointer converges; `wakeLamp` requests one frame, and listeners request another while easing, fading, restoring full resolution or draining their draw queue. Inputs, config/flare changes, new subscribers and camera transforms wake it. `watchLampScene` watches geometry changes, late media/layout and running compositor animations; it ignores the lamp's own filters, sheens and sprite writes so they cannot keep it awake. Named pauses compose across readers, hidden routes and the time machine; hidden tabs cancel the pending frame too.

Never rely on an idle subscription to poll future work: wake it when changing shader-only state. Frame caches share bounds, computed styles and parsed matrices, and off-screen casters/sprites skip transform reads. Papers now use `runLampSprite` with their own rounded box and `inside: false`, moving a pre-blurred bitmap behind the caster; their filter takes over during the caster's own layout transform. Stickers still hand back to the filter when lifted.

All outlines share the four-per-frame queue, which keeps the lamp awake until ready. The bitmap's margin follows its blur rather than reserving 72px on every side; keycap/keyboard/email margins remain unchanged for lifted shadows. `e2e/lamp-idle.spec.ts` opts into WebGPU (`enableLamp` in fixtures), skips without a desktop Chromium adapter, and checks zero idle lamp layout/style reads on home, open folders and readers. Run it headed when checking real GPU behavior.

## Redraw budget and the snap after a quick move

Measured in headed Chrome at 2560x1440 at 2x (2026-11): after any quick move of the pointer, every lit surface visibly caught up once it stopped. Three causes, all in `lit-surface.ts`, each fixed:

- The budget was stuck near 1.3 million pixels a frame. A frame that ran late while the page loaded set `ceiling` there with the GPU idle, and growth then crept at `BUDGET_GROWTH_NEAR_CEILING`; a 450ms flick redrew one large surface a frame and the rest drained for 170ms after it stopped. A late frame now counts only when the frame before it drew at least `SATURATED_SHARE` of the budget, and only the second within `LATE_AGAIN_MS` lowers it (the first frame of a quick move ran late once at 2.2 million pixels on a GPU that then drew 4.6 million a frame on time). A ceiling the budget has grown `CEILING_DISPROVED` past is forgotten. `BUDGET_GROWTH` is 10% a frame (it was 2%: from 1 to 4 million took over a second of continuous motion, longer than most moves).
- Soft surfaces dropped to half resolution on speed alone and were all redrawn sharp `MOTION_REST_MS` after the lamp slowed, staggered over 200ms by the small budget. They now drop only when a fast lamp leaves surfaces waiting for budget, and hold until it slows; on GPUs that keep up they never change resolution.
- `MOTION_REST_MS` is 80 (it was 150), so where resolution does drop it comes back while the lamp is still gliding the last pixels, not as a separate step after everything has stopped.

- Draws that allocate their backing store are budgeted (`ALLOCATION_COST`) but no longer teach the ceiling: the entrance allocates every canvas on the desk within a few frames, those frames ran late, and the ceiling they left varied from run to run between 2 and 9 million pixels.

After the fixes the same flick redraws all 25 relit surfaces every frame, in three runs out of three, and the draws taper off as the lamp settles instead of draining after it. At 5K the GPU holds full resolution (9.5 million pixels a frame) for about nine frames, then two frames run late, the budget halves and soft surfaces drop to half resolution (4.6 million); they restore over three frames about 130ms after the pointer stops, which is the one step left. At 1440x900 full resolution holds longer. Not tried: a `motionScale` of 0.75, which would halve that step's size if the GPU can carry it.

## Browser support and gating

The desk lamp runs in desktop Chromium and desktop Safari (`isDeskLampSupported`: exact `Chromium` client-hint brand, not mobile, not Android; or, without client hints, a Mac WebKit user agent with no touch points, which rules out iPads asking for desktop sites). Firefox stays off. `?lamp=force` skips the browser check (WebGPU and the adapter probe still decide) for comparing it elsewhere. Playwright's WebKit is not a stand-in for Safari here: it kept SVG masks that Safari drops, and it runs lamp mode at ~12fps while real Safari is smooth, so confirm Safari rendering and performance in Safari itself.

WebKit keeps a 2D context's `filter` and reads it back but never blurs, so the folder relief and seam blur through `drawBlurred` in `folder-renderer.ts`, which probes once and falls back to an offset shadow (`shadowBlur` 2σ = Gaussian σ); never set `context.filter` directly for lit textures. Safari's canvas also drops SVG masks when it rasterizes a logo, so a cover whose logo SVG uses `<mask>` gives the lamp a bitmap through `litLogo` (`src/assets/logos/mintlify-lit.webp`): drawn by Chrome from the SVG at 252px (84px × `LOGO_DENSITY`), then `cwebp -q 90 -alpha_q 100 -m 6 -sharp_yuv`. resvg renders that logo's glass wrongly, so do not regenerate it with resvg; redo it when the SVG changes.

## Light tab and lamp config

The playground's Light tab (first, and only while the lamp is on) edits `lampConfigAtom`: lamp height, pool size and room dimming. The lamp's follow rate is the fixed `LAMP_FOLLOW_RATE`. It is 40 a second (a 25ms time constant). At 16 the light trailed a 900px/s sweep by 54ms, about 48px, and took 200ms to cover 95% of a jump, which read as the lighting not following the hand; measured in headed Chrome at 2560x1440 at 2x, 40 trails by 18ms with no more late frames and the lit surfaces no staler (a relit pixel's lighting is about 3 frames old either way, since surfaces far from the lamp wait for more travel before they redraw, `LIGHT_STEP`), and the desk is at rest 167ms after a jump instead of 467ms. At 70 the light trailed by 8ms but the surfaces' lighting ran two frames older. `DeskLampRoom` copies it into `desk-lamp.ts` with `setLampConfig`, and every lamp listener reads `getLampConfig()` each frame instead of constants. Defaults (`src/lib/lamp-config.ts`) reproduce the designed lighting. The room gradient lives in `src/lib/room-gradient.ts`, outside the first-load graph.

## Keycaps

Under the lamp the fun-project icons become WebGPU keycaps (`lit-keycaps.tsx`, `keycaps-shader.wgsl`), mounted as soon as the lamp is on. Each cap grows in with its DOM icon's pop: `popAt` reads the scale Motion writes inline on the icon, and the shader scales that cap's rounded edges (a scale of 0 is not drawn), so a card that rises lit never shows the pictures first. Prints (`src/assets/fun-projects/glyphs`, 288px squares without the cap) and plastics live in `src/scenes/data/fun-project-keycaps.ts`, loaded through the card content's `loadKeycaps` only when the lamp is on. Until the caps draw, or without WebGPU, each DOM icon casts its own lamp shadow, as high as the pointer lifts it, and a `lamp-sheen` glint.

## Lit surfaces and the redraw queue

### Budget and growth

Lit surfaces, the MacBook included, share a redraw queue in `lit-surface.ts`: its per-frame budget grows while frames arrive on time and halves after a late one (a fixed four left each folder relit every fifth frame), but only on frames that used all of it: a budget left to climb while the lamp rested redrew every surface on the first fast sweep, stalled the GPU and collapsed to the minimum for a third of a second. The budget counts backing pixels (each surface's canvases, overhang included; `canvases` on `runLitSurface`), not surfaces: counted in surfaces, the 15 prints of an opening folder all fell stale at once within the budget a sweep had left, twice the pixels a frame could draw, and three or four frames in a row ran late. A draw into a new or resized backing store counts `ALLOCATION_COST` (2x); lamp shadow canvases skip the queue but charge their pixels with `chargeLitPixels`. Each late frame records the budget it ran at, and growth (2% a frame) drops to 0.25% within 85% of it, so a saturated lamp probes past its ceiling every few seconds. Opening the Wealthsimple folder went from 3-4 late frames to 0-1 cold and 1-2 right after a sweep.

### Turn order

Turns go to the surface whose lighting is most visibly stale, so those under the pointer redraw first; tucked prints in a closed folder (`covered`, prominence 0) keep their last frame however the lamp moves and are relit when it opens, which freed a quarter of the pixels redrawn in a fast sweep; ranking waiting surfaces up by how long they waited took turns from those under the pointer and made their shadows step. Surfaces whose own parts move (a lifting cap, a pressed key) jump the queue.

### Capacity and resolution

The queue's halving tracks real capacity: on an Apple GPU at 2x about 4.5 million redrawn canvas pixels a frame, ~11 draws. Never shrinking it doubled draws and dropped to ~34fps. The cost is per redrawn pixel (texture allocation, present, compositing), not per canvas or per shader instruction: at half resolution the same machine redrew 25 canvases a frame with no late frames, removing ten canvases did not help, and tripling draw calls barely mattered. So surfaces whose detail is soft (papers, labels, prints, folder covers) pass `motionScale: 0.5`: while the lamp moves faster than ~240px/s they redraw at half resolution, never below one backing pixel per CSS pixel, and restore full resolution 150ms after it slows. That cut paper-shadow lag over 1px from ~27% to ~4% of frames while circling the keycaps, with half the late frames. Keycaps, the laptop, keyboard, email and badge draw sharp prints and keep full resolution.

### Measuring

Measure in a visible browser with no other lamp pages open; competing GPU work made an earlier run look canvas-bound.

## DOM casters and lamp shadows

`subscribeLamp` listeners read layout when called and return their DOM writes, which run after every listener has read; writing inline forces a style recalculation per listener.

### Filters and contact shadows

DOM casters (`data-lamp-shadow`) take only the lamp's single `drop-shadow` in their per-frame filter; casters whose outline is their own rounded box (papers, prints, pills) add `data-lamp-contact` for a contact shadow written as a `box-shadow`, which changes only with lift. While a contact caster flies (over 120 canvas px/s, back under 30), the lamp writes its shadow as an equal box-shadow instead (blur doubled: drop-shadow's blur is a standard deviation) and rewrites it only after a 3px step: the compositor re-blurs a drop-shadow filter every frame its caster scales or rotates, and Wealthsimple's 15 prints and captions dropped about one frame in eight opening or closing, even with the filters held still. While the lamp is on every caster carries `will-change: filter` (added to any transform hint it already has): painted in place, each per-frame drop-shadow rewrite re-rasterized the card under it, and a lamp sweep over an open folder dropped one frame in five with the lit surfaces left a fifth of their redraw capacity; as layers the GPU only re-blurs cached pixels. Filters are rewritten only after a 0.5 screen px change.

### Paper and print shadow canvases

Prints and article papers go further: `PaperLighting castsShadow` puts a WebGPU canvas behind the caster (`lit-shadow.ts`, `shadow-shader.wgsl`) that draws its lamp shadow in closed form (erf of the rounded box's distance, matching drop-shadow's Gaussian) at 0.5 backing px per screen px, outside the redraw queue. (superseded — see Current state) The caster claims its shadow with `claimLampShadow`; the lamp then leaves its filter off and hands the canvas the shadow it worked out, except while the caster has a transform of its own (a layout animation), hidden or tucked in a closed folder, when the filter draws it again. (superseded — see Current state) On an M3 at 2x a fast sweep over the open Wealthsimple folder went from ~49fps with 20% late frames and 0.8 Mpx of lit-surface redraws a frame to ~58fps, 3% late (the budget's own probing) and ~3.9 Mpx. (superseded — see Current state)

### Sprites for casters that are not boxes

Casters that are not boxes behind which a canvas can sit (swag stickers, folder covers and backs, fun-project detail cards) get a `LampSprite` canvas inside the caster at `-z-10`, whose `outline` is the caster's image alpha (`"image"`), the rounded border box of its first other child (`"box"`), or an SVG path over its box (folder covers: `FOLDER_SHAPE_PATH`); tucked prints keep their shadow canvas in a closed folder. Every frame the lamp moves the compositor redraws the whole desk and re-blurs every filter on screen, changed or not, so with these no filter remains on screen at rest; under a fixed extra GPU load standing in for a weaker GPU, late frames fell from 39-62% to 13-24% across home and an open folder.

### Sticker sprites

For stickers, `lit-sprite.ts` draws the image's outline blurred once with a 2D canvas `shadowBlur` (WebKit ignores the context's `filter`) at 0.5 backing px per screen px, claims the shadow with `{ inside: true, ready: false }`, and then only moves and fades the bitmap, which the compositor does without blurring. The lamp hands an unready claim its shadow only once the sticker rests (a flying sticker blurs more), and uses the filter again whenever it is lifted past `RESTING_LIFT` (hover, flight). Bitmaps are drawn four a frame across all stickers (a hundred in one frame held it for 100 ms; six a frame still dropped two) and again only after a 20% zoom or 35% blur drift (the shadow's length alone varies it 28%). Layout for them is read in the lamp's read phase. An open collection's lamp sweep went from ~76% GPU to ~55% with no more late frames on opening.

### Blending, shade and the room overlay

Lamp layers blend normally, never with `mix-blend-mode`, except the folder covers' colored light: a blend mode makes the compositor render its whole group into an extra pass whenever anything in it changes (about 37 passes a frame dropped to 15). The paper shade draws black at `1 - tone` (exactly multiplying by the grey tone), the gloss draws premultiplied light as opaque as its brightest channel (screening, within a few percent warmer over white), sheens are white at an opacity (exactly screening). The room overlay (`room-gradient.ts`) darkens by a third of the way from the tone's darkest channel to its brightest and adds back half of each channel's excess, within two levels of multiplying; under the lamp the body is white, because the page background never took part in the old multiply, so the bare desk showed the tone itself. That took an open folder's fast sweep from 2% late frames to none and the lit surfaces from 4.3 to 5.1 Mpx a frame.

### Depth, and a cost to avoid

Heavier casters deepen their shadow with `data-lamp-depth` (`LAMP_DEPTH`, folder covers 1.6) rather than more lift: a higher caster spreads the same darkness thinner, so its shadow reads lighter next to it. A second drop-shadow chained into the filter doubled its raster cost: fast sweeps dropped every fifth frame, which collapsed the WebGPU draw budget. Measure frame pacing in a visible browser; headless Chrome does not present frames and hid that cost.

## Matrix Sans font

`src/assets/fonts/matrix-sans` holds Matrix Sans Raster (OFL, licence alongside) for the lit email card's screen. `lit-email.tsx` loads it with the `FontFace` API when the desk lamp turns on, so the first view never fetches it.
