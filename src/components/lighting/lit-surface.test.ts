import { afterEach, describe, expect, it, vi } from "vitest";
import type { LampPosition } from "./desk-lamp";
import { runLitSurface } from "./lit-surface";

const lamp = vi.hoisted(() => ({
  listeners: new Set<(position: LampPosition) => void>(),
}));

// The lamp's frames are stepped by hand.
vi.mock("./desk-lamp", () => ({
  getFrameTransformCache: () => new Map(),
  LAMP_HEIGHT: 240,
  subscribeLamp: (listener: (position: LampPosition) => void) => {
    lamp.listeners.add(listener);
    return () => lamp.listeners.delete(listener);
  },
}));

const createElement = () => {
  const element = document.createElement("div");
  Object.defineProperty(element, "offsetWidth", { value: 100 });
  Object.defineProperty(element, "offsetHeight", { value: 100 });
  document.body.append(element);
  return element;
};

const startSurface = (step?: () => readonly number[]) => {
  const draw = vi.fn();
  const stop = runLitSurface({
    attach: () => Promise.resolve({ destroy: vi.fn() }),
    draw,
    element: createElement(),
    label: "Test surface",
    onReady: vi.fn(),
    step,
  });
  return { draw, stop };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("runLitSurface", () => {
  afterEach(() => {
    lamp.listeners.clear();
    document.body.replaceChildren();
  });

  it("draws surfaces animating their own parts before relit ones", async () => {
    const relit = Array.from({ length: 5 }, () => startSurface());
    let travel = 0;
    const lifting = startSurface(() => {
      travel += 1;
      return [travel];
    });
    await settle();

    for (const listener of lamp.listeners) {
      listener({ x: 10, y: 10 });
    }
    await settle();

    // Four draws a frame: the lifting surface is among them, though it
    // queued last.
    expect(lifting.draw).toHaveBeenCalledTimes(1);
    const drawn = relit.filter(({ draw }) => draw.mock.calls.length > 0);
    expect(drawn).toHaveLength(3);

    for (const surface of [...relit, lifting]) {
      surface.stop();
    }
  });
});
