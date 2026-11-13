"use no memo";

import { createRef, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { StreetmapCardContent } from "@/cards/registry";
import { getLampConfig, subscribeLamp } from "@/components/lighting/desk-lamp";
import {
  CLOSED_POSE,
  FOLD_COLUMNS,
  FOLD_PARAMS,
  FOLD_ROWS,
  type FoldPose,
  getClosePose,
  getCloseDuration,
  getFaceTint,
  getLightDirection,
  getOpenDuration,
  getOpenPose,
  getPanelPlacements,
  OPEN_POSE,
  PANEL_CORNERS,
  PANEL_HEIGHT,
  PANEL_WIDTH,
  type PanelPlacement,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  toCssMatrix,
  transformDirection,
  transformPoint,
  type Vec3,
} from "@/lib/map-fold";
import {
  clampMapView,
  type MapBounds,
  type MapView,
  panMapView,
  zoomMapView,
} from "@/lib/map-view";
import { MapTiles } from "./map-tiles";
import {
  drawFrontPrint,
  drawScaleBar,
  drawSheetBack,
  LANDSCAPE_PRINT,
  PAPER,
  PORTRAIT_PRINT,
  type PrintLayout,
  printMap,
  toSheetSpace,
  UNDRAWN,
} from "./sheet-art";
import { TileIndex } from "./tile-index";

const PANELS = Array.from({ length: FOLD_ROWS * FOLD_COLUMNS }, (_, i) => ({
  column: i % FOLD_COLUMNS,
  row: Math.floor(i / FOLD_COLUMNS),
}));
/**
 * Faces overlap their neighbours: two edges that meet exactly each
 * antialias, and the desk shows through the seam. Across a vertical crease
 * the bleed repeats the face's own edge pixels, since folded, a crease is an
 * outer edge. Across the cross crease it carries the other row's pixels:
 * open, the rows lie in one plane and Chrome stops ordering them by depth,
 * so the row drawn on top switched as the sheet settled, and repeated edge
 * pixels made the crease line jump. The cover
 * bleeds further: its edges coincide with the stack's under it, and the map
 * under it tinted the cover's edge.
 */
const BLEED = 1;
const COVER_BLEED = 2;
/** Room around the open sheet for its shadow, in stage px. */
const SHADOW_PAD = 220;
/** Room around the open sheet; the canvas controls fade out while it is open. */
const FIT_MARGIN = { x: 28, y: 28 };
const COMPACT_FIT_MARGIN = { x: 10, y: 10 };
const MAX_SCREEN_SCALE = 1.5;
/**
 * A phone held upright turns the open sheet a quarter, so the map stands
 * tall and fills the screen; its print is laid out tall to read upright.
 */
const getPrintLayout = (compact: boolean): PrintLayout =>
  compact && window.innerHeight > window.innerWidth
    ? PORTRAIT_PRINT
    : LANDSCAPE_PRINT;
const getFrameSize = ({ frame }: PrintLayout) => ({
  height: frame.height,
  width: frame.width,
});
/** Fling friction per second, and the speed (sheet px/s) a fling stops at. */
const FLING_DECAY = 5;
const FLING_STOP = 12;
const ZOOM_RATE = 14;

// ---------------------------------------------------------------------------
// Shared across openings: the tile index, the tiles, and the view left last.
// ---------------------------------------------------------------------------

const tileListeners = new Set<() => void>();
const notifyTiles = () => {
  for (const listener of tileListeners) {
    listener();
  }
};
let indexRequest: Promise<TileIndex> | null = null;
let sharedTiles: MapTiles | null = null;
let lastView: MapView | null = null;

const loadTiles = (base: string) => {
  indexRequest ??= TileIndex.load(base, notifyTiles);
  return indexRequest.then((index) => {
    sharedTiles ??= new MapTiles(index, notifyTiles);
    return sharedTiles;
  });
};

const getBounds = (tiles: MapTiles): MapBounds => {
  const [x0, y0, x1, y1] = tiles.index.meta.bounds;
  return { x0, x1, y0, y1 };
};

/** Fetches the index and the first view's tiles before the map is opened. */
export const prefetchStreetmap = (
  content: StreetmapCardContent,
  compact: boolean
) => {
  loadTiles(content.tileBase).then(
    (tiles) =>
      tiles.prefetch(
        lastView ?? (compact ? content.compactView : content.view),
        getFrameSize(getPrintLayout(compact)),
        2.5
      ),
    () => {
      // The sheet shows the failure once it is opened.
    }
  );
};

// ---------------------------------------------------------------------------

interface PanelElements {
  back: HTMLCanvasElement | null;
  backShade: HTMLDivElement | null;
  front: HTMLCanvasElement | null;
  frontShade: HTMLDivElement | null;
  panel: HTMLDivElement | null;
}

interface StreetmapSheetProps {
  compact: boolean;
  content: StreetmapCardContent;
  lampOn: boolean;
  onClosed: () => void;
  onReady: () => void;
  open: boolean;
  /** How the booklet lies on the desk (deg). */
  tilt: number;
}

/**
 * The street map unfolded: sixteen panels moved by the fold's matrices, a
 * shadow cast on the desk, and a live tiled map printed across the front
 * that drags and zooms once the sheet is open.
 */
export const StreetmapSheet = ({
  compact,
  content,
  lampOn,
  onClosed,
  onReady,
  open,
  tilt,
}: StreetmapSheetProps) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLCanvasElement>(null);
  const [panelRefs] = useState(() =>
    PANELS.map(() => ({
      back: createRef<HTMLCanvasElement>(),
      backShade: createRef<HTMLDivElement>(),
      front: createRef<HTMLCanvasElement>(),
      frontShade: createRef<HTMLDivElement>(),
      panel: createRef<HTMLDivElement>(),
    }))
  );
  // The imperative sheet: set up once mounted, driven by the props below.
  const controlsRef = useRef<{
    setLamp: (on: boolean) => void;
    setOpen: (open: boolean) => void;
  } | null>(null);
  const callbacksRef = useRef({ onClosed, onReady });
  callbacksRef.current = { onClosed, onReady };
  const initialRef = useRef({ compact, content, lampOn, open, tilt });

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const sheet = sheetRef.current;
    const shadow = shadowRef.current;
    if (!(stage && sheet && shadow)) {
      return;
    }
    const initial = initialRef.current;
    const panels: PanelElements[] = panelRefs.map((refs) => ({
      back: refs.back.current,
      backShade: refs.backShade.current,
      front: refs.front.current,
      frontShade: refs.frontShade.current,
      panel: refs.panel.current,
    }));
    const magnify =
      FOLD_PARAMS.perspective / (FOLD_PARAMS.perspective - FOLD_PARAMS.liftZ);

    // --- Size: fit the open sheet to the window, at the camera's zoom. ---
    const layout = getPrintLayout(initial.compact);
    const turn = layout.turned ? 90 : 0;
    const frameSize = getFrameSize(layout);
    /** The frame's centre relative to the sheet's, in layout px. */
    const frameOffset = {
      x: layout.frame.x + layout.frame.width / 2 - layout.width / 2,
      y: layout.frame.y + layout.frame.height / 2 - layout.height / 2,
    };
    const stageRect = stage.getBoundingClientRect();
    const cameraScale = stageRect.width > 0 ? stageRect.width / PANEL_WIDTH : 1;
    const margin = initial.compact ? COMPACT_FIT_MARGIN : FIT_MARGIN;
    const screenScale = Math.min(
      (window.innerWidth - margin.x * 2) / layout.width,
      (window.innerHeight - margin.y * 2) / layout.height,
      MAX_SCREEN_SCALE
    );
    const focusScale = screenScale / (magnify * cameraScale);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    // Device px per sheet px, in eighths so every panel is whole pixels.
    const resolution = Math.max(
      1,
      Math.min(3, Math.round(screenScale * pixelRatio * 8) / 8)
    );
    /** Client px per sheet px once open. */
    const openScale = screenScale;

    // --- Canvases. ---
    const makeCanvas = (width: number, height: number) => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      return canvas;
    };
    const sheetCanvas = makeCanvas(
      SHEET_WIDTH * resolution,
      SHEET_HEIGHT * resolution
    );
    const sheetContext = sheetCanvas.getContext("2d");
    const mapCanvas = makeCanvas(
      frameSize.width * resolution,
      frameSize.height * resolution
    );
    const mapContext = mapCanvas.getContext("2d");
    const printCanvas = makeCanvas(
      layout.width * resolution,
      layout.height * resolution
    );
    const printContext = printCanvas.getContext("2d");
    if (!(sheetContext && mapContext && printContext)) {
      return;
    }
    printContext.scale(resolution, resolution);
    drawFrontPrint(printContext, layout);

    const sizeFace = (canvas: HTMLCanvasElement, bleed: number) => {
      const edge = Math.ceil(bleed * resolution);
      canvas.width = PANEL_WIDTH * resolution + edge * 2;
      canvas.height = PANEL_HEIGHT * resolution + edge * 2;
      const inset = edge / resolution;
      const face = canvas.parentElement;
      if (face) {
        face.style.inset = `${-inset}px`;
      }
      canvas.style.width = `${PANEL_WIDTH + inset * 2}px`;
      canvas.style.height = `${PANEL_HEIGHT + inset * 2}px`;
      return edge;
    };
    /**
     * Copies one panel of a sheet image into a face, bleeding its edges;
     * `acrossRows` bleeds the rows' shared edge with the neighbour's pixels.
     * Only the front lies open: the back's cover keeps its own edge.
     */
    const slice = (
      canvas: HTMLCanvasElement,
      source: HTMLCanvasElement,
      column: number,
      row: number,
      edge: number,
      acrossRows = false
    ) => {
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }
      const sw = PANEL_WIDTH * resolution;
      const sh = PANEL_HEIGHT * resolution;
      const sx = column * sw;
      const sy = row * sh;
      const above = acrossRows && row > 0 ? edge : 0;
      const below = acrossRows && row < FOLD_ROWS - 1 ? edge : 0;
      const top = sy - above;
      const height = sh + above + below;
      context.drawImage(
        source,
        sx,
        top,
        sw,
        height,
        edge,
        edge - above,
        sw,
        height
      );
      if (edge <= 0) {
        return;
      }
      context.drawImage(
        source,
        sx,
        top,
        1,
        height,
        0,
        edge - above,
        edge,
        height
      );
      context.drawImage(
        source,
        sx + sw - 1,
        top,
        1,
        height,
        edge + sw,
        edge - above,
        edge,
        height
      );
      if (above === 0) {
        context.drawImage(
          canvas,
          0,
          edge,
          canvas.width,
          1,
          0,
          0,
          canvas.width,
          edge
        );
      }
      if (below === 0) {
        context.drawImage(
          canvas,
          0,
          edge + sh - 1,
          canvas.width,
          1,
          0,
          edge + sh,
          canvas.width,
          edge
        );
      }
    };
    const frontEdges = panels.map(({ front }) =>
      front ? sizeFace(front, BLEED) : 0
    );
    const backEdges = panels.map(({ back }, i) =>
      back ? sizeFace(back, i === 0 ? COVER_BLEED : BLEED) : 0
    );

    // Square when the sheet turns: it passes through every angle in between.
    const shadowSpan = (side: number) =>
      (turn ? Math.max(SHEET_WIDTH, SHEET_HEIGHT) : side) *
        Math.max(1, focusScale) +
      SHADOW_PAD * 2;
    const shadowWidth = shadowSpan(SHEET_WIDTH);
    const shadowHeight = shadowSpan(SHEET_HEIGHT);
    const shadowDensity = Math.min(1, 0.5 * cameraScale * pixelRatio);
    shadow.width = Math.round(shadowWidth * shadowDensity);
    shadow.height = Math.round(shadowHeight * shadowDensity);
    shadow.style.width = `${shadowWidth}px`;
    shadow.style.height = `${shadowHeight}px`;
    shadow.style.left = `${-shadowWidth / 2}px`;
    shadow.style.top = `${-shadowHeight / 2}px`;
    const shadowContext = shadow.getContext("2d");
    const maskCanvas = makeCanvas(shadow.width, shadow.height);
    const maskContext = maskCanvas.getContext("2d");

    // --- State. ---
    let disposed = false;
    let isOpen = initial.open;
    let isLampOn = initial.lampOn;
    let ready = false;
    let pose: FoldPose = CLOSED_POSE;
    let motion: {
      direction: "open" | "close";
      from: FoldPose;
      start: number;
    } | null = null;
    let frame = 0;
    let poseDirty = true;
    let mapDirty = true;
    let tiles: MapTiles | null = null;
    let failed = false;
    let view: MapView =
      lastView ??
      (initial.compact ? initial.content.compactView : initial.content.view);
    let fling: { vx: number; vy: number } | null = null;
    let zoom: { anchor: { x: number; y: number }; remaining: number } | null =
      null;
    let lastFrameTime = 0;
    const lamp = { x: 0, y: 0 };

    const schedule = () => {
      if (!(frame || disposed)) {
        frame = requestAnimationFrame(tick);
      }
    };

    // --- The map. ---
    const setView = (next: MapView) => {
      view = tiles ? clampMapView(next, getBounds(tiles), frameSize) : next;
      lastView = view;
      mapDirty = true;
      schedule();
    };

    const paintFront = () => {
      mapContext.setTransform(resolution, 0, 0, resolution, 0, 0);
      // Tiles finer than the screen are scaled down: filter them properly.
      mapContext.imageSmoothingQuality = "high";
      mapContext.fillStyle = UNDRAWN;
      mapContext.fillRect(0, 0, frameSize.width, frameSize.height);
      tiles?.draw(mapContext, view, frameSize, resolution);
      if (failed) {
        mapContext.fillStyle = "#6b6760";
        mapContext.font = "500 9px Helvetica Neue, Arial, sans-serif";
        mapContext.textAlign = "center";
        mapContext.fillText(
          "The map could not be loaded. Explore it at toronto.rickyzhang.me",
          frameSize.width / 2,
          frameSize.height / 2
        );
      }
      sheetContext.setTransform(resolution, 0, 0, resolution, 0, 0);
      sheetContext.fillStyle = PAPER;
      sheetContext.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT);
      toSheetSpace(sheetContext, layout);
      printMap(sheetContext, mapCanvas, layout, resolution);
      sheetContext.drawImage(printCanvas, 0, 0, layout.width, layout.height);
      drawScaleBar(sheetContext, view.scale, layout);
      sheetContext.setTransform(1, 0, 0, 1, 0, 0);
      for (const [i, { front }] of panels.entries()) {
        if (front) {
          slice(
            front,
            sheetCanvas,
            PANELS[i].column,
            PANELS[i].row,
            frontEdges[i],
            true
          );
        }
      }
    };

    // --- Light and shadow. ---
    const getLamp = (): Vec3 | null => {
      if (!isLampOn) {
        return null;
      }
      const rect = stage.getBoundingClientRect();
      return [
        (lamp.x - (rect.left + rect.width / 2)) / cameraScale,
        (lamp.y - (rect.top + rect.height / 2)) / cameraScale,
        Math.max(620, getLampConfig().heightPx / cameraScale),
      ];
    };

    const drawShadow = (placements: PanelPlacement[], light: Vec3 | null) => {
      if (!(shadowContext && maskContext)) {
        return;
      }
      const k = shadowDensity;
      maskContext.setTransform(1, 0, 0, 1, 0, 0);
      maskContext.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      maskContext.setTransform(
        k,
        0,
        0,
        k,
        (shadowWidth / 2) * k,
        (shadowHeight / 2) * k
      );
      maskContext.fillStyle = "#000";
      let zSum = 0;
      let count = 0;
      for (const { matrix } of placements) {
        maskContext.beginPath();
        for (const [i, corner] of PANEL_CORNERS.entries()) {
          const point = transformPoint(matrix, corner);
          const direction = getLightDirection(point, light);
          const x = point[0] - (point[2] * direction[0]) / direction[2];
          const y = point[1] - (point[2] * direction[1]) / direction[2];
          if (i === 0) {
            maskContext.moveTo(x, y);
          } else {
            maskContext.lineTo(x, y);
          }
          zSum += point[2];
          count += 1;
        }
        maskContext.closePath();
        maskContext.fill();
      }
      const height = zSum / count;
      shadowContext.setTransform(1, 0, 0, 1, 0, 0);
      shadowContext.clearRect(0, 0, shadow.width, shadow.height);
      // Blurred through an offset shadow: WebKit ignores a context's filter.
      const far = shadow.width + 100;
      const pass = (alpha: number, blur: number) => {
        shadowContext.shadowColor = `rgba(20,14,8,${alpha})`;
        shadowContext.shadowBlur = blur * k * 2;
        shadowContext.shadowOffsetX = far;
        shadowContext.drawImage(maskCanvas, -far, 0);
      };
      const base = light ? 0.42 : 0.2;
      pass(base * (1 - Math.min(0.6, height / 400)), 3 + height * 0.22);
      if (height < 30) {
        pass(0.12 * (1 - height / 30), 1.5);
      }
    };

    const renderPose = () => {
      const placements = getPanelPlacements(
        pose,
        focusScale,
        turn,
        initial.tilt
      );
      const light = getLamp();
      const tintPoints = [
        [0, PANEL_HEIGHT / 2, 0],
        [PANEL_WIDTH / 2, PANEL_HEIGHT / 2, 0],
        [PANEL_WIDTH, PANEL_HEIGHT / 2, 0],
      ] as const;
      for (const [i, { matrix }] of placements.entries()) {
        const elements = panels[i];
        if (!elements.panel) {
          continue;
        }
        elements.panel.style.transform = toCssMatrix(matrix);
        const normal = transformDirection(matrix, [0, 0, 1]);
        const frontUp = normal[2] >= 0;
        const visible: Vec3 = frontUp
          ? normal
          : [-normal[0], -normal[1], -normal[2]];
        const stops: ReturnType<typeof getFaceTint>[] = [];
        for (const point of tintPoints) {
          stops.push(
            getFaceTint(
              visible,
              getLightDirection(transformPoint(matrix, point), light),
              isLampOn
            )
          );
        }
        if (!frontUp) {
          stops.reverse();
        }
        const shade = frontUp ? elements.frontShade : elements.backShade;
        if (shade) {
          shade.style.background = `linear-gradient(to right, ${stops.join(", ")})`;
        }
      }
      drawShadow(placements, light);
    };

    // --- The loop. ---
    function tick(now: number) {
      frame = 0;
      if (disposed) {
        return;
      }
      const elapsed = lastFrameTime
        ? Math.min(0.05, (now - lastFrameTime) / 1000)
        : 1 / 60;
      lastFrameTime = now;
      let busy = false;
      if (motion) {
        const t = (now - motion.start) / 1000;
        const duration =
          motion.direction === "open" ? getOpenDuration() : getCloseDuration();
        if (t >= duration) {
          pose = motion.direction === "open" ? OPEN_POSE : CLOSED_POSE;
          const closed = motion.direction === "close";
          motion = null;
          poseDirty = true;
          if (closed) {
            renderPose();
            callbacksRef.current.onClosed();
            return;
          }
        } else {
          pose =
            motion.direction === "open"
              ? getOpenPose(t, motion.from)
              : getClosePose(t, motion.from);
          poseDirty = true;
          busy = true;
        }
      }
      if (fling) {
        setView(panMapView(view, fling.vx * elapsed, fling.vy * elapsed));
        const decay = Math.exp(-FLING_DECAY * elapsed);
        fling = { vx: fling.vx * decay, vy: fling.vy * decay };
        if (Math.hypot(fling.vx, fling.vy) < FLING_STOP) {
          fling = null;
        } else {
          busy = true;
        }
      }
      if (zoom && tiles) {
        const step = zoom.remaining * (1 - Math.exp(-ZOOM_RATE * elapsed));
        setView(
          zoomMapView(
            view,
            Math.exp(step),
            zoom.anchor,
            getBounds(tiles),
            frameSize
          )
        );
        zoom.remaining -= step;
        if (Math.abs(zoom.remaining) < 0.002) {
          zoom = null;
        } else {
          busy = true;
        }
      }
      if (mapDirty) {
        mapDirty = false;
        paintFront();
      }
      if (poseDirty) {
        poseDirty = false;
        renderPose();
      }
      if (busy) {
        schedule();
      } else {
        lastFrameTime = 0;
      }
    }

    const startMotion = (direction: "open" | "close") => {
      motion = { direction, from: pose, start: performance.now() };
      fling = null;
      zoom = null;
      schedule();
    };

    // --- Input. ---
    /** Client px to layout px from the frame's centre, for the open sheet. */
    const toFrame = (clientX: number, clientY: number) => {
      const rect = stage.getBoundingClientRect();
      return {
        x: (clientX - (rect.left + rect.width / 2)) / openScale - frameOffset.x,
        y: (clientY - (rect.top + rect.height / 2)) / openScale - frameOffset.y,
      };
    };
    const pointers = new Map<number, { x: number; y: number }>();
    let samples: { t: number; x: number; y: number }[] = [];
    const interactive = () => isOpen && ready && tiles !== null;

    const onPointerDown = (event: PointerEvent) => {
      if (
        !interactive() ||
        (event.pointerType === "mouse" && event.button !== 0)
      ) {
        return;
      }
      sheet.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      fling = null;
      zoom = null;
      samples = [{ t: event.timeStamp, x: event.clientX, y: event.clientY }];
      sheet.style.cursor = "grabbing";
    };
    const onPointerMove = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!(previous && tiles)) {
        return;
      }
      if (pointers.size === 1) {
        const dx = (event.clientX - previous.x) / openScale;
        const dy = (event.clientY - previous.y) / openScale;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        setView(panMapView(view, dx, dy));
        samples.push({
          t: event.timeStamp,
          x: event.clientX,
          y: event.clientY,
        });
        samples = samples.filter(({ t }) => event.timeStamp - t < 100);
        return;
      }
      // Two fingers: zoom by their spread around their midpoint, and move with it.
      const [a, b] = [...pointers.values()];
      const before = {
        d: Math.hypot(a.x - b.x, a.y - b.y),
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
      };
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const [c, d] = [...pointers.values()];
      const after = {
        d: Math.hypot(c.x - d.x, c.y - d.y),
        x: (c.x + d.x) / 2,
        y: (c.y + d.y) / 2,
      };
      let next = panMapView(
        view,
        (after.x - before.x) / openScale,
        (after.y - before.y) / openScale
      );
      if (before.d > 0) {
        next = zoomMapView(
          next,
          after.d / before.d,
          toFrame(after.x, after.y),
          getBounds(tiles),
          frameSize
        );
      }
      setView(next);
      samples = [];
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!pointers.delete(event.pointerId)) {
        return;
      }
      if (pointers.size > 0) {
        samples = [];
        return;
      }
      sheet.style.cursor = "";
      const [first] = samples;
      const last = samples.at(-1);
      if (
        first &&
        last &&
        last.t - first.t > 0 &&
        event.timeStamp - last.t < 60
      ) {
        const seconds = (last.t - first.t) / 1000;
        const vx = (last.x - first.x) / seconds / openScale;
        const vy = (last.y - first.y) / seconds / openScale;
        if (Math.hypot(vx, vy) > 60) {
          fling = { vx, vy };
          schedule();
        }
      }
      samples = [];
    };
    const zoomBy = (factor: number, anchor: { x: number; y: number }) => {
      zoom = { anchor, remaining: (zoom?.remaining ?? 0) + Math.log(factor) };
      fling = null;
      schedule();
    };
    let gestureScale = 1;
    let gesturing = false;
    const onWheel = (event: WheelEvent) => {
      // The canvas pans on wheel; over the open map, the map takes it.
      event.stopPropagation();
      if (!interactive()) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      if (!tiles) {
        return;
      }
      let unit = 1;
      if (event.deltaMode === 1) {
        unit = 16;
      } else if (event.deltaMode === 2) {
        unit = window.innerHeight;
      }
      if (event.ctrlKey || event.metaKey) {
        if (gesturing) {
          return;
        }
        zoom = null;
        setView(
          zoomMapView(
            view,
            Math.exp(-event.deltaY * unit * 0.01),
            toFrame(event.clientX, event.clientY),
            getBounds(tiles),
            frameSize
          )
        );
        return;
      }
      fling = null;
      setView(
        panMapView(
          view,
          (-event.deltaX * unit) / openScale,
          (-event.deltaY * unit) / openScale
        )
      );
    };
    // Safari pinches as gesture events rather than ctrl + wheel.
    const onGestureStart = (event: Event) => {
      event.preventDefault();
      gesturing = true;
      gestureScale = 1;
    };
    const onGestureChange = (event: Event) => {
      event.preventDefault();
      const gesture = event as Event & {
        clientX: number;
        clientY: number;
        scale: number;
      };
      if (!(interactive() && tiles)) {
        return;
      }
      setView(
        zoomMapView(
          view,
          gesture.scale / gestureScale,
          toFrame(gesture.clientX, gesture.clientY),
          getBounds(tiles),
          frameSize
        )
      );
      gestureScale = gesture.scale;
    };
    const onGestureEnd = (event: Event) => {
      event.preventDefault();
      gesturing = false;
    };
    const onDoubleClick = (event: MouseEvent) => {
      if (!interactive()) {
        return;
      }
      zoomBy(event.shiftKey ? 0.5 : 2, toFrame(event.clientX, event.clientY));
    };
    const stopTouch = (event: TouchEvent) => {
      // The canvas pans from touches anywhere; on the open map they are its own.
      event.stopPropagation();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!interactive() || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) {
        return;
      }
      const step = 90;
      const moves: Record<string, [number, number]> = {
        ArrowDown: [0, -step],
        ArrowLeft: [step, 0],
        ArrowRight: [-step, 0],
        ArrowUp: [0, step],
      };
      const move = moves[event.key];
      if (move) {
        event.preventDefault();
        fling = { vx: move[0] * FLING_DECAY, vy: move[1] * FLING_DECAY };
        schedule();
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomBy(1.6, { x: 0, y: 0 });
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomBy(1 / 1.6, { x: 0, y: 0 });
      }
    };
    sheet.addEventListener("pointerdown", onPointerDown);
    sheet.addEventListener("pointermove", onPointerMove);
    sheet.addEventListener("pointerup", onPointerUp);
    sheet.addEventListener("pointercancel", onPointerUp);
    sheet.addEventListener("wheel", onWheel, { passive: false });
    sheet.addEventListener("dblclick", onDoubleClick);
    sheet.addEventListener("touchstart", stopTouch, { passive: true });
    sheet.addEventListener("touchmove", stopTouch, { passive: true });
    sheet.addEventListener("touchend", stopTouch, { passive: true });
    sheet.addEventListener("gesturestart", onGestureStart);
    sheet.addEventListener("gesturechange", onGestureChange);
    sheet.addEventListener("gestureend", onGestureEnd);
    window.addEventListener("keydown", onKeyDown);

    const onTiles = () => {
      mapDirty = true;
      schedule();
    };
    tileListeners.add(onTiles);
    loadTiles(initial.content.tileBase).then(
      (loaded) => {
        if (disposed) {
          return;
        }
        tiles = loaded;
        setView(view);
      },
      () => {
        failed = true;
        mapDirty = true;
        schedule();
      }
    );

    let unsubscribeLamp: (() => void) | null = null;
    const setLamp = (on: boolean) => {
      isLampOn = on;
      unsubscribeLamp?.();
      unsubscribeLamp = null;
      if (on) {
        unsubscribeLamp = subscribeLamp((position) => {
          if (Math.hypot(position.x - lamp.x, position.y - lamp.y) > 0.5) {
            lamp.x = position.x;
            lamp.y = position.y;
            poseDirty = true;
            schedule();
          }
        });
      }
      poseDirty = true;
      schedule();
    };
    setLamp(isLampOn);

    // --- Bake the back, then show the booklet and start unfolding. ---
    const cover = new Image();
    cover.src = initial.content.cover;
    cover
      .decode()
      .catch(() => {
        // A cover that fails leaves its panel plain paper.
      })
      .then(() => {
        if (disposed) {
          return;
        }
        const backCanvas = makeCanvas(
          SHEET_WIDTH * resolution,
          SHEET_HEIGHT * resolution
        );
        const backContext = backCanvas.getContext("2d");
        if (backContext) {
          backContext.scale(resolution, resolution);
          drawSheetBack(backContext, cover.naturalWidth > 0 ? cover : null);
        }
        for (const [i, { back }] of panels.entries()) {
          if (back) {
            slice(
              back,
              backCanvas,
              FOLD_COLUMNS - 1 - PANELS[i].column,
              PANELS[i].row,
              backEdges[i]
            );
          }
        }
        paintFront();
        renderPose();
        ready = true;
        stage.style.visibility = "";
        callbacksRef.current.onReady();
        if (isOpen) {
          startMotion("open");
        }
      });

    controlsRef.current = {
      setLamp: (on) => {
        if (on !== isLampOn) {
          setLamp(on);
        }
      },
      setOpen: (next) => {
        if (next === isOpen) {
          return;
        }
        isOpen = next;
        pointers.clear();
        sheet.style.cursor = "";
        if (ready) {
          startMotion(next ? "open" : "close");
        } else if (!next) {
          callbacksRef.current.onClosed();
        }
      },
    };

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      unsubscribeLamp?.();
      tileListeners.delete(onTiles);
      controlsRef.current = null;
      sheet.removeEventListener("pointerdown", onPointerDown);
      sheet.removeEventListener("pointermove", onPointerMove);
      sheet.removeEventListener("pointerup", onPointerUp);
      sheet.removeEventListener("pointercancel", onPointerUp);
      sheet.removeEventListener("wheel", onWheel);
      sheet.removeEventListener("dblclick", onDoubleClick);
      sheet.removeEventListener("touchstart", stopTouch);
      sheet.removeEventListener("touchmove", stopTouch);
      sheet.removeEventListener("touchend", stopTouch);
      sheet.removeEventListener("gesturestart", onGestureStart);
      sheet.removeEventListener("gesturechange", onGestureChange);
      sheet.removeEventListener("gestureend", onGestureEnd);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [panelRefs]);

  useEffect(() => {
    controlsRef.current?.setOpen(open);
  }, [open]);
  useEffect(() => {
    controlsRef.current?.setLamp(lampOn);
  }, [lampOn]);

  return (
    <div
      className="pointer-events-none absolute inset-0"
      ref={stageRef}
      style={{
        perspective: `${FOLD_PARAMS.perspective}px`,
        perspectiveOrigin: "50% 50%",
        visibility: "hidden",
      }}
    >
      <div className="absolute top-1/2 left-1/2 h-0 w-0 [transform-style:preserve-3d]">
        <canvas aria-hidden className="absolute" ref={shadowRef} />
        <div
          aria-label="Tiny Toronto street map. Drag to explore; pinch, Command-scroll or double-click to zoom."
          className="no-drag pointer-events-auto absolute top-0 left-0 h-0 w-0 cursor-grab touch-none [transform-style:preserve-3d]"
          ref={sheetRef}
          role="application"
        >
          {PANELS.map(({ column, row }, i) => (
            <div
              className="absolute top-0 left-0 origin-top-left [transform-style:preserve-3d]"
              key={`${column}-${row}`}
              ref={panelRefs[i].panel}
              style={{ height: PANEL_HEIGHT, width: PANEL_WIDTH }}
            >
              {/*
               * Each face is its canvas alone, its shade a sibling over it.
               * A face holding both became one intermediate surface, which
               * Chrome rasterizes at a fraction of the screen's resolution
               * under a 3D transform: the map read soft while folding and
               * snapped sharp once it settled.
               */}
              <div className="absolute inset-0 [backface-visibility:hidden]">
                <canvas
                  className="absolute top-0 left-0"
                  ref={panelRefs[i].front}
                />
              </div>
              <div
                className="absolute inset-0 [backface-visibility:hidden]"
                ref={panelRefs[i].frontShade}
              />
              <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
                <canvas
                  className="absolute top-0 left-0"
                  ref={panelRefs[i].back}
                />
              </div>
              <div
                className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]"
                ref={panelRefs[i].backShade}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
