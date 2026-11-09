import { describe, expect, it } from "vitest";
import {
  CONTROLS_SPACE_PX,
  clampScroll,
  formatVersionDate,
  getSquirclePath,
  getTimelineCamera,
  getTimelineGeometry,
  getWindowAt,
  getWindowCamera,
  getWindowPadding,
  getWindowRect,
  isWindowInView,
  LABEL_SPACE_PX,
  toScreen,
} from "@/lib/time-machine";

const LAPTOP = { height: 900, width: 1440 };

const screenRect = (
  geometry: ReturnType<typeof getTimelineGeometry>,
  camera: ReturnType<typeof getTimelineCamera>,
  index: number
) => {
  const rect = getWindowRect(geometry, index);
  const origin = toScreen(LAPTOP, camera, rect);
  return {
    height: rect.height * camera.scale,
    width: rect.width * camera.scale,
    x: origin.x,
    y: origin.y,
  };
};

describe("time machine geometry", () => {
  it("keeps the padding between 20 and 40 px", () => {
    expect(getWindowPadding({ height: 300, width: 400 })).toBe(20);
    expect(getWindowPadding(LAPTOP)).toBe(40);
    expect(getWindowPadding({ height: 2160, width: 3840 })).toBe(40);
  });

  it("opens a window inset by the padding, with room for its controls below", () => {
    const geometry = getTimelineGeometry(LAPTOP, 3);
    const camera = getWindowCamera(geometry, 1);
    const open = screenRect(geometry, camera, 1);
    expect(open.x).toBeCloseTo(40);
    expect(open.y).toBeCloseTo(40);
    expect(LAPTOP.width - open.x - open.width).toBeCloseTo(40);
    expect(LAPTOP.height - open.y - open.height).toBeCloseTo(
      40 + CONTROLS_SPACE_PX
    );
    const before = screenRect(geometry, camera, 0);
    const after = screenRect(geometry, camera, 2);
    expect(before.x + before.width).toBeLessThan(0);
    expect(after.x).toBeGreaterThan(LAPTOP.width);
  });

  it("closed, the camera rests on the middle of the screen", () => {
    const geometry = getTimelineGeometry(LAPTOP, 2);
    expect(getWindowCamera(geometry, 0)).toEqual({ scale: 1, x: 720, y: 450 });
  });

  it("centers the present on the timeline with the past peeking in", () => {
    const geometry = getTimelineGeometry(LAPTOP, 2);
    const camera = getTimelineCamera(geometry, 0);
    const present = screenRect(geometry, camera, 0);
    const past = screenRect(geometry, camera, 1);
    expect(present.x + present.width / 2).toBeCloseTo(720);
    expect(present.width).toBeCloseTo(past.width);
    expect(present.height).toBeCloseTo(past.height);
    expect(past.x).toBeGreaterThan(present.x + present.width);
    expect(past.x).toBeLessThan(LAPTOP.width);
    expect(past.x + past.width).toBeGreaterThan(LAPTOP.width);
    expect(present.y + present.height + LABEL_SPACE_PX).toBeLessThan(
      LAPTOP.height
    );
    expect(present.width).toBeLessThanOrEqual(LAPTOP.width * 0.56 + 0.01);
  });

  it("tells windows wholly on screen from those cut by its edges", () => {
    const geometry = getTimelineGeometry(LAPTOP, 4);
    const camera = getTimelineCamera(geometry, 0);
    expect(isWindowInView(geometry, camera, 0)).toBe(true);
    expect(isWindowInView(geometry, camera, 1)).toBe(false);
    const scrolled = getTimelineCamera(geometry, geometry.step);
    expect(isWindowInView(geometry, scrolled, 0)).toBe(false);
    expect(isWindowInView(geometry, scrolled, 1)).toBe(true);
  });

  it("scrolls a past window to the middle", () => {
    const geometry = getTimelineGeometry(LAPTOP, 4);
    const camera = getTimelineCamera(geometry, geometry.step * 2);
    const third = screenRect(geometry, camera, 2);
    expect(third.x + third.width / 2).toBeCloseTo(720);
    expect(geometry.maxScroll).toBeCloseTo(geometry.step * 3);
  });

  it("clamps scroll to the row", () => {
    expect(clampScroll(-10, 100)).toBe(0);
    expect(clampScroll(110, 100)).toBe(100);
  });

  it("finds the window under the pointer", () => {
    const geometry = getTimelineGeometry(LAPTOP, 2);
    const camera = getTimelineCamera(geometry, 0);
    const past = screenRect(geometry, camera, 1);
    expect(getWindowAt(geometry, camera, { x: 720, y: 400 }, 2)).toBe(0);
    expect(
      getWindowAt(geometry, camera, { x: past.x + 10, y: past.y + 10 }, 2)
    ).toBe(1);
    // The gap between windows and the room around them are empty.
    expect(
      getWindowAt(geometry, camera, { x: past.x - 5, y: past.y + 10 }, 2)
    ).toBeNull();
    expect(getWindowAt(geometry, camera, { x: 720, y: 20 }, 2)).toBeNull();
  });

  it("draws squircle corners within the rectangle", () => {
    const path = getSquirclePath({ height: 100, width: 200, x: 0, y: 0 }, 40);
    expect(path.startsWith("M40 0 H160 C196.36 0 200 3.64 200 40")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    // A radius larger than the box is capped at half its short side.
    expect(
      getSquirclePath({ height: 20, width: 20, x: 0, y: 0 }, 99)
    ).toContain("M10 0");
  });

  it("labels versions by month", () => {
    expect(formatVersionDate("2025-01")).toBe("Jan 2025");
    expect(formatVersionDate("2026-06")).toBe("Jun 2026");
    expect(formatVersionDate("soon")).toBe("soon");
  });
});
