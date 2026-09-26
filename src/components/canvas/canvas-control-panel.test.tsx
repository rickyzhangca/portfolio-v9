import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, expect, it } from "vitest";
import { fanConfigAtom, repulsionConfigAtom } from "@/context/atoms";
import { DEFAULT_FAN_CONFIG } from "@/lib/fan";
import { DEFAULT_REPULSION_CONFIG } from "@/lib/repulsion";
import { CanvasControlPanel } from "./canvas-control-panel";

afterEach(cleanup);

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
