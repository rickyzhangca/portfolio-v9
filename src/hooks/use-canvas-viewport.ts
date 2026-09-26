import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { AUTO_PAN_DURATION_MS, AUTO_PAN_EASING } from "@/lib/auto-pan";
import type { ViewportState } from "@/types/canvas";

export const useCanvasViewport = (
  initialViewport: ViewportState,
  onCommit: (viewport: ViewportState) => void,
  isLocked: boolean
) => {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef(initialViewport);
  const frameRef = useRef<number | null>(null);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scale, setScale] = useState(initialViewport.scale);
  const [dimensions, setDimensions] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  const commit = useCallback(() => {
    if (commitTimerRef.current !== null) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    onCommit({ ...viewportRef.current });
  }, [onCommit]);

  const sync = useCallback(
    (viewport: ViewportState) => {
      viewportRef.current = { ...viewport };
      setScale(viewport.scale);
      if (commitTimerRef.current !== null) {
        clearTimeout(commitTimerRef.current);
      }
      // Includes imperative transforms and momentum, not only pointer release.
      commitTimerRef.current = setTimeout(commit, 80);
    },
    [commit]
  );

  const onTransformed = useCallback(
    (ref: ReactZoomPanPinchRef) => {
      sync(ref.state);
    },
    [sync]
  );

  const onStopped = useCallback(
    (ref: ReactZoomPanPinchRef) => {
      sync(ref.state);
      commit();
    },
    [commit, sync]
  );

  const cancelPendingPan = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const panTo = useCallback(
    (target: ViewportState) => {
      cancelPendingPan();
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        transformRef.current?.setTransform(
          target.positionX,
          target.positionY,
          target.scale,
          AUTO_PAN_DURATION_MS,
          AUTO_PAN_EASING
        );
      });
    },
    [cancelPendingPan]
  );

  useLayoutEffect(() => {
    const resize = () =>
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      if (isLocked) {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
        }
        return;
      }
      event.preventDefault();
      const transform = transformRef.current;
      if (!transform) {
        return;
      }
      cancelPendingPan();
      const current = transform.instance.transformState;
      let unit = 1;
      if (event.deltaMode === 1) {
        unit = 16;
      } else if (event.deltaMode === 2) {
        unit = dimensions.height;
      }
      // Zoom remains disabled: scaled Motion layout animations are unreliable.
      transform.setTransform(
        current.positionX -
          event.deltaX * (event.deltaMode === 2 ? dimensions.width : unit),
        current.positionY - event.deltaY * unit,
        current.scale,
        0
      );
    };
    if (isLocked) {
      window.addEventListener("wheel", onWheel, { passive: false });
      return () => window.removeEventListener("wheel", onWheel);
    }
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [cancelPendingPan, dimensions.height, dimensions.width, isLocked]);

  useEffect(
    () => () => {
      cancelPendingPan();
      if (commitTimerRef.current !== null) {
        clearTimeout(commitTimerRef.current);
      }
    },
    [cancelPendingPan]
  );

  return {
    transformRef,
    containerRef,
    viewportRef,
    scale,
    dimensions,
    onTransformed,
    onStopped,
    panTo,
    cancelPendingPan,
  };
};
