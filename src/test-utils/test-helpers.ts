import type { CardData, CardGroupData } from "@/types/canvas";

export const createMockCard = (
  id: string,
  width = 100,
  height = 100
): CardData => ({
  id,
  type: "project",
  size: { width, height },
  content: { title: "Test", description: "Test", image: "" },
});

export const createMockGroup = (
  id: string,
  x = 0,
  y = 0,
  zIndex = 1
): CardGroupData => ({
  id,
  position: { x, y },
  zIndex,
  cover: {
    id: "c",
    type: "company",
    size: { width: 100 },
    content: { company: "C", image: "" },
  },
  projects: [],
});

export const createMockMouseEvent = (
  _x: number,
  _y: number,
  clientX: number,
  clientY: number
) =>
  ({
    clientX,
    clientY,
    target: { closest: () => null },
    stopPropagation: () => {},
    preventDefault: () => {},
  }) as unknown as React.MouseEvent;

export const createMockTouchEvent = (
  touches: Array<{ clientX: number; clientY: number }>
) =>
  ({
    touches,
    target: { closest: () => null },
    stopPropagation: () => {},
  }) as unknown as React.TouchEvent;
