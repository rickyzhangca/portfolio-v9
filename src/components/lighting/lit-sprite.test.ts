import { afterEach, describe, expect, it, vi } from "vitest";
import { createTransformCache } from "./lamp-shadows";
import { getLampShadowClaim, setClaimedLampShadow } from "./lit-shadow";
import { runLampSprite } from "./lit-sprite";

const lamp = vi.hoisted(() => ({
  listeners: new Set<
    (
      position: { x: number; y: number },
      time: number
    ) => (() => void) | undefined
  >(),
  wake: vi.fn(),
}));
vi.mock("./desk-lamp", () => ({
  getFrameTransformCache: () => createTransformCache(),
  subscribeLamp: (
    listener: (
      position: { x: number; y: number },
      time: number
    ) => (() => void) | undefined
  ) => {
    lamp.listeners.add(listener);
    return () => lamp.listeners.delete(listener);
  },
  wakeLamp: lamp.wake,
}));

const SHADOW = {
  blur: 4,
  contact: { blur: 3, opacity: 0.2 },
  opacity: 0.2,
  x: 4,
  y: 5,
};
const cleanups: (() => void)[] = [];
let time = 0;

const sprite = (x = 0) => {
  const caster = document.createElement("div");
  Object.defineProperties(caster, {
    offsetHeight: { configurable: true, value: 80 },
    offsetWidth: { configurable: true, value: 100 },
  });
  caster.getBoundingClientRect = () =>
    DOMRect.fromRect({ height: 80, width: 100, x, y: 0 });
  const canvas = document.createElement("canvas");
  const fill = vi.fn();
  const context: Partial<CanvasRenderingContext2D> = {
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    fill,
    restore: vi.fn(),
    roundRect: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
  };
  vi.spyOn(canvas, "getContext").mockReturnValue(
    context as CanvasRenderingContext2D
  );
  cleanups.push(
    runLampSprite({ canvas, caster, inside: false, outline: { radius: 4 } })
  );
  return { canvas, caster, fill };
};

const frame = (
  casters: HTMLElement[],
  shadow: typeof SHADOW | null = SHADOW
) => {
  time += 16;
  const writes = [...lamp.listeners].map((listener) =>
    listener({ x: 0, y: 0 }, time)
  );
  // The room may read after the sprite: all claims must arrive before writes.
  for (const caster of casters) {
    setClaimedLampShadow(caster, shadow);
  }
  for (const write of writes) {
    write?.();
  }
};

afterEach(() => {
  for (const stop of cleanups.splice(0)) {
    stop();
  }
  lamp.wake.mockClear();
  vi.restoreAllMocks();
});

describe("paper shadow sprites", () => {
  it("draws one bounded bitmap, then only moves it during a lamp sweep", () => {
    const { canvas, caster, fill } = sprite();
    frame([caster]);
    expect(getLampShadowClaim(caster)?.ready).toBe(true);
    expect(canvas.style.opacity).toBe("0");
    expect(canvas.width).toBeLessThan(80);
    expect(canvas.height).toBeLessThan(70);
    frame([caster]);
    expect(Number(canvas.style.opacity)).toBeGreaterThan(0);
    const first = canvas.style.transform;
    frame([caster], { ...SHADOW, blur: 4.5, x: 12 });
    expect(canvas.style.transform).not.toBe(first);
    expect(fill).toHaveBeenCalledTimes(1);
    frame([caster], { ...SHADOW, blur: 9 });
    expect(fill).toHaveBeenCalledTimes(2);
  });

  it("keeps the lamp awake until queued outlines have all handed over", () => {
    const sprites = Array.from({ length: 10 }, () => sprite());
    const casters = sprites.map(({ caster }) => caster);
    frame(casters);
    expect(
      sprites.filter(({ fill }) => fill.mock.calls.length > 0)
    ).toHaveLength(4);
    expect(lamp.wake).toHaveBeenCalled();
    frame(casters);
    frame(casters);
    frame(casters);
    expect(
      sprites.every(({ canvas }) => Number(canvas.style.opacity) > 0)
    ).toBe(true);
  });

  it("hides during filter fallback and cleanup, then redraws changed geometry", () => {
    const { canvas, caster, fill } = sprite();
    frame([caster]);
    frame([caster]);
    frame([caster], null);
    expect(canvas.style.opacity).toBe("0");
    Object.defineProperty(caster, "offsetWidth", { value: 150 });
    frame([caster]);
    expect(fill).toHaveBeenCalledTimes(2);
    expect(Number(canvas.style.opacity)).toBeGreaterThan(0);
    cleanups.pop()?.();
    expect(canvas.style.opacity).toBe("0");
    expect(getLampShadowClaim(caster)).toBeUndefined();
  });

  it("culls off-screen casters before transform reads or drawing", () => {
    const { caster, fill } = sprite(-1000);
    const style = vi.spyOn(window, "getComputedStyle");
    frame([caster]);
    expect(style).not.toHaveBeenCalled();
    expect(fill).not.toHaveBeenCalled();
  });
});
