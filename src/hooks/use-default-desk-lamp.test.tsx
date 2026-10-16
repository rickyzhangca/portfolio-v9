import { act, renderHook } from "@testing-library/react";
import { Provider, useAtomValue } from "jotai";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CanvasEntrancePhase } from "@/hooks/use-canvas-entrance";

vi.mock("@/components/lighting/desk-lamp", () => ({
  isDeskLampSupported: () => true,
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <Provider>{children}</Provider>
);

// The hook switches on once per page load, so each case loads it afresh.
const renderLamp = async (adapter: Promise<unknown>) => {
  vi.resetModules();
  vi.stubGlobal("navigator", {
    ...navigator,
    gpu: { requestAdapter: () => adapter },
  });
  const { useDefaultDeskLamp } = await import("./use-default-desk-lamp");
  const { deskLampAtom } = await import("@/context/atoms");
  return renderHook(
    ({ entrance }: { entrance: CanvasEntrancePhase }) => {
      useDefaultDeskLamp(true, entrance);
      return useAtomValue(deskLampAtom);
    },
    { initialProps: { entrance: "waiting" as CanvasEntrancePhase }, wrapper }
  );
};

describe("useDefaultDeskLamp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("switches on while the scene is still hidden, so cards rise lit", async () => {
    const { result } = await renderLamp(Promise.resolve({}));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(true);
  });

  it("waits for the cards to settle when the adapter answers mid-wave", async () => {
    let answer: (adapter: unknown) => void = () => undefined;
    const { result, rerender } = await renderLamp(
      new Promise((resolve) => {
        answer = resolve;
      })
    );
    rerender({ entrance: "playing" });
    await act(async () => {
      answer({});
      await Promise.resolve();
    });
    expect(result.current).toBe(false);
    rerender({ entrance: "done" });
    expect(result.current).toBe(true);
  });

  it("stays off without an adapter", async () => {
    const { result, rerender } = await renderLamp(Promise.resolve(null));
    await act(async () => {
      await Promise.resolve();
    });
    rerender({ entrance: "done" });
    expect(result.current).toBe(false);
  });
});
