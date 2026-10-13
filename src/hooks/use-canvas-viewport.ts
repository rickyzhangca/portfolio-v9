import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { AUTO_PAN_DURATION_MS, AUTO_PAN_EASING } from "@/lib/auto-pan";
import { clampToRange, type PanBounds } from "@/lib/pan-bounds";
import type { ViewportState } from "@/types/canvas";

export const useCanvasViewport = (
  initialViewport: ViewportState,
  onCommit: (viewport: ViewportState) => void,
  isLocked: boolean,
  /** Pan vertically only: the scene is a single column with nothing to the side. */
  lockAxisX = false,
  /** Where the camera may rest; null leaves panning unbounded. */
  getPanBounds?: () => PanBounds | null
) => {
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
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

  const panBoundsRef = useRef(getPanBounds);
  panBoundsRef.current = getPanBounds;

  const onTransformed = useCallback(
    (ref: ReactZoomPanPinchRef) => {
      const bounds = panBoundsRef.current?.();
      const transform = transformRef.current;
      // Camera moves we start ourselves already end inside the bounds, and
      // they may cross them on the way: only drags and momentum are held.
      if (bounds && transform && !transform.instance.isAnimating) {
        const { positionX, positionY, scale: currentScale } = ref.state;
        const x = bounds.x ? clampToRange(positionX, bounds.x) : positionX;
        const y = bounds.y ? clampToRange(positionY, bounds.y) : positionY;
        if (x !== positionX || y !== positionY) {
          transform.setTransform(x, y, currentScale, 0);
          return;
        }
      }
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
      setDimensions((current) =>
        current.width === window.innerWidth &&
        current.height === window.innerHeight
          ? current
          : { width: window.innerWidth, height: window.innerHeight }
      );
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    // The library only listens for touchend, so a touch the system cancels
    // (edge swipe, incoming call) would leave the canvas stuck mid-pan.
    const onTouchCancel = (event: TouchEvent) =>
      transformRef.current?.instance.onTouchPanningStop(event);
    window.addEventListener("touchcancel", onTouchCancel);
    return () => window.removeEventListener("touchcancel", onTouchCancel);
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
      const current = transform.instance.state;
      let unit = 1;
      if (event.deltaMode === 1) {
        unit = 16;
      } else if (event.deltaMode === 2) {
        unit = dimensions.height;
      }
      // Zoom remains disabled: scaled Motion layout animations are unreliable.
      transform.setTransform(
        lockAxisX
          ? current.positionX
          : current.positionX -
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
  }, [
    cancelPendingPan,
    dimensions.height,
    dimensions.width,
    isLocked,
    lockAxisX,
  ]);

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
