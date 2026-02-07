import { render } from "@testing-library/react";
import { vi } from "vitest";
import type {
  CardInstance,
  CoverCardInstance,
  FunProjectCardInstance,
  ProjectCardInstance,
  SwagCoverCardInstance,
} from "@/cards/types";
import type {
  CanvasFunStackItem,
  CanvasSingleItem,
  CanvasStackItem,
  CanvasSwagStackItem,
} from "@/types/canvas";
import { MockProvider } from "./mock-provider";

export const createMockCard = (
  id: string,
  width = 100,
  height = 100
): ProjectCardInstance => ({
  id,
  kind: "project",
  size: { width, height },
  content: { title: "Test", description: "Test", image: "" },
});

export const createMockCover = (
  id: string,
  width = 100,
  height = 100
): CoverCardInstance => ({
  id,
  kind: "cover",
  size: { width, height },
  content: { company: "Test Company", image: "" },
});

export const createMockStack = (
  id: string,
  x = 0,
  y = 0,
  zIndex = 1,
  cover?: CoverCardInstance,
  stack?: ProjectCardInstance[]
): CanvasStackItem => ({
  id,
  kind: "stack",
  position: { x, y },
  zIndex,
  cover:
    cover ??
    ({
      id: `${id}-cover`,
      kind: "cover",
      size: { width: 100, height: 100 },
      content: { company: "Test Company", image: "" },
    } satisfies CoverCardInstance),
  stack: stack ?? [],
});

export const createMockSingle = (
  id: string,
  x = 0,
  y = 0,
  zIndex = 1,
  card?: CardInstance
): CanvasSingleItem => ({
  id,
  kind: "single",
  position: { x, y },
  zIndex,
  card:
    card ??
    ({
      id: `${id}-card`,
      kind: "resume",
      size: { width: 100, height: 100 },
      content: {
        header: {
          name: "Test",
          website: "https://test.com",
          email: "test@test.com",
          phone: "+1 234 567 8900",
        },
        education: {
          logo: "/test.png",
          degree: "Test Degree",
          institution: "Test Institution",
          years: "2020-2024",
          description: "Test description",
        },
        experiences: [],
        skills: [],
      },
    } satisfies CardInstance),
});

// Alias for backward compatibility
export const createMockGroup = createMockStack;

export const createMockFunStack = (
  id: string,
  x = 0,
  y = 0,
  zIndex = 1,
  card?: FunProjectCardInstance
): CanvasFunStackItem => ({
  id,
  kind: "funstack",
  position: { x, y },
  zIndex,
  card:
    card ??
    ({
      id: `${id}-card`,
      kind: "funproject",
      size: { width: 100, height: 100 },
      content: {
        items: [
          {
            icon: "test-icon",
            title: "Test Project",
            description: "A test fun project",
            status: "Active",
          },
        ],
      },
    } satisfies FunProjectCardInstance),
});

export const createMockSwagStack = (
  id: string,
  x = 0,
  y = 0,
  zIndex = 1,
  cover?: SwagCoverCardInstance
): CanvasSwagStackItem => ({
  id,
  kind: "swagstack",
  position: { x, y },
  zIndex,
  cover:
    cover ??
    ({
      id: `${id}-cover`,
      kind: "swagcover",
      size: { width: 100, height: 100 },
      content: { content: "My Swag Collection", color: "yellow" },
    } satisfies SwagCoverCardInstance),
  swags: [],
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
