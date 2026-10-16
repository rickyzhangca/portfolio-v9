import { type RefObject, useEffect, useState } from "react";

/**
 * `waiting`: the scene is mounted but hidden while its first view gets ready.
 * `playing`: cards rise onto the desk in one wave. `done`: they have settled.
 */
export type CanvasEntrancePhase = "waiting" | "playing" | "done";

/** Never hold the scene back longer than this, even on a slow network. */
const MAX_WAIT_MS = 1200;
/** A quiet spell before the wave, so leftover mount work misses its frames. */
const IDLE_TIMEOUT_MS = 160;

const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

const whenIdle = () =>
  new Promise<void>((resolve) => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => resolve(), {
        timeout: IDLE_TIMEOUT_MS,
      });
    } else {
      setTimeout(resolve, 0);
    }
  });

// An unloaded image may have no size yet, and still needs waiting for; one
// that is not rendered measures zero at the origin and fails `right > 0`.
const isInViewport = (element: Element) => {
  const bounds = element.getBoundingClientRect();
  return (
    bounds.right > 0 &&
    bounds.bottom > 0 &&
    bounds.left < window.innerWidth &&
    bounds.top < window.innerHeight
  );
};

/**
 * Resolves once the fonts and the images on screen are decoded, so nothing
 * pops in, reflows or decodes on the main thread while cards are moving.
 */
const whenFirstViewReady = async (root: HTMLElement) => {
  // Effects of the first commit may still be adding images.
  await nextFrame();
  const images = [...root.querySelectorAll("img")].filter(isInViewport);
  await Promise.all([
    document.fonts?.ready,
    ...images.map((image) => image.decode?.().catch(() => undefined)),
  ]);
};

/**
 * Holds the scene until its first view is ready, then plays the entrance for
 * `durationMs`. The wave itself runs as CSS animations of opacity and
 * transform, on the compositor, so main-thread work cannot make it stutter.
 * `isHeld` keeps the scene waiting for something else its first view needs
 * (the desk lamp's shadows); the deadline still applies.
 */
export const useCanvasEntrance = (
  rootRef: RefObject<HTMLElement | null>,
  durationMs: number,
  isHeld = false
) => {
  const [phase, setPhase] = useState<CanvasEntrancePhase>("waiting");
  const [isViewReady, setViewReady] = useState(false);
  const [isOverdue, setOverdue] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    let cancelled = false;
    const deadline = setTimeout(() => setOverdue(true), MAX_WAIT_MS);
    (root ? whenFirstViewReady(root) : Promise.resolve())
      // Whatever happens while waiting, the scene must not stay hidden.
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) {
          setViewReady(true);
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(deadline);
    };
  }, [rootRef]);

  const canStart =
    phase === "waiting" && ((isViewReady && !isHeld) || isOverdue);

  useEffect(() => {
    if (!canStart) {
      return;
    }
    let cancelled = false;
    whenIdle()
      .then(nextFrame)
      .then(() => {
        if (!cancelled) {
          setPhase("playing");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canStart]);

  useEffect(() => {
    if (phase !== "playing") {
      return;
    }
    const timer = setTimeout(() => setPhase("done"), durationMs);
    return () => clearTimeout(timer);
  }, [phase, durationMs]);

  return phase;
};
