import {
  type FrameSize,
  getTileLevel,
  getVisibleTiles,
  type MapView,
} from "@/lib/map-view";
import type { TileIndex } from "./tile-index";

/**
 * Decoded tiles are 1 MB each (512 x 512 RGBA). A full frame at 3 device px
 * per frame px takes up to 84 tiles at a level never coarser than the
 * screen, plus the backdrop's: keep that with a little room to pan.
 */
const MAX_CACHED_TILES = 120;
const MAX_LOADS = 8;
/** The whole drawn city fits a handful of tiles here; kept as a backdrop. */
const BACKDROP_LEVEL = 13;

const keyOf = (level: number, x: number, y: number) => `${level}/${x}/${y}`;

/**
 * Draws a view of the tiled map into a 2D context: the sharpest tiles it has
 * for each spot, standing in coarser ones it already holds while the sharp
 * ones load. The tiles come from another origin without CORS, so the canvas
 * they are drawn into can be drawn on but never read.
 */
export class MapTiles {
  private readonly cache = new Map<string, HTMLImageElement>();
  private readonly loading = new Set<string>();
  private readonly onLoad: () => void;
  private readonly pinned = new Set<string>();
  private queue: { key: string; url: string }[] = [];
  /** Set once destroyed: loads still in flight are then dropped. */
  private readonly life: { destroyed: boolean } = { destroyed: false };
  readonly index: TileIndex;

  constructor(index: TileIndex, onLoad: () => void) {
    this.index = index;
    this.onLoad = onLoad;
    this.loadBackdrop();
  }

  destroy() {
    this.life.destroyed = true;
    this.queue = [];
    this.cache.clear();
  }

  private loadBackdrop() {
    const { bounds, levels, tile } = this.index.meta;
    if (!this.index.hasLevel(BACKDROP_LEVEL)) {
      return;
    }
    const span = tile * 2 ** (levels - BACKDROP_LEVEL);
    for (let y = Math.floor(bounds[1] / span); y <= bounds[3] / span; y += 1) {
      for (
        let x = Math.floor(bounds[0] / span);
        x <= bounds[2] / span;
        x += 1
      ) {
        if (this.index.has(BACKDROP_LEVEL, x, y)) {
          const key = keyOf(BACKDROP_LEVEL, x, y);
          this.pinned.add(key);
          this.queue.push({ key, url: this.index.url(BACKDROP_LEVEL, x, y) });
        }
      }
    }
    this.pump();
  }

  /** Whether every tile the view wants is drawn at its own level. */
  isComplete(view: MapView, frame: FrameSize, resolution: number) {
    const level = getTileLevel(view, resolution, this.index.meta);
    if (!this.index.hasLevel(level)) {
      return false;
    }
    const range = getVisibleTiles(view, frame, level, this.index.meta);
    for (let y = range.y0; y <= range.y1; y += 1) {
      for (let x = range.x0; x <= range.x1; x += 1) {
        if (
          this.index.has(level, x, y) &&
          !this.cache.has(keyOf(level, x, y))
        ) {
          return false;
        }
      }
    }
    return true;
  }

  /** Asks for the view's tiles ahead of drawing it. */
  prefetch(view: MapView, frame: FrameSize, resolution: number) {
    this.collect(view, frame, resolution, null);
    this.pump();
  }

  /**
   * Draws the view into `context`, whose current transform maps frame px
   * to its pixels; queues the tiles it is missing.
   */
  draw(
    context: CanvasRenderingContext2D,
    view: MapView,
    frame: FrameSize,
    resolution: number
  ) {
    this.collect(view, frame, resolution, context);
    this.pump();
  }

