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
import { getCanvasLayout } from "@/lib/canvas-layout";
import { initialItems } from "@/scenes/home-scene";
import {
  createMockCard,
  createMockCover,
  createMockFunStack,
  createMockSingle,
  createMockStack,
  createMockSwagStack,
} from "@/test-utils/test-helpers";
import type { CanvasItem, ViewportState } from "@/types/canvas";
import { Canvas } from "./canvas";

const transform = vi.hoisted(() => ({
  current: { positionX: 0, positionY: 0, scale: 1 },
  measureContent: undefined as
    | ((id: string, height: number) => void)
    | undefined,
  onPanningStop: undefined as
    | ((ref: { state: ViewportState }) => void)
    | undefined,
  onTransformed: undefined as
    | ((ref: { state: ViewportState }) => void)
    | undefined,
  lockAxisX: false as boolean | undefined,
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
    onTransform,
    onPanningStop,
    panning,
  }: {
    children: (controls: { resetTransform: () => void }) => ReactNode;
    ref: Ref<unknown>;
    onTransform: typeof transform.onTransformed;
    onPanningStop: typeof transform.onPanningStop;
    panning: { disabled: boolean; lockAxisX?: boolean };
  }) => {
    transform.onTransformed = onTransform;
    transform.onPanningStop = onPanningStop;
    transform.panDisabled = panning.disabled;
    transform.lockAxisX = panning.lockAxisX;
    useImperativeHandle(
      ref,
      () => ({
        instance: {
          get state() {
            return transform.current;
          },
        },
        setTransform: transform.setTransform,
        resetTransform: () => transform.setTransform(0, 0, 1),
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
    onContentLayoutMeasured,
  }: {
    item: CanvasItem;
    onActivate: (id: string) => void;
    onToggleExpanded: (id: string) => void;
    setRootRef: (id: string, element: HTMLDivElement | null) => void;
    isExpanded: boolean;
    isFocused: boolean;
    dragDisabled: boolean;
    onPositionUpdate: (id: string, position: { x: number; y: number }) => void;
    onContentLayoutMeasured: (id: string, height: number) => void;
  }) => {
    transform.measureContent = onContentLayoutMeasured;
    return (
      <div
        data-drag-disabled={dragDisabled}
        data-expanded={isExpanded}
        data-focused={isFocused}
        data-testid={item.id}
        // biome-ignore lint/performance/noJsxPropsBind: test double rendered once per case
        ref={(el) => setRootRef(item.id, el)}
      >
        <button
          // biome-ignore lint/performance/noJsxPropsBind: test double rendered once per case
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
          // biome-ignore lint/performance/noJsxPropsBind: test double rendered once per case
          onClick={() => onPositionUpdate(item.id, { x: 123, y: 456 })}
          type="button"
        >
          Move {item.id}
        </button>
      </div>
    );
  },
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
      // biome-ignore lint/performance/noJsxPropsBind: test double rendered once per case
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
vi.mock("@/components/articles/article-modal", () => ({
  ArticleModal: () => null,
}));

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(120);
  });
const changedViewport = { positionX: 200, positionY: -100, scale: 1 };
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
  transform.current = { positionX: 0, positionY: 0, scale: 1 };
  transform.setTransform.mockImplementation(
    (positionX: number, positionY: number, scale: number) => {
      transform.current = { positionX, positionY, scale };
      transform.onTransformed?.({ state: transform.current });
    }
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Canvas interaction contracts", () => {
  it("cancels a measured correction queued just before pointer input", () => {
    render(<Canvas initialItems={[createMockFunStack("fun", 1400, 500)]} />);
    fireEvent.click(screen.getByText("fun"));
    settle();
    const original = { ...transform.current };
    act(() => transform.measureContent?.("fun", 1800));
    fireEvent.pointerDown(screen.getByText("fun"));
    settle();
    expect(transform.current).toEqual(original);
  });

  it("preserves the return position when only measured bounds require panning", () => {
    render(<Canvas initialItems={[createMockFunStack("fun", 40, 40)]} />);
    fireEvent.click(screen.getByText("fun"));
    settle();
    expect(transform.setTransform).not.toHaveBeenCalled();
    act(() => transform.measureContent?.("fun", 1800));
    settle();
    expect(transform.current.positionY).toBe(0);
    expect(transform.setTransform).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: "Escape" });
    settle();
    expect(transform.current).toEqual({
      positionX: 0,
      positionY: 0,
      scale: 1,
    });
  });

  it("refines measured fun content once and restores the original viewport", () => {
    render(<Canvas initialItems={[createMockFunStack("fun", 1400, 500)]} />);
    fireEvent.click(screen.getByText("fun"));
    settle();
    const estimated = { ...transform.current };
    act(() => transform.measureContent?.("fun", 1800));
    settle();
    expect(transform.current.positionY).toBe(40 - 500);
    expect(transform.current.positionY).not.toBe(estimated.positionY);
    const calls = transform.setTransform.mock.calls.length;
    act(() => transform.measureContent?.("fun", 2400));
    settle();
    expect(transform.setTransform).toHaveBeenCalledTimes(calls);
    fireEvent.keyDown(document, { key: "Escape" });
    settle();
    expect(transform.current).toEqual({
      positionX: 0,
      positionY: 0,
      scale: 1,
    });
  });

  it.each(["wheel", "pointer", "resize", "reset", "close", "switch"])(
    "does not steal the viewport after %s while layout is pending",
    (intent) => {
      render(
        <Canvas
          initialItems={[createMockFunStack("fun", 1400, 500), stack()]}
        />
      );
      fireEvent.click(screen.getByText("fun"));
      settle();
      switch (intent) {
        case "wheel":
          fireEvent.wheel(screen.getByText("fun"), { deltaY: 120 });
          break;
        case "pointer":
          fireEvent.pointerDown(screen.getByText("fun"));
          break;
        case "resize":
          fireEvent(window, new Event("resize"));
          break;
        case "reset":
          fireEvent.click(screen.getByText("Reset canvas"));
          break;
        case "close":
          fireEvent.keyDown(document, { key: "Escape" });
          break;
        case "switch":
          fireEvent.click(screen.getByText("stack"));
          break;
        default:
          throw new Error("Unexpected intent");
      }
      settle();
      const position = { ...transform.current };
      const calls = transform.setTransform.mock.calls.length;
      act(() => transform.measureContent?.("fun", 1800));
      settle();
      expect(transform.current).toEqual(position);
      expect(transform.setTransform).toHaveBeenCalledTimes(calls);
    }
  );

  it("normalizes wheel units and commits the resulting position", () => {
    render(<Canvas initialItems={[stack()]} />);
    fireEvent.wheel(screen.getByText("stack"), {
      deltaMode: 1,
      deltaX: 2,
      deltaY: 3,
    });
    expect(transform.current).toEqual({
      positionX: -32,
      positionY: -48,
      scale: 1,
    });
    fireEvent.wheel(screen.getByText("stack"), {
      deltaMode: 2,
      deltaX: 1,
      deltaY: 1,
    });
    expect(transform.current.positionY).toBe(-48 - window.innerHeight);
    fireEvent.wheel(screen.getByText("stack"), {
      deltaMode: 0,
      deltaX: 10,
      deltaY: 15,
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
      clientX: 10,
      clientY: 10,
      pointerId: 1,
    });
    fireEvent.pointerCancel(document.body, { pointerId: 1 });
    fireEvent.pointerUp(document.body, {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
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
      clientX: 10,
      clientY: 10,
      pointerId: 1,
    });
    fireEvent.pointerUp(screen.getByText("stack"), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
    });
    expect(screen.getByTestId("stack").dataset.expanded).toBe("true");
    fireEvent.pointerDown(document.body, {
      button: 0,
      clientX: 10,
      clientY: 10,
      pointerId: 1,
    });
    fireEvent.pointerMove(document.body, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerUp(document.body, {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
    });
    expect(screen.getByTestId("stack").dataset.expanded).toBe("true");
    fireEvent.pointerDown(document.body, {
      button: 0,
      clientX: 10,
      clientY: 10,
      pointerId: 1,
    });
    fireEvent.pointerUp(document.body, {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
    });
    expect(screen.getByTestId("stack").dataset.expanded).toBe("false");
  });

  it.each(["about", "resume"] as const)(
    "locks panning and background interactions for %s",
    (kind) => {
      const item =
        kind === "resume"
          ? createMockSingle("document")
          : createMockSingle("document", 0, 0, 1, {
              content: {},
              id: "about",
              kind: "about",
              size: { height: 100, width: 100 },
            });
      render(<Canvas initialItems={[item, stack()]} />);
      fireEvent.click(screen.getByText("document"));
      expect(transform.panDisabled).toBe(true);
      expect(screen.getByTestId("stack").dataset.dragDisabled).toBe("true");
      fireEvent.click(screen.getByText("stack"));
      expect(screen.getByTestId("stack").dataset.expanded).toBe("false");
      fireEvent.click(screen.getByText(`Close ${kind}`));
      expect(transform.panDisabled).toBe(false);
    }
  );

  it("clears pending auto-pan and return positions when resetting", () => {
    render(<Canvas initialItems={[stack()]} />);
    pan();
    fireEvent.click(screen.getByText("stack"));
    fireEvent.click(screen.getByText("Reset canvas"));
    settle();
    fireEvent.keyDown(window, { key: "Escape" });
    settle();
    expect(transform.current).toEqual({ positionX: 0, positionY: 0, scale: 1 });
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
  describe("Canvas on touch screens", () => {
    const originalMatchMedia = window.matchMedia;
    beforeEach(() => {
      window.matchMedia = vi.fn(() => ({
        addEventListener: vi.fn(),
        matches: true,
        removeEventListener: vi.fn(),
      })) as unknown as typeof window.matchMedia;
    });
    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    it("offers a close button, since touch has no Escape key", () => {
      render(<Canvas initialItems={[stack()]} />);
      expect(screen.queryByText("Close")).toBeNull();
      pan();
      fireEvent.click(screen.getByText("stack"));
      settle();
      expect(screen.getByTestId("stack").dataset.expanded).toBe("true");
      fireEvent.click(screen.getByText("Close"));
      settle();
      expect(screen.getByTestId("stack").dataset.expanded).toBe("false");
      // The camera returns to where the visitor left it.
      expect(transform.current).toEqual(changedViewport);
    });

    it("keeps cards from being dragged so swipes always pan", () => {
      render(<Canvas initialItems={[stack()]} />);
      expect(screen.getByTestId("stack").dataset.dragDisabled).toBe("true");
    });

    it("lets a mouse drag cards", () => {
      window.matchMedia = vi.fn(() => ({
        addEventListener: vi.fn(),
        matches: false,
        removeEventListener: vi.fn(),
      })) as unknown as typeof window.matchMedia;
      render(<Canvas initialItems={[stack()]} />);
      expect(screen.getByTestId("stack").dataset.dragDisabled).toBe("false");
    });

    it("pans vertically only in the single-column layout, except around the focused laptop", () => {
      const macbook = initialItems.find(
        (item) => item.kind === "single" && item.card.kind === "macbook"
      );
      if (!macbook) {
        throw new Error("Missing macbook scene fixture");
      }
      render(
        <Canvas
          initialItems={[macbook, stack()]}
          layout={getCanvasLayout(390)}
        />
      );
      expect(transform.lockAxisX).toBe(true);
      fireEvent.click(screen.getByText("stack"));
      expect(transform.lockAxisX).toBe(true);
      fireEvent.keyDown(window, { key: "Escape" });
      settle();
      fireEvent.click(screen.getByText(macbook.id));
      expect(transform.lockAxisX).toBe(false);
    });

    it("ignores sideways wheel and trackpad movement in the single-column layout", () => {
      render(<Canvas initialItems={[stack()]} layout={getCanvasLayout(390)} />);
      fireEvent.wheel(screen.getByText("stack"), { deltaX: 40, deltaY: 25 });
      expect(transform.current.positionX).toBe(0);
      expect(transform.current.positionY).toBe(-25);
    });

    it("stops scrolling at the end of the single column instead of into empty canvas", () => {
      render(<Canvas initialItems={[stack()]} layout={getCanvasLayout(390)} />);
      fireEvent.wheel(screen.getByText("stack"), { deltaY: 5000 });
      // The folder is 100px tall at y=800; the end margin is 48px.
      expect(transform.current.positionY).toBe(window.innerHeight - 48 - 900);
      fireEvent.wheel(screen.getByText("stack"), { deltaY: -9000 });
      expect(transform.current.positionY).toBe(0);
    });

    it("keeps an opened folder scrollable only across its own cards", () => {
      const folder = createMockStack(
        "stack",
        80,
        1000,
        1,
        createMockCover("cover", 240, 340),
        Array.from({ length: 6 }, (_, index) =>
          createMockCard(`card-${index}`, 350, 400)
        )
      );
      render(<Canvas initialItems={[folder]} layout={getCanvasLayout(390)} />);
      fireEvent.click(screen.getByText("stack"));
      settle();
      const revealed = transform.current.positionY;
      fireEvent.wheel(screen.getByText("stack"), { deltaY: -9000 });
      // Already at the top of the list: nothing above to scroll to.
      expect(transform.current.positionY).toBe(revealed);
      fireEvent.wheel(screen.getByText("stack"), { deltaY: 90_000 });
      expect(transform.current.positionY).toBeLessThan(revealed - 1000);
      expect(transform.current.positionY).toBeGreaterThan(
        -1000 - 6 * 420 - 100
      );
    });

    it("keeps free two-axis panning on the desktop layout", () => {
      render(<Canvas initialItems={[stack()]} />);
      expect(transform.lockAxisX).toBe(false);
      fireEvent.wheel(screen.getByText("stack"), { deltaX: 40, deltaY: 25 });
      expect(transform.current.positionX).toBe(-40);
    });

    it("does not render the close button for a mouse", () => {
      window.matchMedia = vi.fn(() => ({
        addEventListener: vi.fn(),
        matches: false,
        removeEventListener: vi.fn(),
      })) as unknown as typeof window.matchMedia;
      render(<Canvas initialItems={[stack()]} />);
      fireEvent.click(screen.getByText("stack"));
      expect(screen.queryByText("Close")).toBeNull();
    });

    it("slides the camera onto an opened folder with the compact layout", () => {
      const item = createMockStack(
        "stack",
        80,
        200,
        1,
        createMockCover("cover", 240, 340),
        [createMockCard("a", 350, 400)]
      );
      const layout = getCanvasLayout(390);
      render(<Canvas initialItems={[item]} layout={layout} />);
      fireEvent.click(screen.getByText("stack"));
      settle();
      const cardLeft = 80 + 240 + 18;
      // The cover slides out of view and the 350px card is centered.
      expect(
        Math.abs(
          transform.current.positionX + cardLeft - (window.innerWidth - 350) / 2
        )
      ).toBeLessThan(2);
      expect(transform.current.positionY + 200).toBeLessThan(
        layout.autoPanMargin + 1
      );
    });
  });
});
