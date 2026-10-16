import {
  type MouseEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export interface ItemRect {
  height: number;
  left: number;
  top: number;
  width: number;
}

/** Frames to retry measurement while a registered item still has no layout box. */
const MEASUREMENT_ATTEMPTS = 3;

/** Layout box of `element` in `container` space, or null if not yet laid out. */
const itemLayoutRect = (
  container: HTMLElement,
  element: HTMLElement
): ItemRect | null => {
  const hasLayoutBox =
    element.offsetParent !== null ||
    element.offsetWidth > 0 ||
    element.offsetHeight > 0;
  if (!hasLayoutBox) {
    return null;
  }
  let top = element.offsetTop;
  let left = element.offsetLeft;
  let ancestor = element.offsetParent as HTMLElement | null;
  while (ancestor && ancestor !== container && container.contains(ancestor)) {
    top += ancestor.offsetTop + ancestor.clientTop;
    left += ancestor.offsetLeft + ancestor.clientLeft;
    ancestor = ancestor.offsetParent as HTMLElement | null;
  }
  return {
    height: element.offsetHeight,
    left,
    top,
    width: element.offsetWidth,
  };
};

const sameRects = (prev: ItemRect[], next: ItemRect[]) =>
  prev.length === next.length &&
  next.every((rect, index) => {
    const before = prev[index];
    return (
      before !== undefined &&
      before.top === rect.top &&
      before.left === rect.left &&
      before.width === rect.width &&
      before.height === rect.height
    );
  });

/**
 * The item the pointer is inside wins; otherwise the item whose center is
 * nearest along `axis`. Rects are in the container's layout space, so the
 * container's screen box (and any ancestor scale) maps them to the pointer.
 */
export const pickNearest = (
  axis: "x" | "y",
  pointer: number,
  rects: readonly (ItemRect | undefined)[],
  container: { start: number; scale: number; offset: number }
): number | null => {
  let closest: number | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const [index, rect] of rects.entries()) {
    if (!rect) {
      continue;
    }
    const start =
      container.start +
      (container.offset + (axis === "x" ? rect.left : rect.top)) *
        container.scale;
    const size = (axis === "x" ? rect.width : rect.height) * container.scale;
    if (pointer >= start && pointer <= start + size) {
      return index;
    }
    const distance = Math.abs(pointer - (start + size / 2));
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = index;
    }
  }
  return closest;
};

/**
 * Tracks which registered item the pointer is nearest to while it is over
 * the container, so a single tooltip can glide between items instead of
 * blinking out in the gaps.
 */
export const useFluidHover = (
  containerRef: RefObject<HTMLElement | null>,
  axis: "x" | "y"
) => {
  const itemsRef = useRef(new Map<number, HTMLElement>());
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [itemRects, setItemRects] = useState<ItemRect[]>([]);
  const [isMeasured, setIsMeasured] = useState(false);
  const itemRectsRef = useRef<ItemRect[]>([]);
  const moveFrameRef = useRef<number | null>(null);
  const measureFrameRef = useRef<number | null>(null);
  const itemObserverRef = useRef<ResizeObserver | null>(null);

  const runMeasurement = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return false;
    }
    const rects: ItemRect[] = [];
    for (const [index, element] of itemsRef.current) {
      const rect = itemLayoutRect(container, element);
      if (!rect) {
        return false;
      }
      rects[index] = rect;
    }
    if (!sameRects(itemRectsRef.current, rects)) {
      itemRectsRef.current = rects;
      setItemRects(rects);
    }
    return true;
  }, [containerRef]);

  const scheduleMeasurement = useCallback(
    (attemptsLeft: number) => {
      if (measureFrameRef.current !== null) {
        cancelAnimationFrame(measureFrameRef.current);
      }
      measureFrameRef.current = requestAnimationFrame(() => {
        measureFrameRef.current = null;
        if (runMeasurement()) {
          setIsMeasured(true);
        } else if (attemptsLeft > 1) {
          scheduleMeasurement(attemptsLeft - 1);
        }
      });
    },
    [runMeasurement]
  );

  const registerItem = useCallback(
    (index: number, element: HTMLElement | null) => {
      if (element) {
        itemsRef.current.set(index, element);
        if (!itemObserverRef.current && typeof ResizeObserver !== "undefined") {
          itemObserverRef.current = new ResizeObserver(() =>
            scheduleMeasurement(MEASUREMENT_ATTEMPTS)
          );
        }
        itemObserverRef.current?.observe(element);
      } else {
        const previous = itemsRef.current.get(index);
        if (previous) {
          itemObserverRef.current?.unobserve(previous);
        }
        itemsRef.current.delete(index);
        setActiveIndex((current) => (current === index ? null : current));
      }
      setIsMeasured(false);
      scheduleMeasurement(MEASUREMENT_ATTEMPTS);
    },
    [scheduleMeasurement]
  );

  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      const pointer = axis === "x" ? event.clientX : event.clientY;
      if (moveFrameRef.current !== null) {
        cancelAnimationFrame(moveFrameRef.current);
      }
      moveFrameRef.current = requestAnimationFrame(() => {
        moveFrameRef.current = null;
        const container = containerRef.current;
        if (!container) {
          return;
        }
        const box = container.getBoundingClientRect();
        const layoutSize =
          axis === "x" ? container.offsetWidth : container.offsetHeight;
        const screenSize = axis === "x" ? box.width : box.height;
        setActiveIndex(
          pickNearest(axis, pointer, itemRectsRef.current, {
            offset:
              axis === "x"
                ? container.clientLeft - container.scrollLeft
                : container.clientTop - container.scrollTop,
            scale: layoutSize > 0 ? screenSize / layoutSize : 1,
            start: axis === "x" ? box.left : box.top,
          })
        );
      });
    },
    [axis, containerRef]
  );

  const onMouseLeave = useCallback(() => {
    if (moveFrameRef.current !== null) {
      cancelAnimationFrame(moveFrameRef.current);
      moveFrameRef.current = null;
    }
    setActiveIndex(null);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() =>
      scheduleMeasurement(MEASUREMENT_ATTEMPTS)
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, scheduleMeasurement]);

  useEffect(
    () => () => {
      if (moveFrameRef.current !== null) {
        cancelAnimationFrame(moveFrameRef.current);
      }
      if (measureFrameRef.current !== null) {
        cancelAnimationFrame(measureFrameRef.current);
      }
      itemObserverRef.current?.disconnect();
      itemObserverRef.current = null;
    },
    []
  );

  return {
    activeIndex,
    isMeasured,
    itemRects,
    onMouseLeave,
    onMouseMove,
    registerItem,
  };
};
