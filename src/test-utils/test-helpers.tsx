import { render } from "@testing-library/react";
import { vi } from "vitest";
import type {
  CanvasSingleItem,
  CanvasStackItem,
  CardData,
} from "@/types/canvas";
import { MockProvider } from "./mock-provider";

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

export const createMockStack = (
  id: string,
  x = 0,
  y = 0,
  zIndex = 1,
  cover?: CardData,
  stack?: CardData[]
): CanvasStackItem => ({
  id,
  kind: "stack",
  position: { x, y },
  zIndex,
  cover:
    cover ??
    ({
      id: `${id}-cover`,
      type: "cover",
      size: { width: 100, height: 100 },
      content: { company: "Test Company", image: "" },
    } satisfies CardData),
  stack: stack ?? [],
});

export const createMockSingle = (
  id: string,
  x = 0,
  y = 0,
  zIndex = 1,
  card?: CardData
): CanvasSingleItem => ({
  id,
  kind: "single",
  position: { x, y },
  zIndex,
  card:
    card ??
    ({
      id: `${id}-card`,
      type: "doc",
      size: { width: 100, height: 100 },
      content: { docType: "resume" },
    } satisfies CardData),
});

// Alias for backward compatibility
export const createMockGroup = createMockStack;

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
    stopPropagation: vi.fn(),
    preventDefault: vi.fn(),
  }) as unknown as React.MouseEvent;

export const createMockTouchEvent = (
  touches: Array<{ clientX: number; clientY: number }>
) =>
  ({
    touches,
    target: { closest: () => null },
    stopPropagation: vi.fn(),
  }) as unknown as React.TouchEvent;

export const renderWithProviders = (ui: React.ReactNode) => {
  return render(<MockProvider>{ui}</MockProvider>);
};
