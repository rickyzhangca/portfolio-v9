import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockFunStack,
  createMockSingle,
  createMockStack,
  createMockSwagStack,
} from "@/test-utils/test-helpers";
import type { Position } from "@/types/canvas";
import type { SingleCardItem } from "./single-card-item";

const singleCardItemMock = vi.fn(
  (_: ComponentProps<typeof SingleCardItem>) => undefined
);
const funProjectGroupMock = vi.fn((_: unknown) => undefined);
const swagGroupMock = vi.fn((_: unknown) => undefined);
const cardStackMock = vi.fn((_: unknown) => undefined);

vi.mock("@/components/canvas/single-card-item", () => ({
  SingleCardItem: (props: ComponentProps<typeof SingleCardItem>) => {
    singleCardItemMock(props);
    return <div data-testid="single-card-item" />;
  },
}));

vi.mock("@/components/groups/card-group", () => ({
  CardStack: (props: unknown) => {
    cardStackMock(props);
    return <div data-testid="card-stack" />;
  },
}));

vi.mock("@/components/groups/fun-project-group", () => ({
  FunProjectGroup: (props: unknown) => {
    funProjectGroupMock(props);
    return <div data-testid="fun-project-group" />;
  },
}));

vi.mock("@/components/groups/swag-group", () => ({
  SwagGroup: (props: unknown) => {
    swagGroupMock(props);
    return <div data-testid="swag-group" />;
  },
}));

import { CanvasItemRenderer } from "./canvas-item";

const baseProps = {
  dragDisabled: false,
  isExpanded: true,
  isFocused: false,
  itemIndex: 2,
  onActivate: vi.fn(),
  onBringToFront: vi.fn(),
  onCardHeightMeasured: vi.fn(),
  onDragEnd: vi.fn(),
  onDragStart: vi.fn(),
  onPositionUpdate: vi.fn(),
  onToggleExpanded: vi.fn(),
  repulsionOffset: { x: 12, y: -8 } satisfies Position,
  scale: 1.5,
  setRootRef: vi.fn(),
};

describe("CanvasItemRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("binds item IDs without retaining old handlers across rerenders", () => {
    const item = createMockSingle("single");
    const { rerender } = render(
      <CanvasItemRenderer {...baseProps} item={item} />
    );
    const child = singleCardItemMock.mock.lastCall?.[0];
    expect(child).toBeDefined();
    child?.onActivate?.();
    child?.onBringToFront();
    child?.onPositionUpdate({ x: 20, y: 30 });
    child?.onCardHeightMeasured?.("card", 240);
    const element = document.createElement("div");
    child?.setRootRef?.(element);
    expect(baseProps.onActivate).toHaveBeenCalledWith(
      "single",
      undefined,
      undefined
    );
    expect(baseProps.onBringToFront).toHaveBeenCalledWith("single");
    expect(baseProps.onPositionUpdate).toHaveBeenCalledWith("single", {
      x: 20,
      y: 30,
    });
    expect(baseProps.onCardHeightMeasured).toHaveBeenCalledWith(
      "single",
      "card",
      240
    );
    expect(baseProps.setRootRef).toHaveBeenCalledWith("single", element);
    const updated = vi.fn();
    rerender(
      <CanvasItemRenderer {...baseProps} item={item} onActivate={updated} />
    );
    singleCardItemMock.mock.lastCall?.[0].onActivate?.();
    expect(updated).toHaveBeenCalledWith("single", undefined, undefined);
    expect(baseProps.onActivate).toHaveBeenCalledTimes(1);
  });

  it("renders a single item with activation props", () => {
    const item = createMockSingle("single-1");

    render(<CanvasItemRenderer {...baseProps} item={item} />);

    expect(screen.getByTestId("single-card-item")).toBeDefined();
    expect(singleCardItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isFocused: baseProps.isFocused,
        item,
        onActivate: expect.any(Function),
        scale: baseProps.scale,
        setRootRef: expect.any(Function),
      })
    );
  });

  it("renders a fun stack with expansion props", () => {
    const item = createMockFunStack("fun-1");

    render(<CanvasItemRenderer {...baseProps} item={item} />);

    expect(screen.getByTestId("fun-project-group")).toBeDefined();
    expect(funProjectGroupMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isExpanded: baseProps.isExpanded,
        item,
        onToggleExpanded: expect.any(Function),
        repulsionOffset: baseProps.repulsionOffset,
      })
    );
  });

  it("renders a swag stack with the stack index", () => {
    const item = createMockSwagStack("swag-1");

    render(<CanvasItemRenderer {...baseProps} item={item} />);

    expect(screen.getByTestId("swag-group")).toBeDefined();
    expect(swagGroupMock).toHaveBeenCalledWith(
      expect.objectContaining({
        item,
        onToggleExpanded: expect.any(Function),
        stackIndex: baseProps.itemIndex,
      })
    );
  });

  it("renders a card stack for stack items", () => {
    const item = createMockStack("stack-1");
    const cardRepulsionOffsets = new Map([["cover", { x: -40, y: 8 }]]);

    render(
      <CanvasItemRenderer
        {...baseProps}
        cardRepulsionOffsets={cardRepulsionOffsets}
        item={item}
      />
    );

    expect(screen.getByTestId("card-stack")).toBeDefined();
    expect(cardStackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cardRepulsionOffsets,
        onCardHeightMeasured: expect.any(Function),
        stack: item,
        stackIndex: baseProps.itemIndex,
      })
    );
  });
});
