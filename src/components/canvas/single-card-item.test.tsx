import { act, render } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { describe, expect, it, vi } from "vitest";
import { shadowDebugConfigAtom } from "@/context/atoms";
import { createMockSingle } from "@/test-utils/test-helpers";
import { SingleCardItem } from "./single-card-item";

const baseProps = {
  maxZIndex: 10,
  scale: 1,
  isFocused: false,
  dragDisabled: false,
  repulsionOffset: { x: 0, y: 0 },
  onBringToFront: vi.fn(),
  onPositionUpdate: vi.fn(),
};

describe("SingleCardItem", () => {
  it("updates canvas shadow filter when lighting changes", () => {
    const item = createMockSingle("single-1", 0, 0, 5);
    const store = createStore();
    store.set(shadowDebugConfigAtom, {
      mode: "debug",
      debugHour: 8,
    });

    const { container } = render(
      <Provider store={store}>
        <SingleCardItem {...baseProps} item={item} />
      </Provider>
    );

    const shadowWrapper = container.querySelector(
      ".transition-\\[filter\\]"
    ) as HTMLDivElement | null;
    expect(shadowWrapper).not.toBeNull();

    const morningShadow = shadowWrapper?.style.filter;

    act(() => {
      store.set(shadowDebugConfigAtom, {
        mode: "debug",
        debugHour: 16,
      });
    });

    expect(shadowWrapper?.style.filter).not.toBe(morningShadow);
  });
});
