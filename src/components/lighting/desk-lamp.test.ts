import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeLamp } from "./desk-lamp";

describe("subscribeLamp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("runs every listener's reads before any listener's writes", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const order: string[] = [];

    const stopFirst = subscribeLamp(() => {
      order.push("read first");
      return () => order.push("write first");
    });
    const stopSecond = subscribeLamp((_lamp, time) => {
      order.push(`read second at ${time}`);
    });
    frames.shift()?.(16);

    expect(order).toEqual(["read first", "read second at 16", "write first"]);
    stopFirst();
    stopSecond();
  });
});
