import { act, fireEvent, render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { describe, expect, it } from "vitest";
import {
  shadowClockHourAtom,
  shadowDebugConfigAtom,
} from "@/context/atoms";
import { CanvasControlPanel } from "./canvas-control-panel";

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
  it("renders a Shadows tab", () => {
    renderPanel();

    expect(screen.getByRole("tab", { name: "Shadows" })).toBeDefined();
  });

  it("shows shadow override controls directly in the Shadows panel", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("tab", { name: "Shadows" }));

    expect(screen.getByText("Time override")).toBeDefined();
    expect(screen.queryByRole("tab", { name: "Live" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Debug" })).toBeNull();
  });

  it("updates the shadow time readout when the debug time changes", () => {
    const { store } = renderPanel();

    act(() => {
      fireEvent.click(screen.getByRole("tab", { name: "Shadows" }));
    });

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

    fireEvent.click(screen.getByRole("tab", { name: "Shadows" }));

    expect(screen.getByText("Time")).toBeDefined();
    expect(screen.getByText("Time override")).toBeDefined();
  });
});
