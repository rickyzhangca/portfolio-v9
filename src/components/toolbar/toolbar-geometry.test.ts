import { describe, expect, it } from "vitest";
import {
  canvasPads,
  clampPanelToViewport,
  type ToolbarViewport,
  toolbarGeometry,
  VIEWPORT_PAD_PX,
} from "./toolbar-geometry";
import { pickNearest } from "./use-fluid-hover";

// A vertical bar in the bottom-right corner of a 1024x768 screen.
const corner: ToolbarViewport = {
  viewW: 1024,
  viewH: 768,
  listLeft: 971,
  listTop: 620,
  listW: 42,
  listH: 136,
};

const trigger = { left: 1, top: 1, width: 40, height: 40 };

describe("toolbar geometry", () => {
  it("opens the panel beside its trigger, shifted up to stay on screen", () => {
    const { blobStyle } = toolbarGeometry({
      open: true,
      side: "left",
      armed: true,
      trigger,
      panel: { w: 240, h: 480 },
      viewport: corner,
    });
    const { padLeft, padTop } = canvasPads("left", corner);
    const left = Number(blobStyle.left) - padLeft;
    const top = Number(blobStyle.top) - padTop;

    expect(left + 240).toBe(trigger.left - 10);
    // Bottom edge sits VIEWPORT_PAD_PX above the screen bottom.
    expect(corner.listTop + top + 480).toBe(corner.viewH - VIEWPORT_PAD_PX);
  });

  it("collapses onto the trigger as a pill when closed", () => {
    const { blobStyle } = toolbarGeometry({
      open: false,
      side: "left",
      armed: false,
      trigger,
      panel: { w: 240, h: 480 },
      viewport: corner,
    });

    expect(blobStyle.width).toBe(40);
    expect(blobStyle.height).toBe(40);
    expect(blobStyle.borderRadius).toBe(20);
    expect(blobStyle.transition).toBe("none");
  });

  it("scrolls a panel taller than the screen", () => {
    const short = { ...corner, viewH: 400, listTop: 252 };
    const geometry = toolbarGeometry({
      open: true,
      side: "left",
      armed: true,
      trigger,
      panel: { w: 240, h: 480 },
      viewport: short,
    });

    expect(geometry.blobStyle.height).toBe(400 - VIEWPORT_PAD_PX * 2);
    expect(geometry.scrollY).toBe(true);
  });

  it("caps the goo canvas instead of spanning the whole screen", () => {
    const wide = { ...corner, viewW: 3840, listLeft: 3787 };
    const pads = canvasPads("left", wide);

    expect(pads.padLeft).toBe(canvasPads("left", corner).padLeft);
    expect(pads.padLeft).toBeLessThan(400);
  });

  it("keeps a clamped box inside the padded viewport", () => {
    const placed = clampPanelToViewport(
      { left: -2000, top: 500 },
      { w: 240, h: 300 },
      corner
    );

    expect(corner.listLeft + placed.left).toBe(VIEWPORT_PAD_PX);
    expect(corner.listTop + placed.top + placed.h).toBe(
      corner.viewH - VIEWPORT_PAD_PX
    );
  });
});

describe("pickNearest", () => {
  const rects = [
    { left: 0, top: 0, width: 40, height: 40 },
    { left: 0, top: 52, width: 40, height: 40 },
  ];
  const container = { start: 100, scale: 1, offset: 0 };

  it("picks the item under the pointer", () => {
    expect(pickNearest("y", 160, rects, container)).toBe(1);
  });

  it("picks the nearest item from a gap", () => {
    expect(pickNearest("y", 143, rects, container)).toBe(0);
    expect(pickNearest("y", 148, rects, container)).toBe(1);
  });
});
