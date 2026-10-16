import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  deskLampAtom,
  fanConfigAtom,
  lampConfigAtom,
  repulsionConfigAtom,
} from "@/context/atoms";
import { DEFAULT_FAN_CONFIG } from "@/lib/fan";
import { DEFAULT_LAMP_CONFIG } from "@/lib/lamp-config";
import { DEFAULT_REPULSION_CONFIG } from "@/lib/repulsion";
import { CanvasControlPanel } from "./canvas-control-panel";

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () => new DOMRect(0, 0, 200, 20)
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("updates real config atoms through named keyboard sliders and resets each tab independently", async () => {
  const store = createStore();
  render(
    <Provider store={store}>
      <CanvasControlPanel />
    </Provider>
  );
  fireEvent.click(screen.getByRole("tab", { name: "Repulsion" }));
  fireEvent.keyDown(await screen.findByRole("slider", { name: "Radius" }), {
    key: "ArrowRight",
  });
  fireEvent.keyDown(await screen.findByRole("slider", { name: "Strength" }), {
    key: "ArrowLeft",
  });
  expect(store.get(repulsionConfigAtom).radiusPx).toBe(
    DEFAULT_REPULSION_CONFIG.radiusPx + 100
  );
  expect(store.get(repulsionConfigAtom).strengthPx).toBe(
    DEFAULT_REPULSION_CONFIG.strengthPx - 50
  );
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(store.get(repulsionConfigAtom)).toEqual(DEFAULT_REPULSION_CONFIG);
  fireEvent.click(screen.getByRole("tab", { name: "Fan" }));
  for (const label of [
    "Rotation step",
    "Arc step",
    "Horizontal gap",
    "Vertical gap",
  ]) {
    // biome-ignore lint/performance/noAwaitInLoops: each slider is looked up after the previous change settles
    fireEvent.keyDown(await screen.findByRole("slider", { name: label }), {
      key: "ArrowRight",
    });
  }
  expect(store.get(fanConfigAtom)).toEqual({
    rotateStepDeg: DEFAULT_FAN_CONFIG.rotateStepDeg + 0.5,
    arcStepPx: DEFAULT_FAN_CONFIG.arcStepPx + 1,
    expandGapPx: DEFAULT_FAN_CONFIG.expandGapPx + 1,
    expandRowGapPx: DEFAULT_FAN_CONFIG.expandRowGapPx + 1,
  });
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(store.get(fanConfigAtom)).toEqual(DEFAULT_FAN_CONFIG);
});

it("shows the Light tab first only under the desk lamp", async () => {
  const store = createStore();
  store.set(deskLampAtom, true);
  render(
    <Provider store={store}>
      <CanvasControlPanel />
    </Provider>
  );
  const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
  expect(tabs).toEqual(["Light", "Repulsion", "Fan"]);
  expect(
    screen.getByRole("tab", { name: "Light" }).getAttribute("aria-selected")
  ).toBe("true");

  for (const label of ["Height", "Pool size", "Room dim"]) {
    // biome-ignore lint/performance/noAwaitInLoops: each slider is looked up after the previous change settles
    fireEvent.keyDown(await screen.findByRole("slider", { name: label }), {
      key: "ArrowRight",
    });
  }
  const config = store.get(lampConfigAtom);
  // The preview repaints with the new settings: a 950 px pool at its scale.
  const room = screen.getByTestId("light-preview").firstElementChild;
  await waitFor(() =>
    expect((room as HTMLElement).style.background).toContain("circle 114px")
  );
  expect(config.heightPx).toBe(DEFAULT_LAMP_CONFIG.heightPx + 20);
  expect(config.poolRadiusPx).toBe(DEFAULT_LAMP_CONFIG.poolRadiusPx + 50);
  expect(config.roomDim).toBeCloseTo(DEFAULT_LAMP_CONFIG.roomDim + 0.1);

  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(store.get(lampConfigAtom)).toEqual(DEFAULT_LAMP_CONFIG);

  act(() => store.set(deskLampAtom, false));
  expect(screen.queryByRole("tab", { name: "Light" })).toBeNull();
  expect(
    screen.getByRole("tab", { name: "Repulsion" }).getAttribute("aria-selected")
  ).toBe("true");
});
