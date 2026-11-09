import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let lamp: typeof import("./desk-lamp");
let frames: Map<number, FrameRequestCallback>;
let clock = 0;
const cleanups: (() => void)[] = [];

const step = () => {
  clock += 1000 / 60;
  const pending = [...frames.values()];
  frames.clear();
  for (const callback of pending) {
    callback(clock);
  }
};

const settle = () => {
  for (let count = 0; frames.size && count < 300; count += 1) {
    step();
  }
  expect(frames.size).toBe(0);
};

describe("demand-driven lamp", () => {
  beforeEach(async () => {
    vi.resetModules();
    frames = new Map();
    clock = 0;
    let id = 0;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      id += 1;
      frames.set(id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (frame: number) =>
      frames.delete(frame)
    );
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    lamp = await import("./desk-lamp");
  });

  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("runs all reads before writes, then sleeps without another frame", () => {
    const order: string[] = [];
    cleanups.push(
      lamp.subscribeLamp(() => {
        order.push("read first");
        return () => order.push("write first");
      }),
      lamp.subscribeLamp(() => {
        order.push("read second");
        return () => order.push("write second");
      })
    );
    expect(frames.size).toBe(1);
    step();
    expect(order).toEqual([
      "read first",
      "read second",
      "write first",
      "write second",
    ]);
    expect(frames.size).toBe(0);
  });

  it("follows the pointer to convergence and sleeps again", () => {
    const read = vi.fn();
    cleanups.push(lamp.subscribeLamp(read));
    settle();
    clock += 10_000;
    const before = { ...lamp.getLampPointer() };
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 800, clientY: 500 })
    );
    step();
    expect(read.mock.calls.at(-1)?.[2]).toBeCloseTo(1 / 60);
    expect(lamp.getLampPointer().x).toBeGreaterThan(before.x);
    expect(lamp.getLampPointer().x).toBeLessThan(800);
    settle();
    expect(lamp.getLampPointer()).toEqual({ x: 800, y: 500 });
  });

  it.each([
    "wheel",
    "keydown",
    "keyup",
    "pointerout",
    "resize",
    "click",
    "focusin",
  ])("wakes for %s and stops once idle", (event) => {
    cleanups.push(lamp.subscribeLamp(() => undefined));
    settle();
    window.dispatchEvent(new Event(event));
    expect(frames.size).toBe(1);
    settle();
  });

  it("wakes for new subscribers, settings, shadow holds and flare changes", () => {
    cleanups.push(lamp.subscribeLamp(() => undefined));
    settle();
    cleanups.push(lamp.subscribeLamp(() => undefined));
    expect(frames.size).toBe(1);
    settle();
    lamp.setLampConfig({ ...lamp.getLampConfig(), heightPx: 300 });
    expect(frames.size).toBe(1);
    settle();
    lamp.holdLampShadows(true);
    expect(frames.size).toBe(1);
    settle();
    lamp.holdLampShadows(false);
    expect(frames.size).toBe(1);
    settle();
    const flare = { brightness: 1, weight: 1, x: 100, y: 200 };
    lamp.setLampFlare(flare);
    settle();
    expect(lamp.getLampIntensity()).toBe(3);
    lamp.setLampFlare({ ...flare });
    expect(frames.size).toBe(0);
    lamp.setLampFlare(null);
    expect(frames.size).toBe(1);
    settle();
    expect(lamp.getLampIntensity()).toBe(1);
  });

  it("stays awake while a listener has pending animation or drawing work", () => {
    let remaining = 20;
    cleanups.push(
      lamp.subscribeLamp(() => {
        remaining -= 1;
        if (remaining > 0) {
          return lamp.wakeLamp;
        }
      })
    );
    settle();
    expect(remaining).toBe(0);
  });

  it("cancels paused frames and resumes only after every pause is released", () => {
    const read = vi.fn();
    cleanups.push(lamp.subscribeLamp(read));
    lamp.pauseLamp(true);
    lamp.pauseLamp(true, "reader");
    expect(frames.size).toBe(0);
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 900, clientY: 600 })
    );
    expect(frames.size).toBe(0);
    lamp.pauseLamp(false);
    expect(frames.size).toBe(0);
    lamp.pauseLamp(false, "reader");
    expect(frames.size).toBe(1);
    settle();
    expect(lamp.getLampPointer()).toEqual({ x: 900, y: 600 });
    expect(lamp.isLampCatchingUp()).toBe(false);
  });

  it("sleeps in a hidden tab and wakes on return", () => {
    cleanups.push(lamp.subscribeLamp(() => undefined));
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(frames.size).toBe(0);
    lamp.wakeLamp();
    expect(frames.size).toBe(0);
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(frames.size).toBe(1);
    settle();
  });

  it("removes wake listeners with the last subscriber", () => {
    const stop = lamp.subscribeLamp(() => undefined);
    stop();
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 100, clientY: 100 })
    );
    window.dispatchEvent(new Event("wheel"));
    lamp.wakeLamp();
    expect(frames.size).toBe(0);
  });
});
