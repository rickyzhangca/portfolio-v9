import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { type ReactNode, type Ref, useImperativeHandle } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fanConfigAtom } from "@/context/atoms";
import { getAutoPanTarget, getSwagStackAutoPanTarget } from "@/lib/auto-pan";
import { initialItems } from "@/scenes/home-scene";
import {
  createMockCard,
  createMockFunStack,
  createMockSingle,
  createMockStack,
  createMockSwagStack,
} from "@/test-utils/test-helpers";
import type { CanvasItem, ViewportState } from "@/types/canvas";
import { Canvas } from "./canvas";

const transform = vi.hoisted(() => ({
  current: { scale: 1, positionX: 0, positionY: 0 },
  onTransformed: undefined as
    | ((ref: { state: ViewportState }) => void)
    | undefined,
  onPanningStop: undefined as
    | ((ref: { state: ViewportState }) => void)
    | undefined,
  panDisabled: false,
  setTransform: vi.fn(),
}));

vi.mock("react-zoom-pan-pinch", () => ({
  TransformComponent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  TransformWrapper: ({
    children,
    ref,
    onTransformed,
    onPanningStop,
    panning,
  }: {
    children: (controls: { resetTransform: () => void }) => ReactNode;
    ref: Ref<unknown>;
    onTransformed: typeof transform.onTransformed;
    onPanningStop: typeof transform.onPanningStop;
    panning: { disabled: boolean };
  }) => {
    transform.onTransformed = onTransformed;
    transform.onPanningStop = onPanningStop;
    transform.panDisabled = panning.disabled;
    useImperativeHandle(
      ref,
      () => ({
        instance: {
          get transformState() {
            return transform.current;
          },
        },
        setTransform: transform.setTransform,
      }),
      []
    );
    return children({ resetTransform: () => transform.setTransform(0, 0, 1) });
  },
}));
vi.mock("@/lib/auto-pan", async (original) => {
  const actual = await original<typeof import("@/lib/auto-pan")>();
  return {
    ...actual,
    getAutoPanTarget: vi.fn(actual.getAutoPanTarget),
    getSwagStackAutoPanTarget: vi.fn(actual.getSwagStackAutoPanTarget),
  };
});
vi.mock("./canvas-item", () => ({
  CanvasItemRenderer: ({
    item,
    onActivate,
    onToggleExpanded,
    setRootRef,
    isExpanded,
    isFocused,
    dragDisabled,
    onPositionUpdate,
  }: {
    item: CanvasItem;
    onActivate: (id: string) => void;
    onToggleExpanded: (id: string) => void;
    setRootRef: (id: string, element: HTMLDivElement | null) => void;
    isExpanded: boolean;
    isFocused: boolean;
    dragDisabled: boolean;
    onPositionUpdate: (id: string, position: { x: number; y: number }) => void;
  }) => (
    <div
      data-drag-disabled={dragDisabled}
      data-expanded={isExpanded}
      data-focused={isFocused}
      data-testid={item.id}
      ref={(el) => setRootRef(item.id, el)}
    >
      <button
        onClick={() =>
          item.kind === "single"
            ? onActivate(item.id)
            : onToggleExpanded(item.id)
        }
        type="button"
      >
        {item.id}
      </button>
      <button
        onClick={() => onPositionUpdate(item.id, { x: 123, y: 456 })}
        type="button"
      >
        Move {item.id}
      </button>
    </div>
  ),
}));
vi.mock("./canvas-controls", () => ({
  CanvasControls: ({
    onReset,
    onResetPositions,
    isResetDisabled,
  }: {
    onReset: () => void;
    onResetPositions: () => void;
    isResetDisabled: boolean;
  }) => (
    <button
      data-no-collapse
      disabled={isResetDisabled}
      onClick={() => {
        onReset();
        onResetPositions();
      }}
      type="button"
    >
      Reset canvas
    </button>
  ),
}));
vi.mock("@/components/about/about-modal", () => ({
  AboutModal: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) =>
    isOpen ? (
      <button onClick={onClose} type="button">
        Close about
      </button>
    ) : null,
}));
vi.mock("@/components/resume/resume-modal", () => ({
  ResumeModal: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) =>
    isOpen ? (
      <button onClick={onClose} type="button">
        Close resume
      </button>
    ) : null,
}));

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(120);
  });
