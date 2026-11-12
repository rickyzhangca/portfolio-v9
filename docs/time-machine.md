# Time machine

Read this before changing `src/components/time-machine/`, `src/lib/time-machine.ts`, `versions.ts` or the archived-version frames. Moved verbatim from AGENTS.md, regrouped by topic; the Current state section overrides older sentences marked as superseded. Desktop only, opened from the toy time machine (see `docs/timecar.md`).

## Current state

Current time-machine loading supersedes the hover/focus preloading described below: only `openVersion` mounts an archived iframe. Timeline hover, keyboard focus, arrow glides and neighbouring-version button hover never load one. Opened frames remain mounted to preserve browsing state, and their screenshots still cover loading.

The present's button uses a fixed world-size box scaled by the camera, and date labels translate by their centres; the frame writer never changes their width/height during zooms. Keep the no-iframe-on-timeline regression in `e2e/time-machine.spec.ts`.

## Camera and windows

The time machine (opened by the toy time machine on the desk, desktop only) is Mission Control for earlier portfolios, modelled as one camera over a row of same-size windows (`src/lib/time-machine.ts`): each window is the screen inset by `getWindowPadding` at its sides and top and by `bottomPadding` (that plus `CONTROLS_SPACE_PX`) below, where an open window's controls sit, laid out from the present into the past in world px, and the camera names the world point at the screen's centre plus a zoom. Closed is scale 1 on the present; the timeline zooms out with the present in the middle and earlier versions to its right, newest first, running off the edge; opening a version is scale 1 on its window. Moving between them only moves the camera, so neighbours slide along the row instead of fading over each other: on close the past slides off to the right.

Two more animated values: `crop` turns the present from the whole screen into a window (its inset and corner radius grow with it, so corners round in continuously), and `push` shoves the windows beside the one nearest the camera further out while it is close, as the canvas's repulsion does.

All five values spring on one `CAMERA_SPRING` (framer-motion `animate` on plain `motionValue`s), and one `frame.render` writer sets every transform and squircle `clip-path: path()` (`getSquirclePath`, superellipse exponent 4, 40px on screen at any zoom, drawn in element units as `WINDOW_RADIUS_PX / scale`); `corner-shape` cannot shape a clip. The canvas wrapper's clip is cleared at rest.

## Native scrolling and glides

The row scrolls natively: a transparent full-screen scroller (`data-time-machine-scroller`, vertical, sized to the row in screen px) covers the timeline and the camera follows its `scrollTop` one to one, so momentum, wheel smoothing, Safari's end bounce and clamping are the browser's own.

Hand-rolled wheel handling was tried and dropped: choosing a spring or a 1:1 jump per event (by delta size) made trackpad flings and accelerated mouse wheels snap between the two, unbounded overscroll left a dead zone when reversing, and a passive listener could not stop Chrome's back-swipe.

Sideways swipes are added to the scroller (`preventDefault`, which also blocks the history gesture); step buttons, arrow keys, keyboard focus and clicks on a cut-off window centre a window with `glideTo`, which springs `camera.x` on `CAMERA_SPRING` and writes the scroller's `scrollTop` each frame (`writtenTopRef` tells those writes from the user's scroll; the wheel stops a glide where it is). The browser's smooth `scrollTo` restarted from rest on every call, so quick presses felt sluggish; the spring keeps the camera's speed, so they add up, aimed from the glide's target (`getTimelineTarget`). Setting `scrollTop` from the stage (back from an open window) must leave `scrollRef` equal to it, so the scroll event does not cut the camera's flight short.

Because the scroller covers the windows, it takes their pointer: clicks and hover hit-test with `getWindowAt`, and a click on a window the screen's edge cuts (`isWindowInView`) only scrolls it to the middle, while one wholly in view opens; the window buttons stay underneath for keyboard and assistive tech, so browser specs click by position. WebKit scrolls by whole pixels, so centring is only exact to about a pixel.

## Labels and room

Labels read "Now" and the version's month (`formatVersionDate`, `date` in `versions.ts`), with no hover or focus ring on the windows: keyboard focus lights the label instead. The room is flat dark grey from the first frame (`#323235`) and deepens into its vignette over `ROOM_FADE_MS`; fading the whole room in from transparent showed the desk's near-white first.

## Root ownership and canvas integration

Root owns it: `openTimeMachine` on the canvas session loads `src/components/time-machine/time-machine.tsx` (warmed on hover/focus by `warmTimeMachine`) and holds the component in state, not `React.lazy`, which suspended once even for a loaded chunk and held the first frame ~300ms behind Suspense's throttle.

Opening sets `canvasVisible: false` so the canvas's interaction locks apply, `timeMachineOpen` so the canvas controls hide at once (the liquid toolbar's SVG goo filter does not follow the scale and smears), and makes the canvas wrapper `inert`. Closing, `onLanding` fires once the zoom passes 0.99 and clears `timeMachineOpen`, so the toolbar fades back while the spring's tail settles (about 650ms after the close starts, not after `onClosed`); its 650ms delay applies only after the street map (`toolbarHiddenBy` in `canvas.tsx`).

The stage transforms the wrapper itself (imperative styles, restored on unmount), so the live canvas keeps its state; root re-renders would re-render the whole App, so do not drive the camera through React state. `pauseLamp` stops the lamp's listeners while the canvas is scaled: they measure in client px.

## Earlier versions and their frames

