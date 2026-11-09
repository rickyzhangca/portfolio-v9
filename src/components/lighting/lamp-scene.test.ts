import { afterEach, describe, expect, it, vi } from "vitest";
import { watchLampScene } from "./lamp-scene";

const lamp = vi.hoisted(() => ({
  listeners: new Set<() => void>(),
  wake: vi.fn(),
}));

vi.mock("./desk-lamp", () => ({
  subscribeLamp: (listener: () => void) => {
    lamp.listeners.add(listener);
    return () => lamp.listeners.delete(listener);
  },
  wakeLamp: lamp.wake,
}));

const cleanups: (() => void)[] = [];
const deliverChanges = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  for (const stop of cleanups.splice(0)) {
    stop();
  }
  document.body.replaceChildren();
  lamp.wake.mockClear();
  vi.restoreAllMocks();
});

const scene = () => {
  const root = document.createElement("div");
  const caster = document.createElement("div");
  caster.setAttribute("data-lamp-shadow", "4");
  const canvas = document.createElement("canvas");
  caster.append(canvas);
  root.append(caster);
  document.body.append(root);
  cleanups.push(watchLampScene(root));
  return { canvas, caster, root };
};

describe("lamp scene wake-ups", () => {
  it("ignores lamp filter, contact, sheen and sprite writes", async () => {
    const { canvas, caster } = scene();
    caster.style.filter = "drop-shadow(2px 3px 4px black)";
    caster.style.boxShadow = "0 0 3px black";
    caster.style.willChange = "filter";
    caster.style.transition = "none";
    caster.style.setProperty("--sheen", "0.5");
    canvas.style.transform = "translate(2px, 3px)";
    canvas.width = 100;
    await deliverChanges();
    expect(lamp.wake).not.toHaveBeenCalled();
  });

  it("wakes for camera/card transforms, late content and image loads", async () => {
    const { root, caster } = scene();
    caster.style.transform = "translate(10px, 20px)";
    await deliverChanges();
    expect(lamp.wake).toHaveBeenCalledTimes(1);
    lamp.wake.mockClear();
    const image = document.createElement("img");
    root.append(image);
    await deliverChanges();
    expect(lamp.wake).toHaveBeenCalledTimes(1);
    lamp.wake.mockClear();
    image.dispatchEvent(new Event("load"));
    expect(lamp.wake).toHaveBeenCalledTimes(1);
  });

  it("keeps polling compositor animations until they finish", () => {
    const { root } = scene();
    const animation = { pending: false, playState: "running" };
    vi.spyOn(root, "getAnimations").mockImplementation(() => [
      animation as Animation,
    ]);
    for (const listener of lamp.listeners) {
      listener();
    }
    expect(lamp.wake).toHaveBeenCalledTimes(1);
    lamp.wake.mockClear();
    animation.playState = "finished";
    for (const listener of lamp.listeners) {
      listener();
    }
    expect(lamp.wake).not.toHaveBeenCalled();
  });

  it("removes observers and animation listeners on cleanup", async () => {
    const { root, caster } = scene();
    cleanups.pop()?.();
    caster.style.transform = "translateX(20px)";
    root.dispatchEvent(new Event("animationstart"));
    await deliverChanges();
    expect(lamp.wake).not.toHaveBeenCalled();
    expect(lamp.listeners.size).toBe(0);
  });
});
