import { useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { isDeskLampSupported } from "@/components/lighting/desk-lamp";
import { deskLampAtom } from "@/context/atoms";
import type { CanvasEntrancePhase } from "@/hooks/use-canvas-entrance";

// Once per page load: after that the lamp stays as the visitor left it, even
// when the canvas remounts.
let hasSwitchedOn = false;

/**
 * Switches the desk lamp on in desktop Chrome when WebGPU can actually draw. `navigator.gpu`
 * alone is not enough: browsers without a usable GPU expose it and then
 * return no adapter, and the lamp would flick on and off again.
 *
 * The adapter usually answers while the scene still waits, hidden, for its
 * first view; the lamp then comes on unseen and the cards rise already lit.
 * An answer that arrives once the wave has started waits for the cards to
 * settle, because starting WebGPU mid-wave would cost it frames.
 */
export const useDefaultDeskLamp = (
  enabled: boolean,
  entrance: CanvasEntrancePhase
) => {
  const setLampOn = useSetAtom(deskLampAtom);
  const [hasAdapter, setHasAdapter] = useState(false);

  useEffect(() => {
    if (hasSwitchedOn || !enabled || !isDeskLampSupported()) {
      return;
    }
    let cancelled = false;
    navigator.gpu
      .requestAdapter()
      .then((adapter) => {
        if (adapter && !cancelled) {
          setHasAdapter(true);
        }
      })
      .catch(() => {
        // No adapter: the plain DOM rendering stays.
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (hasAdapter && entrance !== "playing" && !hasSwitchedOn) {
      hasSwitchedOn = true;
      setLampOn(true);
    }
  }, [entrance, hasAdapter, setLampOn]);
};
