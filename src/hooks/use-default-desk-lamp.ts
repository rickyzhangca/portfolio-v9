import { useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { isDeskLampSupported } from "@/components/lighting/desk-lamp";
import { deskLampAtom } from "@/context/atoms";
import type { CanvasEntrancePhase } from "@/hooks/use-canvas-entrance";

/**
 * Whether the desk lamp is coming on by default: `pending` while WebGPU is
 * asked for an adapter, `found` once one answers, `none` when the lamp stays
 * as it is.
 */
export type DeskLampProbe = "pending" | "found" | "none";

// Once per page load: after that the lamp stays as the visitor left it, even
// when the canvas remounts.
let hasSwitchedOn = false;

/**
 * Asks desktop Chromium for a WebGPU adapter that can actually draw.
 * `navigator.gpu` alone is not enough: browsers without a usable GPU expose
 * it and then return no adapter, and the lamp would flick on and off again.
 */
export const useDeskLampProbe = (enabled: boolean): DeskLampProbe => {
  const [probe, setProbe] = useState<DeskLampProbe>(() =>
    hasSwitchedOn || !enabled || !isDeskLampSupported() ? "none" : "pending"
  );

  useEffect(() => {
    if (probe !== "pending") {
      return;
    }
    let cancelled = false;
    navigator.gpu
      .requestAdapter()
      .then((adapter) => {
        if (!cancelled) {
          setProbe(adapter ? "found" : "none");
        }
      })
      .catch(() => {
        // No adapter: the plain DOM rendering stays.
        if (!cancelled) {
          setProbe("none");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [probe]);

  return probe;
};

/**
 * Switches the desk lamp on once the probe finds an adapter.
 *
 * The adapter usually answers while the scene still waits, hidden, for its
 * first view; the lamp then comes on unseen and the cards rise already lit.
 * An answer that arrives once the wave has started waits for the cards to
 * settle, because starting WebGPU mid-wave would cost it frames.
 */
export const useDefaultDeskLamp = (
  probe: DeskLampProbe,
  entrance: CanvasEntrancePhase
) => {
  const setLampOn = useSetAtom(deskLampAtom);

  useEffect(() => {
    if (probe === "found" && entrance !== "playing" && !hasSwitchedOn) {
      hasSwitchedOn = true;
      setLampOn(true);
    }
  }, [entrance, probe, setLampOn]);
};
