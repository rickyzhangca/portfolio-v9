import { useEffect, useRef, useState } from "react";
import type { PanMotion } from "@/hooks/use-canvas-viewport";
import type { ViewportState } from "@/types/canvas";

/** The camera's glide from the first view to a linked item. */
export const OPEN_ITEM_GLIDE: PanMotion = {
  duration: 1100,
  easing: "easeInOutCubic",
};
/** The item starts opening this long before the glide lands. */
const OPEN_ITEM_OVERLAP_MS = 120;
const INTERRUPTIONS = ["pointerdown", "wheel", "keydown", "touchstart"];

interface OpenItemLinkOptions {
  activate: (id: string) => void;
  /** The scene has risen and settled. */
  enabled: boolean;
  getFocusViewport: (id: string) => ViewportState | null;
  itemId: string | null | undefined;
  onOpened: (() => void) | undefined;
  panTo: (target: ViewportState, motion?: PanMotion) => void;
}

/**
 * Opens the item a link such as /toronto asked for: once the scene has
 * risen, the camera glides over to it and it opens as if clicked. Any input
 * during the glide leaves the visitor where they are; reduced motion skips
 * the glide.
 */
export const useOpenItemLink = ({
  activate,
  enabled,
  getFocusViewport,
  itemId,
  onOpened,
  panTo,
}: OpenItemLinkOptions) => {
  // Read when used, so the glide is not restarted or cancelled as the
  // scene's state changes under it.
  const latest = useRef({ activate, getFocusViewport, panTo });
  latest.current = { activate, getFocusViewport, panTo };
  const [pending, setPending] = useState<string | null>(null);
  const handledRef = useRef<string | null>(null);

  // Taken from the link at once, so the address no longer carries it: a
  // reload or Back does not open the item again.
  useEffect(() => {
    if (itemId) {
      setPending(itemId);
      onOpened?.();
    }
  }, [itemId, onOpened]);

  useEffect(() => {
    if (!(enabled && pending) || handledRef.current === pending) {
      return;
    }
    handledRef.current = pending;
    const target = latest.current.getFocusViewport(pending);
    if (!target) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      latest.current.activate(pending);
      return;
    }
    latest.current.panTo(target, OPEN_ITEM_GLIDE);
    const stop = () => {
      window.clearTimeout(timer);
      for (const type of INTERRUPTIONS) {
        window.removeEventListener(type, stop, true);
      }
    };
    const timer = window.setTimeout(() => {
      stop();
      latest.current.activate(pending);
    }, OPEN_ITEM_GLIDE.duration - OPEN_ITEM_OVERLAP_MS);
    for (const type of INTERRUPTIONS) {
      window.addEventListener(type, stop, { capture: true, passive: true });
    }
    return stop;
  }, [enabled, pending]);
};
