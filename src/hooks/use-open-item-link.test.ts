import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OPEN_ITEM_GLIDE, useOpenItemLink } from "./use-open-item-link";

const TARGET = { positionX: -400, positionY: -300, scale: 1 };

const setup = (overrides: { enabled?: boolean; reduced?: boolean } = {}) => {
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches: overrides.reduced ?? false,
  } as MediaQueryList);
  const options = {
    activate: vi.fn(),
    enabled: overrides.enabled ?? true,
    getFocusViewport: vi.fn(() => TARGET),
    itemId: "streetmap-item" as string | null,
    onOpened: vi.fn(),
    panTo: vi.fn(),
  };
  const hook = renderHook((props) => useOpenItemLink(props), {
    initialProps: options,
  });
  return { hook, options };
};

describe("opening a linked item", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("glides to the item, then opens it once", () => {
    const { hook, options } = setup();
    expect(options.onOpened).toHaveBeenCalledOnce();
    expect(options.panTo).toHaveBeenCalledWith(TARGET, OPEN_ITEM_GLIDE);
    expect(options.activate).not.toHaveBeenCalled();
    // The link is consumed: the address no longer names the item.
    hook.rerender({ ...options, itemId: null });
    act(() => {
      vi.advanceTimersByTime(OPEN_ITEM_GLIDE.duration);
    });
    expect(options.activate).toHaveBeenCalledExactlyOnceWith("streetmap-item");
  });

  it("waits for the scene to settle", () => {
    const { hook, options } = setup({ enabled: false });
    expect(options.panTo).not.toHaveBeenCalled();
    hook.rerender({ ...options, enabled: true });
    expect(options.panTo).toHaveBeenCalledOnce();
  });

  it("leaves a visitor who takes over during the glide where they are", () => {
    const { options } = setup();
    window.dispatchEvent(new Event("pointerdown"));
    act(() => {
      vi.advanceTimersByTime(OPEN_ITEM_GLIDE.duration);
    });
    expect(options.activate).not.toHaveBeenCalled();
  });

  it("opens at once without the glide under reduced motion", () => {
    const { options } = setup({ reduced: true });
    expect(options.panTo).not.toHaveBeenCalled();
    expect(options.activate).toHaveBeenCalledExactlyOnceWith("streetmap-item");
  });
});
