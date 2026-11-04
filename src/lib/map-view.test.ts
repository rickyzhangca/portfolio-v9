import { describe, expect, it } from "vitest";
import {
  clampMapView,
  getMinMapScale,
  getTileLevel,
  getVisibleTiles,
  MAX_MAP_SCALE,
  panMapView,
  worldToFrame,
  zoomMapView,
} from "./map-view";

const bounds = { x0: 1000, x1: 9000, y0: 2000, y1: 6000 };
const frame = { height: 200, width: 400 };
const pyramid = { levels: 19, tile: 512 };

describe("map view", () => {
  it("fits the whole drawn area at its farthest zoom", () => {
    expect(getMinMapScale(bounds, frame)).toBeCloseTo(0.05);
    const view = clampMapView({ scale: 0.001, x: 0, y: 99_999 }, bounds, frame);
    expect(view).toEqual({ scale: 0.05, x: 1000, y: 6000 });
    expect(
      clampMapView({ scale: 9, x: 5000, y: 4000 }, bounds, frame).scale
    ).toBe(MAX_MAP_SCALE);
  });

  it("drags the map with the pointer", () => {
    const view = panMapView({ scale: 0.25, x: 5000, y: 4000 }, 10, -20);
    expect(view).toEqual({ scale: 0.25, x: 4960, y: 4080 });
  });

  it("zooms around the anchor, keeping its world point under it", () => {
    const view = { scale: 0.1, x: 5000, y: 4000 };
    const anchor = { x: 100, y: -50 };
    const zoomed = zoomMapView(view, 2, anchor, bounds, frame);
    expect(zoomed.scale).toBeCloseTo(0.2);
    const before = worldToFrame(view, frame, 6000, 3500);
    const after = worldToFrame(zoomed, frame, 6000, 3500);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("does not slide the map when a zoom meets its limit", () => {
    const view = { scale: MAX_MAP_SCALE, x: 5000, y: 4000 };
    expect(zoomMapView(view, 2, { x: 100, y: 0 }, bounds, frame)).toEqual(view);
  });

  it("picks tiles about as sharp as the screen", () => {
    // 0.25 frame px per world px at 2 device px: half a device px per world px.
    expect(getTileLevel({ scale: 0.25, x: 0, y: 0 }, 2, pyramid)).toBe(18);
    expect(getTileLevel({ scale: 4, x: 0, y: 0 }, 2, pyramid)).toBe(19);
    expect(getTileLevel({ scale: 1e-9, x: 0, y: 0 }, 2, pyramid)).toBe(0);
  });

  it("lists the tiles under the frame", () => {
    const range = getVisibleTiles(
      { scale: 0.25, x: 5000, y: 4000 },
      frame,
      18,
      pyramid
    );
    expect(range.span).toBe(1024);
    expect(range).toMatchObject({ x0: 4, x1: 5, y0: 3, y1: 4 });
  });
});
