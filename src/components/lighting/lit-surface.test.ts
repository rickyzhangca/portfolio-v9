import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LampPosition } from "./desk-lamp";

const lamp = vi.hoisted(() => ({
  listeners: new Set<(position: LampPosition, time: number) => void>(),
}));

// The lamp's frames are stepped by hand.
vi.mock("./desk-lamp", () => ({
  getFrameTransformCache: () => new Map(),
  getLampConfig: () => ({ heightPx: 240 }),
  subscribeLamp: (listener: (position: LampPosition, time: number) => void) => {
    lamp.listeners.add(listener);
    return () => lamp.listeners.delete(listener);
  },
}));

type LitSurfaceModule = typeof import("./lit-surface");
let litSurface: LitSurfaceModule;

/** A 100 px square whose top-left corner sits at (left, top) on screen. */
const createElement = (left = 0, top = 0) => {
  const element = document.createElement("div");
  Object.defineProperty(element, "offsetWidth", { value: 100 });
  Object.defineProperty(element, "offsetHeight", { value: 100 });
  element.getBoundingClientRect = () =>
    DOMRect.fromRect({ height: 100, width: 100, x: left, y: top });
  document.body.append(element);
  return element;
};

const startSurface = ({
  canvases,
  left = 0,
  motionScale,
  prominence,
  step,
  top = 0,
}: {
  canvases?: number;
  left?: number;
  motionScale?: number;
  prominence?: () => number;
  step?: () => readonly number[];
  top?: number;
} = {}) => {
  const draw = vi.fn();
  const stop = litSurface.runLitSurface({
    attach: () => Promise.resolve({ destroy: vi.fn() }),
    canvases,
    draw,
    element: createElement(left, top),
    label: "Test surface",
    motionScale,
    onReady: vi.fn(),
    prominence,
    step,
  });
  return { draw, stop };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

// Fade-ins and queue order read this clock; frames set it.
let clock = 0;

const frame = async (position: LampPosition, time: number) => {
  clock = time;
  for (const listener of lamp.listeners) {
    listener(position, time);
  }
  await settle();
};

// Frames this far apart are pauses, which leave the draw budget alone.
const PAUSE_MS = 1000;

describe("runLitSurface", () => {
  beforeEach(async () => {
    // The draw budget is module state; every test starts from a fresh one.
    vi.resetModules();
    litSurface = await import("./lit-surface");
    clock = 0;
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    // Each 100 px surface fills 500 x 500 backing pixels, so the starting
    // budget of a million pixels draws four of them a frame.
    vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    lamp.listeners.clear();
    document.body.replaceChildren();
  });

  it("draws surfaces animating their own parts before relit ones", async () => {
    const relit = Array.from({ length: 5 }, () => startSurface());
    let travel = 0;
    const lifting = startSurface({
      step: () => {
        travel += 1;
        return [travel];
      },
    });
    await settle();

    await frame({ x: 10, y: 10 }, PAUSE_MS);

    // Two first draws a frame (their canvases are allocated, so each counts
    // double): the lifting surface is among them, though it queued last.
    expect(lifting.draw).toHaveBeenCalledTimes(1);
    const drawn = relit.filter(({ draw }) => draw.mock.calls.length > 0);
    expect(drawn).toHaveLength(1);
  });

  it("relights the surface under the lamp before ones across the desk", async () => {
    const across = Array.from({ length: 4 }, (_, index) =>
      startSurface({ left: 400, top: index * 120 })
    );
    const under = startSurface({ left: 0, top: 0 });
    await settle();
    // Everything gets its first frame while the lamp rests.
    for (let index = 1; index <= 5; index += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: each frame drains the queue the previous one left
      await frame({ x: 50, y: 50 }, index * PAUSE_MS);
    }
    for (const surface of [...across, under]) {
      expect(surface.draw).toHaveBeenCalledTimes(1);
    }

    await frame({ x: 70, y: 50 }, 6 * PAUSE_MS);

    // Five surfaces want a redraw and four fit; the one under the lamp,
    // which queued last, is not the one left waiting.
    expect(under.draw).toHaveBeenCalledTimes(2);
    expect(
      across.filter(({ draw }) => draw.mock.calls.length === 2)
    ).toHaveLength(3);
  });

  it("skips lamp steps too small to show from where a surface lies", async () => {
    const under = startSurface({ left: 0, top: 0 });
    const far = startSurface({ left: 900, top: 0 });
    await settle();
    await frame({ x: 50, y: 50 }, PAUSE_MS);

    await frame({ x: 60, y: 50 }, 2 * PAUSE_MS);

    expect(under.draw).toHaveBeenCalledTimes(2);
    expect(far.draw).toHaveBeenCalledTimes(1);
  });

  it("draws more per frame while frames arrive on time, fewer after a late one", async () => {
    const surfaces = Array.from({ length: 12 }, () => startSurface());
    await settle();
    const drawsDuring = async (lampX: number, at: number) => {
      const before = surfaces.reduce(
        (sum, { draw }) => sum + draw.mock.calls.length,
        0
      );
      await frame({ x: lampX, y: 50 }, at);
      return (
        surfaces.reduce((sum, { draw }) => sum + draw.mock.calls.length, 0) -
        before
      );
    };

    let time = PAUSE_MS;
    let x = 50;
    expect(await drawsDuring(x, time)).toBe(2);
    // The lamp swings between two points over the surfaces.
    const swing = () => (x === 50 ? 70 : 50);
    for (let index = 0; index < 80; index += 1) {
      time += 16;
      x = swing();
      // biome-ignore lint/performance/noAwaitInLoops: frames arrive one after another
      await drawsDuring(x, time);
    }
    time += 16;
    x = swing();
    expect(await drawsDuring(x, time)).toBe(12);

    // A dropped frame halves the budget.
    time += 48;
    x = swing();
    expect(await drawsDuring(x, time)).toBeLessThan(12);
  });

  it("keeps the budget while the lamp rests, so a sweep does not redraw everything at once", async () => {
    const surfaces = Array.from({ length: 12 }, () => startSurface());
    await settle();
    let time = PAUSE_MS;
    // Every surface gets its first frame, then the lamp rests on time.
    for (let index = 0; index < 43; index += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: frames arrive one after another
      await frame({ x: 50, y: 50 }, time);
      time += 16;
    }
    const before = surfaces.reduce(
      (sum, { draw }) => sum + draw.mock.calls.length,
      0
    );

    await frame({ x: 400, y: 50 }, time);

    const drawn =
      surfaces.reduce((sum, { draw }) => sum + draw.mock.calls.length, 0) -
      before;
    expect(drawn).toBe(4);
  });

  it("counts a surface by the pixels it fills, not as one turn", async () => {
    const covers = Array.from({ length: 3 }, () =>
      startSurface({ canvases: 2 })
    );
    await settle();
    for (let index = 1; index <= 3; index += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: each frame drains the queue the previous one left
      await frame({ x: 50, y: 50 }, index * PAUSE_MS);
    }
    const drawnBefore = covers.map(({ draw }) => draw.mock.calls.length);

    await frame({ x: 70, y: 50 }, 4 * PAUSE_MS);

    // Two canvases each: two covers fill the budget four sheets would.
    expect(
      covers.filter(
        ({ draw }, index) => draw.mock.calls.length > (drawnBefore[index] ?? 0)
      )
    ).toHaveLength(2);
  });

  it("counts a first draw double, as its canvas is allocated too", async () => {
    const sheets = Array.from({ length: 4 }, () => startSurface());
    await settle();
    const count = () =>
      sheets.reduce((sum, { draw }) => sum + draw.mock.calls.length, 0);

    await frame({ x: 50, y: 50 }, PAUSE_MS);
    expect(count()).toBe(2);
    await frame({ x: 50, y: 50 }, 2 * PAUSE_MS);
    expect(count()).toBe(4);

    // Redrawn, all four fit.
    await frame({ x: 70, y: 50 }, 3 * PAUSE_MS);
    expect(count()).toBe(8);
  });

  it("draws the stalest surface even when it alone exceeds the budget", async () => {
    const huge = startSurface({ canvases: 8 });
    await settle();

    await frame({ x: 50, y: 50 }, PAUSE_MS);

    expect(huge.draw).toHaveBeenCalledTimes(1);
  });

  it("leaves less of the budget after pixels drawn outside the queue", async () => {
    const surfaces = Array.from({ length: 6 }, () => startSurface());
    await settle();
    for (let index = 1; index <= 3; index += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: each frame drains the queue the previous one left
      await frame({ x: 50, y: 50 }, index * PAUSE_MS);
    }
    const before = surfaces.reduce(
      (sum, { draw }) => sum + draw.mock.calls.length,
      0
    );
    litSurface.chargeLitPixels(500_000);

    await frame({ x: 70, y: 50 }, 4 * PAUSE_MS);

    const after = surfaces.reduce(
      (sum, { draw }) => sum + draw.mock.calls.length,
      0
    );
    expect(after - before).toBe(2);
  });

  it("grows slowly back toward the budget a frame ran late at", async () => {
    const surfaces = Array.from({ length: 40 }, () => startSurface());
    await settle();
    const drawsDuring = async (lampX: number, at: number) => {
      const before = surfaces.reduce(
        (sum, { draw }) => sum + draw.mock.calls.length,
        0
      );
      await frame({ x: lampX, y: 50 }, at);
      return (
        surfaces.reduce((sum, { draw }) => sum + draw.mock.calls.length, 0) -
        before
      );
    };
    let time = PAUSE_MS;
    let x = 50;
    const run = async (frames: number) => {
      let last = 0;
      for (let index = 0; index < frames; index += 1) {
        time += 16;
        x = x === 50 ? 70 : 50;
        // biome-ignore lint/performance/noAwaitInLoops: frames arrive one after another
        last = await drawsDuring(x, time);
      }
      return last;
    };
    await drawsDuring(x, time);
    const before = await run(60);
    // A late frame at that budget, then as many on-time frames as it took
    // to get there: the budget climbs back to most of it, not past it.
    time += 48;
    x += 20;
    x = x === 50 ? 70 : 50;
    await drawsDuring(x, time);
    const after = await run(60);

    expect(before).toBeGreaterThan(8);
    expect(after).toBeGreaterThan(before / 2);
    expect(after).toBeLessThan(before);
  });
});

describe("motion resolution", () => {
  beforeEach(async () => {
    vi.resetModules();
    litSurface = await import("./lit-surface");
    clock = 0;
    vi.spyOn(performance, "now").mockImplementation(() => clock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    lamp.listeners.clear();
    document.body.replaceChildren();
  });

  const lastScale = (draw: ReturnType<typeof vi.fn>) =>
    (draw.mock.calls.at(-1)?.[1] as { pixelScale: number } | undefined)
      ?.pixelScale;

  // The lamp rests, sweeps right 20 px a frame, then rests again.
  const sweep = async (surfaces: { draw: ReturnType<typeof vi.fn> }[]) => {
    let time = PAUSE_MS;
    await frame({ x: 50, y: 50 }, time);
    const resting = surfaces.map(({ draw }) => lastScale(draw));
    let x = 50;
    for (let index = 0; index < 6; index += 1) {
      time += 16;
      x += 20;
      // biome-ignore lint/performance/noAwaitInLoops: frames arrive one after another
      await frame({ x, y: 50 }, time);
    }
    const moving = surfaces.map(({ draw }) => lastScale(draw));
    for (let index = 0; index < 15; index += 1) {
      time += 16;
      // biome-ignore lint/performance/noAwaitInLoops: frames arrive one after another
      await frame({ x, y: 50 }, time);
    }
    const settled = surfaces.map(({ draw }) => lastScale(draw));
    return { moving, resting, settled };
  };

  it("draws soft surfaces at half resolution while the lamp sweeps, then restores it", async () => {
    vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2);
    const soft = startSurface({ motionScale: 0.5 });
    const sharp = startSurface();
    await settle();

    const { moving, resting, settled } = await sweep([soft, sharp]);

    expect(resting).toEqual([2, 2]);
    expect(moving).toEqual([1, 2]);
    expect(settled).toEqual([2, 2]);
  });

  it("keeps a hidden surface's last frame while the lamp sweeps, and relights it once it shows", async () => {
    vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2);
    let shown = 0;
    const tucked = startSurface({ motionScale: 0.5, prominence: () => shown });
    await settle();

    const { moving, resting, settled } = await sweep([tucked]);

    // Drawn once, at full resolution, and left alone through the sweep.
    expect(tucked.draw).toHaveBeenCalledTimes(1);
    expect([resting, moving, settled]).toEqual([[2], [2], [2]]);

    shown = 1;
    await frame({ x: 170, y: 50 }, PAUSE_MS * 10);
    expect(tucked.draw).toHaveBeenCalledTimes(2);
  });

  it("never draws below one backing pixel per CSS pixel", async () => {
    vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(1);
    const soft = startSurface({ motionScale: 0.5 });
    await settle();

    const { moving } = await sweep([soft]);

    expect(moving).toEqual([1]);
  });
});

describe("lightStaleness", () => {
  beforeEach(async () => {
    litSurface = await import("./lit-surface");
  });

  const view = (x: number) => ({
    height: 100,
    intensity: 1,
    light: { x, y: 50, z: 240 },
    pixelScale: 2,
    width: 100,
  });

  it("counts lamp travel in full over the surface", () => {
    expect(litSurface.lightStaleness({ x: 40, y: 50, z: 240 }, view(50))).toBe(
      10
    );
  });

  it("discounts the same travel across the desk", () => {
    const staleness = litSurface.lightStaleness(
      { x: 830, y: 50, z: 240 },
      view(840)
    );
    expect(staleness).toBeGreaterThan(0);
    expect(staleness).toBeLessThan(1);
  });
});