Earlier versions are their own deployed sites (`versions.ts`): v8 at v8.rickyzhang.me, and portfolios that are no longer online as static copies in the separate `portfolio-archive` repository, served at `https://archive.rickyzhang.me/<id>/` (2018 Jekyll, 2019 Adobe Portfolio, May 2022 and Dec 2022 React builds; rebuilt from their old sources or scraped, with analytics removed, vendor scripts and fonts self-hosted, images as WebP and each SPA route given its own copy of `index.html`, since Pages rejects a `_redirects` rewrite to `index.html` as a loop).

Each is shown as a screenshot (`node tools/capture-time-machine.ts <id>`, shot at an open window's size on 1440x900 at 2x; `TIME_MACHINE_ARCHIVE=http://localhost:<port>` shoots the archive from a local server before it is deployed) until a sandboxed iframe (mounted on hover/focus to preload, or on open) (superseded — see Current state) has loaded and its window has been opened and landed (`FRAME_REVEAL_AFTER_OPEN_MS`), when the page fades in over it: a load event can come before an old site paints, so a frame revealed on the timeline could show a white window.

The screenshot stays under the frame, which has no background of its own (every version paints an opaque page): a cross-origin frame stepped onto after sitting off screen sometimes presented nothing for a while, and the frame's old white background showed as a blank window; the iframe is `inert` and covered by a button until its window opens.

Escape steps back (open window, timeline, canvas) but cannot reach the page while focus is inside a cross-origin frame, so the padding and the close button also step back.

## Step buttons and controls

Newer and older buttons are always there, placed every frame by the camera writer below the corners of the window in the middle of the screen: level with the labels on the timeline (labels are as tall as the 56px buttons, `TIMELINE_CONTROLS_GAP_PX` below the window), where they glide the row one window, and in the room below an open window, where they step to the neighbouring version (arrow keys too). Nothing fades in from nowhere: the controls hang from the bottom edge of the middle window, which is the screen's own edge while `crop` is 0, so they rise from below the screen as the time machine opens and sink back as it closes, and a sixth camera value, `open`, moves them into the room below an opened version.

A step that has run out shrinks and fades away (`disabled:scale-50 opacity-0`, no pointer events) rather than dimming, and hands keyboard focus to the other arrow. The wheel does not snap, so while it leaves the row between windows (`isBetweenWindows`: over a screen px off one) both arrows go away the same way and turn inert, and come back when a glide starts or the row rests on a window again, since a step is from one window to the next; presses give under the finger (`active:scale-90`), on a CSS spring from `springCss`.

The close button sits behind every window (`z-0`, above the backdrop alone), tucked `CLOSE_TUCK_PX` up behind the middle window's bottom edge, and slides out from under it with `open`, retreating behind it when the version shrinks back into the row. Stepping flies the camera straight to the neighbour, and `pushFrom` springs with it, so the window left behind eases aside instead of jumping to its pushed side.

## Hover lift on the timeline

On the timeline a window one click opens (wholly on screen, `isWindowInView`, or keyboard-focused) lifts under the pointer: a per-window `lifts` spring (`LIFT_SPRING`, quicker than the camera) grows it `LIFT_SCALE` about its centre and raises it `LIFT_PX`, folded into the camera writer's transforms (the present's canvas too) so opening carries on from the lifted pose, and a press gives it back to `PRESSED_LIFT`. It lights up as its 5% veil (`VEIL_OPACITY`; every timeline window has one) clears, a rim (its own squircle stroked twice as wide as it shows, inside the clip) fades in, its label brightens through `--lift`, and a `LiftShadow` drawn once at the timeline's zoom fades in under it. Veils are opacity layers rather than `filter: brightness()`, which would re-raster the live canvas each frame; the present's veil and rim sit in its click button, clipped per frame.

Lifts are rechecked as the camera moves but held while the row is moving (camera faster than `SETTLED_SPEED_PX` or zooming, or within `SCROLL_SETTLE_MS` of a native scroll, whose jumps carry no velocity): sliding under a still pointer, each window rose and fell as it passed, as did a clicked cut-off window gliding in.

## Depth of field

The timeline has depth of field: `DepthOfField` stacks `DEPTH_LAYERS` of `backdrop-filter` blur on each side, from the screen's edge to the middle window's, under gradient masks so the blur grows outwards. A shader cannot do it: WebGPU/WebGL cannot read the live canvas or cross-origin frames, and backdrop filters can. The sides sit over windows and labels, under the step buttons, and the camera writer fades them with the timeline (`crop * (1 - open)`), hiding them once clear so nothing filters while a version is open.

They blur only within `DEPTH_ZOOM_RANGE` (2%) of the timeline's zoom, and only over the band the row and its labels rest in (`DEPTH_BAND_MARGIN_PX` beyond it), in two layers: every backdrop px is redrawn each frame the row or the canvas under it moves, and at 5K (2560x1440 at 2x) the earlier full-height three-layer sides added about a dozen late frames to every zoom and every step-button glide. Now glides show none and a zoom one or two.

The writer fades each layer, never their side: an opacity below 1 on the parent makes it the layers' backdrop root, so they blurred nothing until the fade ended (Safari showed the blur a second late). Each layer has `will-change: transform`: Chrome squashed the three overlapping masked backdrops into one layer and drew no blur at all, which only full-viewport screenshots show (a clipped screenshot recomposites and hides it; Playwright WebKit never draws backdrop filters in screenshots). In headed Chromium on an M3 at 2x, step-button glides showed no late frames with or without them; confirm Safari in Safari.

## History and tests

There is no history entry: frame navigations join the joint session history, so Back could not close it reliably. `e2e/time-machine.spec.ts` covers it (run it on one worker, as CI does: with parallel workers the lift test's hover sometimes lands while the row still counts as moving, and the veil stays at 5%); external origins are blocked in e2e, so frames there never load.