const changedViewport = { scale: 1, positionX: 200, positionY: -100 };
const pan = () =>
  act(() => {
    transform.current = changedViewport;
    transform.onPanningStop?.({ state: changedViewport });
  });
const stack = () =>
  createMockStack("stack", 1800, 800, 1, undefined, [
    createMockCard("project"),
  ]);

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  transform.current = { scale: 1, positionX: 0, positionY: 0 };
  transform.setTransform.mockImplementation(
    (positionX: number, positionY: number, scale: number) => {
      transform.current = { scale, positionX, positionY };
      transform.onTransformed?.({ state: transform.current });
    }
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Canvas interaction contracts", () => {
  it("normalizes wheel units and commits the resulting position", () => {
    render(<Canvas initialItems={[stack()]} />);
    fireEvent.wheel(screen.getByText("stack"), {
      deltaX: 2,
      deltaY: 3,
      deltaMode: 1,
    });
    expect(transform.current).toEqual({
      positionX: -32,
      positionY: -48,
      scale: 1,
    });
    fireEvent.wheel(screen.getByText("stack"), {
      deltaX: 1,
      deltaY: 1,
      deltaMode: 2,
    });
    expect(transform.current.positionY).toBe(-48 - window.innerHeight);
    fireEvent.wheel(screen.getByText("stack"), {
      deltaX: 10,
      deltaY: 15,
      deltaMode: 0,
    });
    expect(transform.current.positionX).toBe(-32 - window.innerWidth - 10);
    settle();
    expect(screen.getByText("Reset canvas").hasAttribute("disabled")).toBe(
      false
    );
  });

  it("locks canvas wheel gestures while leaving normal modal scrolling alone", () => {
    render(<Canvas initialItems={[createMockSingle("resume")]} />);
    fireEvent.click(screen.getByText("resume"));
    const wheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: 10,
    });
    // happy-dom's WheelEvent does not populate modifier keys from its initializer.
    Object.defineProperty(wheel, "ctrlKey", { value: true });
    expect(fireEvent(screen.getByText("Close resume"), wheel)).toBe(false);
    expect(
      fireEvent.wheel(screen.getByText("Close resume"), { deltaY: 10 })
    ).toBe(true);
    expect(transform.setTransform).not.toHaveBeenCalled();
  });

  it("restores focused cards and keeps Escape priority on expanded stacks", () => {
    const macbook = initialItems.find(
      (item) => item.kind === "single" && item.card.kind === "macbook"
    );
    if (!macbook) {
      throw new Error("Missing macbook scene fixture");
    }
    const fun = createMockFunStack("fun", 1800, 1000);
    render(<Canvas initialItems={[macbook, fun]} />);
    pan();
    fireEvent.click(screen.getByText(macbook.id));
    settle();
    expect(screen.getByTestId(macbook.id).dataset.focused).toBe("true");
    fireEvent.click(screen.getByText("fun"));
    settle();
    expect(screen.getByTestId("fun").dataset.expanded).toBe("true");
    fireEvent.keyDown(window, { key: "Escape" });
    settle();
    expect(screen.getByTestId("fun").dataset.expanded).toBe("false");
    expect(screen.getByTestId(macbook.id).dataset.focused).toBe("true");
    fireEvent.keyDown(window, { key: "Escape" });
    settle();
    expect(screen.getByTestId(macbook.id).dataset.focused).toBe("false");
    expect(transform.current).toEqual(changedViewport);
    fireEvent.click(screen.getByText(macbook.id));
    settle();
    fireEvent.click(screen.getByText(macbook.id));
    settle();
    expect(transform.current).toEqual(changedViewport);
  });
  it("uses the current fan configuration, including swag geometry", () => {
    const store = createStore();
    const swag = createMockSwagStack("swag", 1800, 800);
    render(
      <Provider store={store}>
        <Canvas initialItems={[stack(), swag]} />
      </Provider>
    );
    const nextConfig = { ...store.get(fanConfigAtom), expandGapPx: 50 };
    act(() => store.set(fanConfigAtom, nextConfig));
    fireEvent.click(screen.getByText("stack"));
    expect(vi.mocked(getAutoPanTarget).mock.calls.at(-1)?.[1]).toEqual(
      nextConfig
    );
    fireEvent.click(screen.getByText("swag"));
    expect(vi.mocked(getSwagStackAutoPanTarget).mock.calls.at(-1)?.[4]).toEqual(
      nextConfig
    );
  });

  it("commits imperative reset and momentum without a pointer stop event", () => {
    render(<Canvas initialItems={[stack()]} />);
    pan();
    expect(screen.getByText("Reset canvas").hasAttribute("disabled")).toBe(
      false
    );
    fireEvent.click(screen.getByText("Reset canvas"));
    settle();
    expect(screen.getByText("Reset canvas").hasAttribute("disabled")).toBe(
      true
    );
    act(() => transform.setTransform(90, 70, 1));
    settle();
    expect(screen.getByText("Reset canvas").hasAttribute("disabled")).toBe(
      false
    );
  });

  it("restores the viewport on Escape and ignores cancelled outside gestures", () => {
    render(<Canvas initialItems={[stack()]} />);
    pan();
    fireEvent.click(screen.getByText("stack"));
    settle();
    expect(screen.getByTestId("stack").dataset.expanded).toBe("true");
    fireEvent.pointerDown(document.body, {
      button: 0,
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerCancel(document.body, { pointerId: 1 });
    fireEvent.pointerUp(document.body, {
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
    expect(screen.getByTestId("stack").dataset.expanded).toBe("true");
    fireEvent.keyDown(window, { key: "Escape" });
    settle();
    expect(screen.getByTestId("stack").dataset.expanded).toBe("false");
    expect(transform.current).toEqual(changedViewport);
  });

  it("does not collapse on an inside click or a drag that returns to its start", () => {
    render(<Canvas initialItems={[stack()]} />);
    fireEvent.click(screen.getByText("stack"));
    fireEvent.pointerDown(screen.getByText("stack"), {
      button: 0,
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerUp(screen.getByText("stack"), {
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
    expect(screen.getByTestId("stack").dataset.expanded).toBe("true");
    fireEvent.pointerDown(document.body, {
      button: 0,
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(document.body, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerUp(document.body, {
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
    expect(screen.getByTestId("stack").dataset.expanded).toBe("true");
    fireEvent.pointerDown(document.body, {
      button: 0,
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerUp(document.body, {
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
    expect(screen.getByTestId("stack").dataset.expanded).toBe("false");
  });

  it.each([
    "about",
    "resume",
  ] as const)("locks panning and background interactions for %s", (kind) => {
    const item =
      kind === "resume"
        ? createMockSingle("document")
        : createMockSingle("document", 0, 0, 1, {
            id: "about",
            kind: "about",
            size: { width: 100, height: 100 },
            content: {},
          });
    render(<Canvas initialItems={[item, stack()]} />);
    fireEvent.click(screen.getByText("document"));
    expect(transform.panDisabled).toBe(true);
    expect(screen.getByTestId("stack").dataset.dragDisabled).toBe("true");
    fireEvent.click(screen.getByText("stack"));
    expect(screen.getByTestId("stack").dataset.expanded).toBe("false");
    fireEvent.click(screen.getByText(`Close ${kind}`));
    expect(transform.panDisabled).toBe(false);
  });

  it("clears pending auto-pan and return positions when resetting", () => {
    render(<Canvas initialItems={[stack()]} />);
    pan();
    fireEvent.click(screen.getByText("stack"));
    fireEvent.click(screen.getByText("Reset canvas"));
    settle();
    fireEvent.keyDown(window, { key: "Escape" });
    settle();
    expect(transform.current).toEqual({ scale: 1, positionX: 0, positionY: 0 });
  });

  it("keeps a mounted scene on parent rerender and cancels scheduled work on unmount", () => {
    const { rerender, unmount } = render(<Canvas initialItems={[stack()]} />);
    fireEvent.click(screen.getByText("Move stack"));
    rerender(<Canvas initialItems={[stack()]} />);
    expect(screen.getByText("Reset canvas").hasAttribute("disabled")).toBe(
      false
    );
    fireEvent.click(screen.getByText("stack"));
    unmount();
    settle();
    expect(transform.setTransform).not.toHaveBeenCalled();
  });
});
