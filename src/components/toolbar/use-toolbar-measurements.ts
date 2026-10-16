import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { CLOSE_SPRING } from "./spring-css";
import type {
  ToolbarRect,
  ToolbarSize,
  ToolbarViewport,
} from "./toolbar-geometry";

export type ToolbarElevation = "open" | "closing" | null;

/** Stays "closing" long enough for the blob to morph back before unmount. */
export const useToolbarElevation = (active: boolean): ToolbarElevation => {
  const [closing, setClosing] = useState(false);
  const [wasActive, setWasActive] = useState(active);

  const becameInactive = !active && wasActive;
  if (active !== wasActive) {
    setWasActive(active);
    setClosing(becameInactive);
  }

  useEffect(() => {
    if (!closing) {
      return;
    }
    const timeout = setTimeout(() => setClosing(false), CLOSE_SPRING.duration);
    return () => clearTimeout(timeout);
  }, [closing]);

  if (active) {
    return "open";
  }
  if (closing || becameInactive) {
    return "closing";
  }
  return null;
};

const readViewport = (listEl: HTMLElement): ToolbarViewport => {
  const listBox = listEl.getBoundingClientRect();
  const visual = window.visualViewport;
  return {
    listH: listBox.height,
    listLeft: listBox.left,
    listTop: listBox.top,
    listW: listBox.width,
    viewH: visual?.height ?? document.documentElement.clientHeight,
    viewW: visual?.width ?? document.documentElement.clientWidth,
  };
};

const near = (a: number, b: number) => Math.abs(a - b) < 0.5;

const sameViewport = (a: ToolbarViewport, b: ToolbarViewport) =>
  near(a.viewW, b.viewW) &&
  near(a.viewH, b.viewH) &&
  near(a.listLeft, b.listLeft) &&
  near(a.listTop, b.listTop) &&
  near(a.listW, b.listW) &&
  near(a.listH, b.listH);

const sameRect = (a: ToolbarRect, b: ToolbarRect) =>
  near(a.left, b.left) &&
  near(a.top, b.top) &&
  near(a.width, b.width) &&
  near(a.height, b.height);

/** Untransformed size of the panel portaled into `host`. */
const usePanelSize = (
  host: HTMLElement | null,
  enabled: boolean,
  resetKey: number
): ToolbarSize => {
  const [size, setSize] = useState<ToolbarSize>({ h: 0, w: 0 });
  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey re-observes the host after Liquid remounts
  useLayoutEffect(() => {
    if (!(enabled && host)) {
      return;
    }
    const update = () => {
      // Measure the panel itself: the host stretches with the blob, so its
      // own width could not shrink back to the panel's max-content width.
      const target =
        host.firstElementChild instanceof HTMLElement
          ? host.firstElementChild
          : host;
      const w = Math.ceil(target.offsetWidth);
      const h = Math.ceil(target.scrollHeight || target.offsetHeight);
      if (w <= 0 && h <= 0) {
        return;
      }
      setSize((prev) => (prev.w !== w || prev.h !== h ? { h, w } : prev));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [enabled, host, resetKey]);
  return size;
};

/**
 * Active-trigger rect, panel size and viewport, plus a cold-start Liquid
 * remount: the goo filter is sized when Liquid first lays out, so a toolbar
 * that mounts hidden must remount once it has a real box.
 */
export const useToolbarMeasurements = (options: {
  listEl: HTMLElement | null;
  liquidRef: RefObject<HTMLDivElement | null>;
  panelHost: HTMLDivElement | null;
  showBlob: boolean;
  triggerEl: HTMLElement | null;
}) => {
  const { listEl, triggerEl, panelHost, liquidRef, showBlob } = options;
  const [trigger, setTrigger] = useState<ToolbarRect | null>(null);
  const [viewport, setViewport] = useState<ToolbarViewport | null>(null);
  const [liquidKey, setLiquidKey] = useState(0);
  const [armed, setArmed] = useState(false);
  const coldRef = useRef<boolean>(true);
  const armFrameRef = useRef(0);

  const panel = usePanelSize(panelHost, showBlob, liquidKey);

  // biome-ignore lint/correctness/useExhaustiveDependencies: liquidKey re-reads boxes after Liquid remounts
  useLayoutEffect(() => {
    if (!listEl) {
      return;
    }
    const updateTrigger = () => {
      if (!triggerEl) {
        return;
      }
      const listBox = listEl.getBoundingClientRect();
      const box = triggerEl.getBoundingClientRect();
      const next: ToolbarRect = {
        height: box.height,
        left: box.left - listBox.left,
        top: box.top - listBox.top,
        width: box.width,
      };
      setTrigger((prev) => (prev && sameRect(prev, next) ? prev : next));
    };
    const updateViewport = () => {
      const next = readViewport(listEl);
      setViewport((prev) => (prev && sameViewport(prev, next) ? prev : next));
    };
    updateTrigger();
    updateViewport();
    const observer = new ResizeObserver(() => {
      updateTrigger();
      updateViewport();
    });
    observer.observe(listEl);
    if (triggerEl) {
      observer.observe(triggerEl);
    }
    window.addEventListener("resize", updateViewport);
    const visual = window.visualViewport;
    visual?.addEventListener("resize", updateViewport);
    visual?.addEventListener("scroll", updateViewport);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateViewport);
      visual?.removeEventListener("resize", updateViewport);
      visual?.removeEventListener("scroll", updateViewport);
    };
  }, [listEl, triggerEl, liquidKey]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: liquidKey re-observes the remounted Liquid
  useLayoutEffect(() => {
    const el = liquidRef.current;
    if (!el) {
      return;
    }
    const armNextFrame = () => {
      cancelAnimationFrame(armFrameRef.current);
      armFrameRef.current = requestAnimationFrame(() => setArmed(true));
    };
    if (el.offsetWidth > 0 || el.offsetHeight > 0) {
      coldRef.current = false;
      armNextFrame();
    }
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) {
        return;
      }
      if (rect.width === 0 && rect.height === 0) {
        coldRef.current = true;
        return;
      }
      if (coldRef.current) {
        coldRef.current = false;
        setLiquidKey((key) => key + 1);
        setArmed(false);
        armNextFrame();
      }
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(armFrameRef.current);
      observer.disconnect();
    };
  }, [liquidKey, liquidRef]);

  return { armed, liquidKey, panel, trigger, viewport };
};