  private collect(
    view: MapView,
    frame: FrameSize,
    resolution: number,
    context: CanvasRenderingContext2D | null
  ) {
    const { meta } = this.index;
    const level = getTileLevel(view, resolution, meta);
    const levelReady = this.index.hasLevel(level);
    const range = getVisibleTiles(view, frame, level, meta);
    const centreX = (range.x0 + range.x1) / 2;
    const centreY = (range.y0 + range.y1) / 2;
    const wanted: { distance: number; key: string; url: string }[] = [];
    const left = view.x - frame.width / 2 / view.scale;
    const top = view.y - frame.height / 2 / view.scale;
    const size = range.span * view.scale;
    for (let y = range.y0; y <= range.y1; y += 1) {
      for (let x = range.x0; x <= range.x1; x += 1) {
        // Snapped to whole frame px at the screen's resolution, so
        // neighbouring tiles meet without a hairline between them.
        const dx =
          Math.round((x * range.span - left) * view.scale * resolution) /
          resolution;
        const dy =
          Math.round((y * range.span - top) * view.scale * resolution) /
          resolution;
        const dx1 =
          Math.round(((x + 1) * range.span - left) * view.scale * resolution) /
          resolution;
        const dy1 =
          Math.round(((y + 1) * range.span - top) * view.scale * resolution) /
          resolution;
        const key = keyOf(level, x, y);
        const image = this.touch(key);
        if (image) {
          context?.drawImage(image, dx, dy, dx1 - dx, dy1 - dy);
          continue;
        }
        if (levelReady && this.index.has(level, x, y)) {
          wanted.push({
            distance: Math.hypot(x - centreX, y - centreY),
            key,
            url: this.index.url(level, x, y),
          });
        } else if (levelReady) {
          // Nothing drawn here yet.
          continue;
        }
        if (context) {
          this.drawAncestor(context, level, x, y, dx, dy, dx1 - dx, dy1 - dy);
        }
      }
    }
    if (size <= 0) {
      return;
    }
    wanted.sort((a, b) => a.distance - b.distance);
    // The view's own tiles first; tiles it no longer shows are dropped.
    this.queue = [
      ...wanted.filter(({ key }) => !this.loading.has(key)),
      ...this.queue.filter(({ key }) => this.pinned.has(key)),
    ];
  }

  private drawAncestor(
    context: CanvasRenderingContext2D,
    level: number,
    x: number,
    y: number,
    dx: number,
    dy: number,
    width: number,
    height: number
  ) {
    const { tile } = this.index.meta;
    for (let up = 1; up <= level; up += 1) {
      const scale = 2 ** up;
      const ax = Math.floor(x / scale);
      const ay = Math.floor(y / scale);
      const image = this.cache.get(keyOf(level - up, ax, ay));
      if (image) {
        const part = tile / scale;
        const sx = (x - ax * scale) * part;
        const sy = (y - ay * scale) * part;
        context.drawImage(image, sx, sy, part, part, dx, dy, width, height);
        return;
      }
    }
  }

  private touch(key: string) {
    const image = this.cache.get(key);
    if (image) {
      // Most recently used last.
      this.cache.delete(key);
      this.cache.set(key, image);
    }
    return image;
  }

  private pump() {
    while (this.loading.size < MAX_LOADS && this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next || this.cache.has(next.key) || this.loading.has(next.key)) {
        continue;
      }
      this.load(next.key, next.url);
    }
  }

  private load(key: string, url: string) {
    this.loading.add(key);
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    image
      .decode()
      .then(
        () => {
          if (this.isDestroyed()) {
            return;
          }
          this.cache.set(key, image);
          this.evict();
          this.onLoad();
        },
        () => {
          // A tile that fails leaves its coarser stand-in.
        }
      )
      .finally(() => {
        this.loading.delete(key);
        if (!this.isDestroyed()) {
          this.pump();
        }
      });
  }

  private isDestroyed(): boolean {
    return this.life.destroyed;
  }

  private evict() {
    for (const key of this.cache.keys()) {
      if (this.cache.size <= MAX_CACHED_TILES) {
        return;
      }
      if (!this.pinned.has(key)) {
        this.cache.delete(key);
      }
    }
  }
}
