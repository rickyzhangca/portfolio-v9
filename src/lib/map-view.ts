/**
 * The view of a tiled map inside a printed frame: what part of the world the
 * frame shows, how the frame's px map to world px, and which tiles that needs.
 * World px are those of the map's finest level.
 */

export interface MapBounds {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface MapView {
  /** Frame px per world px. */
  scale: number;
  /** World px at the centre of the frame. */
  x: number;
  y: number;
}

export interface FrameSize {
  height: number;
  width: number;
}

export interface TilePyramid {
  /** The finest level; level l is 2^l px across. */
  levels: number;
  /** Tile size in px. */
  tile: number;
}

/** Closest the map zooms: half a frame px per world px. */
export const MAX_MAP_SCALE = 0.5;

/** Farthest the map zooms out: the whole drawn city inside the frame. */
export const getMinMapScale = (bounds: MapBounds, frame: FrameSize) =>
  Math.min(
    frame.width / (bounds.x1 - bounds.x0),
    frame.height / (bounds.y1 - bounds.y0)
  );

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Keeps the scale in range and the frame's centre over the drawn city. */
export const clampMapView = (
  view: MapView,
  bounds: MapBounds,
  frame: FrameSize
): MapView => {
  const scale = clamp(view.scale, getMinMapScale(bounds, frame), MAX_MAP_SCALE);
  return {
    scale,
    x: clamp(view.x, bounds.x0, bounds.x1),
    y: clamp(view.y, bounds.y0, bounds.y1),
  };
};

/** Moves the map by a drag of `dx`, `dy` frame px. */
export const panMapView = (view: MapView, dx: number, dy: number): MapView => ({
  ...view,
  x: view.x - dx / view.scale,
  y: view.y - dy / view.scale,
});

/**
 * Zooms by `factor` around `anchor`, in frame px from the frame's centre:
 * the world point under it stays put. The scale is clamped first, so a zoom
 * against its limit does not slide the map.
 */
export const zoomMapView = (
  view: MapView,
  factor: number,
  anchor: { x: number; y: number },
  bounds: MapBounds,
  frame: FrameSize
): MapView => {
  const scale = clamp(
    view.scale * factor,
    getMinMapScale(bounds, frame),
    MAX_MAP_SCALE
  );
  const worldX = view.x + anchor.x / view.scale;
  const worldY = view.y + anchor.y / view.scale;
  return clampMapView(
    {
      scale,
      x: worldX - anchor.x / scale,
      y: worldY - anchor.y / scale,
    },
    bounds,
    frame
  );
};

/**
 * The tile level to draw at `resolution` device px per frame px: the
 * coarsest whose tiles are at least as sharp as the screen. Never coarser:
 * the map is resampled again where the folded sheet is drawn, and tiles a
 * fifth too coarse on top of that read as blurry next to the live map.
 */
export const getTileLevel = (
  view: MapView,
  resolution: number,
  pyramid: TilePyramid
) => {
  const level = Math.ceil(
    pyramid.levels + Math.log2(view.scale * resolution) - 1e-6
  );
  return clamp(level, 0, pyramid.levels);
};

export interface TileRange {
  level: number;
  /** World px per tile at this level. */
  span: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Tiles of `level` that cover the frame, inclusive. */
export const getVisibleTiles = (
  view: MapView,
  frame: FrameSize,
  level: number,
  pyramid: TilePyramid
): TileRange => {
  const span = pyramid.tile * 2 ** (pyramid.levels - level);
  const halfWidth = frame.width / 2 / view.scale;
  const halfHeight = frame.height / 2 / view.scale;
  return {
    level,
    span,
    x0: Math.floor((view.x - halfWidth) / span),
    x1: Math.floor((view.x + halfWidth) / span),
    y0: Math.floor((view.y - halfHeight) / span),
    y1: Math.floor((view.y + halfHeight) / span),
  };
};

/** Where a world point lands in the frame, in frame px from its top left. */
export const worldToFrame = (
  view: MapView,
  frame: FrameSize,
  x: number,
  y: number
) => ({
  x: (x - view.x) * view.scale + frame.width / 2,
  y: (y - view.y) * view.scale + frame.height / 2,
});
