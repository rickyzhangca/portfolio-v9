import { act, fireEvent, render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  shadowClockHourAtom,
  shadowDebugConfigAtom,
} from "@/context/atoms";
import { CanvasControlPanel } from "./canvas-control-panel";

let nextRafId = 1;
const rafCallbacks = new Map<number, FrameRequestCallback>();

const advanceShadowPlayback = (timestamp: number) => {
  const callbacks = Array.from(rafCallbacks.values());
  rafCallbacks.clear();

  for (const callback of callbacks) {
    callback(timestamp);
  }
};

const openShadowsPanel = () => {
  act(() => {
    fireEvent.click(screen.getByRole("tab", { name: "Shadows" }));
  });
};

const startShadowPlayback = () => {
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: "Play shadows" }));
  });
};

const renderPanel = () => {
  const store = createStore();
  store.set(shadowClockHourAtom, 14);
  store.set(shadowDebugConfigAtom, {
    mode: "live",
    debugHour: 12,
  });

  const view = render(
    <Provider store={store}>
      <CanvasControlPanel />
    </Provider>
  );

  return { store, ...view };
};

describe("CanvasControlPanel", () => {
  beforeEach(() => {
    nextRafId = 1;
    rafCallbacks.clear();

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      const id = nextRafId++;
      rafCallbacks.set(id, callback);
      return id;
    });

    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      rafCallbacks.delete(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a Shadows tab", () => {
    renderPanel();

    expect(screen.getByRole("tab", { name: "Shadows" })).toBeDefined();
  });

  it("shows shadow override controls directly in the Shadows panel", () => {
    renderPanel();

    openShadowsPanel();

    expect(screen.getByText("Time override")).toBeDefined();
    expect(screen.queryByRole("tab", { name: "Live" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Debug" })).toBeNull();
  });

  it("updates the shadow time readout when the debug time changes", () => {
    const { store } = renderPanel();

    openShadowsPanel();

    expect(screen.getByText("Time override")).toBeDefined();

    act(() => {
      store.set(shadowDebugConfigAtom, {
        mode: "debug",
        debugHour: 12.25,
      });
    });

    expect(screen.getAllByText("12:15 PM").length).toBeGreaterThan(0);
  });

  it("keeps the shadow override control visible while live mode is active", () => {
    renderPanel();

    openShadowsPanel();

    expect(screen.getByText("Time")).toBeDefined();
    expect(screen.getByText("Time override")).toBeDefined();
  });

  it("renders a play button next to reset in the Shadows panel", () => {
    renderPanel();

    openShadowsPanel();

    expect(screen.getByRole("button", { name: "Play shadows" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Reset" })).toBeDefined();
  });

  it("plays one 24-hour shadow sweep from the current selected time", () => {
    const { store } = renderPanel();

    act(() => {
      store.set(shadowDebugConfigAtom, {
        mode: "debug",
        debugHour: 6,
      });
    });

    openShadowsPanel();

    startShadowPlayback();
    expect(rafCallbacks.size).toBeGreaterThan(0);

    act(() => {
      advanceShadowPlayback(16);
      advanceShadowPlayback(2516);
    });

    const state = store.get(shadowDebugConfigAtom);
    expect(state.mode).toBe("debug");
    expect(state.debugHour).toBeGreaterThan(6);
  });

  it("stops playback after one full 24-hour shadow sweep", () => {
    const { store } = renderPanel();

    openShadowsPanel();

    startShadowPlayback();
    expect(rafCallbacks.size).toBeGreaterThan(0);

    act(() => {
      advanceShadowPlayback(16);
      advanceShadowPlayback(10_016);
    });

    expect(screen.getByRole("button", { name: "Play shadows" })).toBeDefined();
    expect(store.get(shadowDebugConfigAtom).mode).toBe("debug");
  });
});
