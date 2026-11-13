import { describe, expect, it } from "vitest";
import {
  CLOSED_POSE,
  FOLD_PARAMS,
  getClosePose,
  getCloseDuration,
  getFaceTint,
  getLightDirection,
  getOpenDuration,
  getOpenPose,
  getPanelPlacements,
  isPoseSettled,
  OPEN_POSE,
  PANEL_CORNERS,
  PANEL_HEIGHT,
  PANEL_WIDTH,
  type PanelPlacement,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  transformPoint,
} from "./map-fold";

const bounds = (placements: PanelPlacement[]) => {
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const { matrix } of placements) {
    for (const corner of PANEL_CORNERS) {
      const [x, y] = transformPoint(matrix, corner);
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  return {
    height: y1 - y0,
    width: x1 - x0,
    x: (x0 + x1) / 2,
    y: (y0 + y1) / 2,
  };
};

const ALPHA = /,([\d.]+)\)$/u;
const DARK = /^rgba\(18,14,10/u;
const LIGHT = /^rgba\(246/u;

describe("map fold timeline", () => {
  it("starts opening from the booklet and ends held open", () => {
    expect(getOpenPose(0)).toEqual(CLOSED_POSE);
    expect(isPoseSettled(getOpenPose(getOpenDuration() + 0.6), OPEN_POSE)).toBe(
      true
    );
  });

  it("closes from the open sheet back onto the desk", () => {
    expect(getClosePose(0)).toEqual(OPEN_POSE);
    expect(isPoseSettled(getClosePose(getCloseDuration()), CLOSED_POSE)).toBe(
      true
    );
  });

  it("continues from wherever an interrupted motion left the sheet", () => {
    const halfOpen = getOpenPose(0.6);
    expect(getClosePose(0, halfOpen)).toEqual(halfOpen);
    const halfClosed = getClosePose(0.5);
    expect(getOpenPose(0, halfClosed)).toEqual(halfClosed);
    // Already mostly open, it does not wait for the creases' first pull.
    const resumed = getOpenPose(0.1, getOpenPose(1));
    expect(resumed.creases[0]).toBeGreaterThan(getOpenPose(1).creases[0]);
  });
});

describe("map fold geometry", () => {
  it("stacks every panel into one booklet-sized footprint when folded", () => {
    const box = bounds(getPanelPlacements(CLOSED_POSE, 1.4));
    const tilt = Math.abs((FOLD_PARAMS.restTilt * Math.PI) / 180);
    const width = PANEL_WIDTH * Math.cos(tilt) + PANEL_HEIGHT * Math.sin(tilt);
    const height = PANEL_HEIGHT * Math.cos(tilt) + PANEL_WIDTH * Math.sin(tilt);
    expect(box.width).toBeCloseTo(width, 0);
    expect(box.height).toBeCloseTo(height, 0);
    expect(box.x).toBeCloseTo(0, 3);
    expect(box.y).toBeCloseTo(0, 3);
  });

  it("lays the open sheet out at its focused size, centred", () => {
    const scale = 1.4;
    const box = bounds(getPanelPlacements(OPEN_POSE, scale));
    const residual = (FOLD_PARAMS.residual * Math.PI) / 180;
    expect(box.width).toBeGreaterThan(
      SHEET_WIDTH * scale * Math.cos(residual) - 2
    );
    expect(box.width).toBeLessThanOrEqual(SHEET_WIDTH * scale + 0.01);
    expect(box.height).toBeCloseTo(SHEET_HEIGHT * scale, 0);
    expect(box.x).toBeCloseTo(0, 3);
    expect(box.y).toBeCloseTo(0, 3);
  });

  it("stands the open sheet upright when turned, and only once open", () => {
    const open = bounds(getPanelPlacements(OPEN_POSE, 1, 90));
    expect(open.height).toBeGreaterThan(SHEET_WIDTH - 2);
    expect(open.width).toBeCloseTo(SHEET_HEIGHT, 0);
    // The first column's top-left corner ends top right.
    const [first] = getPanelPlacements(OPEN_POSE, 1, 90);
    const [x, y] = transformPoint(first.matrix, [0, 0, 0]);
    expect(x).toBeGreaterThan(0);
    expect(y).toBeLessThan(0);
    // The booklet on the desk is not turned.
    expect(getPanelPlacements(CLOSED_POSE, 1, 90)).toEqual(
      getPanelPlacements(CLOSED_POSE, 1)
    );
  });

  it("lays the rows in one plane once the cross fold is all but flat", () => {
    const flat = getPanelPlacements(OPEN_POSE, 1.4);
    expect(getPanelPlacements({ ...OPEN_POSE, cross: 1.003 }, 1.4)).toEqual(
      flat
    );
    expect(getPanelPlacements({ ...OPEN_POSE, cross: 0.9 }, 1.4)).not.toEqual(
      flat
    );
  });

  it("keeps the folded panels in reading order", () => {
    const placements = getPanelPlacements(OPEN_POSE, 1);
    const first = transformPoint(placements[0].matrix, [0, 0, 0]);
    const last = transformPoint(placements.at(-1)?.matrix ?? [], [
      PANEL_WIDTH,
      PANEL_HEIGHT,
      0,
    ]);
    expect(first[0]).toBeLessThan(last[0]);
    expect(first[1]).toBeLessThan(last[1]);
  });
});

describe("map fold light", () => {
  it("barely tints flat paper and darkens a face turned away", () => {
    const light = getLightDirection([0, 0, 0], [500, 0, 600]);
    const flat = getFaceTint([0, 0, 1], light, true);
    expect(Number(flat.match(ALPHA)?.[1])).toBeLessThan(0.02);
    expect(getFaceTint([-0.8, 0, 0.6], light, true)).toMatch(DARK);
    // Facing the lamp, it catches more light than the flat paper.
    expect(getFaceTint([0.6, 0, 0.8], light, true)).toMatch(LIGHT);
  });
});
