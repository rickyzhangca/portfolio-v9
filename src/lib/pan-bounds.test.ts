import { describe, expect, it } from "vitest";
import { DEFAULT_FAN_CONFIG } from "@/lib/fan";
import {
  createMockCard,
  createMockCover,
  createMockFunStack,
  createMockSingle,
  createMockStack,
  createMockSwagStack,
} from "@/test-utils/test-helpers";
import type { CanvasItem } from "@/types/canvas";
import { getCanvasLayout } from "./canvas-layout";
import { clampToRange, getCompactPanBounds, getPanRange } from "./pan-bounds";

describe("getPanRange", () => {
  it("lets tall content scroll from its start margin to its end margin", () => {
    // Content 100..2100 on an 800px screen at scale 1.
    expect(
      getPanRange(
        { max: 2100, min: 100 },
        800,
        1,
        { end: 16, start: 16 },
        "start"
      )
    ).toEqual({ max: 16 - 100, min: 800 - 16 - 2100 });
  });

  it("pins content that is shorter than the screen to where it is revealed", () => {
    expect(
      getPanRange(
        { max: 300, min: 100 },
        800,
        1,
        { end: 16, start: 16 },
        "start"
      )
    ).toEqual({ max: -84, min: -84 });
    expect(
      getPanRange(
        { max: 300, min: 100 },
        800,
        1,
        { end: 16, start: 16 },
        "center"
      )
    ).toEqual({ max: 200, min: 200 });
  });

  it("scales the content with the camera", () => {
    const range = getPanRange(
      { max: 1000, min: 0 },
      500,
      2,
      { end: 0, start: 0 },
      "start"
    );
    expect(range).toEqual({ max: 0, min: 500 - 2000 });
  });

  it("clamps to either end", () => {
    const range = { max: 0, min: -500 };
    expect(clampToRange(40, range)).toBe(0);
    expect(clampToRange(-900, range)).toBe(-500);
    expect(clampToRange(-120, range)).toBe(-120);
  });
});

describe("getCompactPanBounds", () => {
  const layout = getCanvasLayout(390);
  const viewport = { height: 664, scale: 1, width: 390 };
  const base = {
    expandedStackId: null,
    fanConfig: DEFAULT_FAN_CONFIG,
    focusedItemId: null,
    funContentHeights: {},
    getFocusScale: () => 2,
    layout,
    stackPages: {},
    viewport,
  };
  const toMap = (...items: CanvasItem[]) =>
    new Map(items.map((item) => [item.id, item]));

  it("keeps free panning on the desktop layout", () => {
    expect(
      getCompactPanBounds({
        ...base,
        items: toMap(createMockStack("s", 0, 0)),
        layout: getCanvasLayout(1440),
      })
    ).toBeNull();
  });

  it("limits the resting scene to its top and last card", () => {
    const tall = createMockStack(
      "s",
      0,
      2000,
      1,
      createMockCover("c", 240, 340)
    );
    const bounds = getCompactPanBounds({ ...base, items: toMap(tall) });
    expect(bounds?.x).toBeUndefined();
    expect(bounds?.y?.max).toBe(0);
    // 2340 is the last card's bottom, plus the end margin.
    expect(bounds?.y?.min).toBe(664 - 48 - 2340);
  });

  it("limits an opened folder to its cards", () => {
    const folder = createMockStack(
      "s",
      80,
      1000,
      1,
      createMockCover("c", 240, 340),
      Array.from({ length: 6 }, (_, index) =>
        createMockCard(`a${index}`, 350, 400)
      )
    );
    const bounds = getCompactPanBounds({
      ...base,
      expandedStackId: "s",
      items: toMap(folder),
    });
    // The first card sits a few pixels below the folder's top on the fan arc.
    expect(bounds?.y?.max).toBeGreaterThan(16 - 1010);
    expect(bounds?.y?.max).toBeLessThanOrEqual(16 - 1000);
    expect(bounds?.y?.min).toBeLessThan(bounds?.y?.max ?? 0);
  });

  it("scrolls an opened folder's last card clear of the Close button", () => {
    const fun = createMockFunStack("f", 16, 500);
    const bounds = getCompactPanBounds({
      ...base,
      expandedStackId: "f",
      funContentHeights: { f: 3000 },
      items: toMap(fun),
    });
    // 88px: the pill's 16px offset, its height and some air.
    expect(bounds?.y?.min).toBe(664 - 88 - (500 + 3000));
  });

  it("follows the measured height of the fun project list", () => {
    const fun = createMockFunStack("f", 16, 500);
    const estimated = getCompactPanBounds({
      ...base,
      expandedStackId: "f",
      items: toMap(fun),
    });
    const measured = getCompactPanBounds({
      ...base,
      expandedStackId: "f",
      funContentHeights: { f: 3000 },
      items: toMap(fun),
    });
    expect(measured?.y?.min).toBe(664 - 88 - (500 + 3000));
    expect(measured?.y?.min).toBeLessThan(estimated?.y?.min ?? 0);
  });

  it("limits an opened swag grid", () => {
    const swag = createMockSwagStack("w", 125, 800);
    swag.swags = Array.from({ length: 12 }, (_, index) => ({
      label: `${index}`,
      src: `/${index}.webp`,
    }));
    const bounds = getCompactPanBounds({
      ...base,
      expandedStackId: "w",
      items: toMap(swag),
    });
    expect(bounds?.y?.max).toBeLessThanOrEqual(16 - 800 + 2);
    expect(bounds?.y?.min).toBeLessThan(bounds?.y?.max ?? 0);
  });

  it("confines the enlarged laptop to its own body on both axes", () => {
    const laptop = createMockSingle("m", 29, 3500, 1, {
      content: { stickers: [] },
      id: "m-card",
      kind: "macbook",
      size: { height: 300, width: 345 },
    });
    const bounds = getCompactPanBounds({
      ...base,
      focusedItemId: "m",
      items: toMap(laptop),
    });
    const centerX = 29 + 345 / 2;
    // Wider than the screen: free between its two enlarged edges.
    expect(bounds?.x?.max).toBe(16 - (centerX - 345));
    expect(bounds?.x?.min).toBe(390 - 16 - (centerX + 345));
    expect(bounds?.x?.min).toBeLessThan(bounds?.x?.max ?? 0);
    // Shorter than the screen: held at its centered position.
    expect(bounds?.y?.min).toBe(bounds?.y?.max);
    expect(bounds?.y?.max).toBe(664 / 2 - (3500 + 150));
  });
});
