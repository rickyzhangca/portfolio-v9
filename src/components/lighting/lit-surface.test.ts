import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LampPosition } from "./desk-lamp";

const lamp = vi.hoisted(() => ({
  listeners: new Set<(position: LampPosition, time: number) => void>(),
}));

// The lamp's frames are stepped by hand.
vi.mock("./desk-lamp", () => ({
  getFrameTransformCache: () => new Map(),
  LAMP_HEIGHT: 240,
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
  left = 0,
  step,
  top = 0,
}: {
  left?: number;
  step?: () => readonly number[];
  top?: number;
} = {}) => {
  const draw = vi.fn();
  const stop = litSurface.runLitSurface({
    attach: () => Promise.resolve({ destroy: vi.fn() }),
    draw,
    element: createElement(left, top),
    label: "Test surface",
    onReady: vi.fn(),
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

    // Four draws a frame: the lifting surface is among them, though it
    // queued last.
    expect(lifting.draw).toHaveBeenCalledTimes(1);
    const drawn = relit.filter(({ draw }) => draw.mock.calls.length > 0);
    expect(drawn).toHaveLength(3);
  });

  it("relights the surface under the lamp before ones across the desk", async () => {
    const across = Array.from({ length: 4 }, (_, index) =>
      startSurface({ left: 400, top: index * 120 })
    );
    const under = startSurface({ left: 0, top: 0 });
    await settle();
    // Everything gets its first frame while the lamp rests.
    for (let index = 1; index <= 3; index += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: each frame drains the queue the previous one left
      await frame({ x: 50, y: 50 }, index * PAUSE_MS);
    }
    for (const surface of [...across, under]) {
      expect(surface.draw).toHaveBeenCalledTimes(1);
    }

    await frame({ x: 70, y: 50 }, 4 * PAUSE_MS);

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
    expect(await drawsDuring(x, time)).toBe(4);
    for (let index = 0; index < 40; index += 1) {
      time += 16;
      x += 20;
      // biome-ignore lint/performance/noAwaitInLoops: frames arrive one after another
      await drawsDuring(x, time);
    }
    time += 16;
    x += 20;
    expect(await drawsDuring(x, time)).toBe(12);

    // A dropped frame halves the budget.
    time += 48;
    x += 20;
    expect(await drawsDuring(x, time)).toBeLessThan(12);
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
