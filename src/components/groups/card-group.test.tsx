import { act, render } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { describe, expect, it, vi } from "vitest";
import { getCardShadowStyle } from "@/lib/card-shadow";
import { shadowDebugConfigAtom } from "@/context/atoms";
import { getShadowLighting } from "@/lib/shadow-lighting";
import { createMockCard, createMockStack } from "@/test-utils/test-helpers";
import { CardStack } from "./card-group";

const baseProps = {
  stackIndex: 0,
  maxZIndex: 10,
  scale: 1,
  isExpanded: false,
  dragDisabled: false,
  repulsionOffset: { x: 0, y: 0 },
  onBringToFront: vi.fn(),
  onToggleExpanded: vi.fn(),
  onPositionUpdate: vi.fn(),
};

describe("CardStack", () => {
  it("updates the cover shadow filter when lighting changes", () => {
    const stack = createMockStack("stack-1", 0, 0, 5, undefined, [
      createMockCard("project-1"),
    ]);
    const store = createStore();
    store.set(shadowDebugConfigAtom, {
      mode: "debug",
      debugHour: 8,
    });

    const { container } = render(
      <Provider store={store}>
        <CardStack {...baseProps} stack={stack} />
      </Provider>
    );

    const shadowWrappers = container.querySelectorAll(".transition-\\[filter\\]");
    const coverShadow = shadowWrappers[0] as HTMLDivElement | undefined;
    expect(coverShadow).toBeDefined();

    const morningShadow = coverShadow?.style.filter;

    act(() => {
      store.set(shadowDebugConfigAtom, {
        mode: "debug",
        debugHour: 16,
      });
    });

    expect(coverShadow?.style.filter).not.toBe(morningShadow);
  });

  it("uses the shared silhouette shadow for stack covers", () => {
    const stack = createMockStack("stack-1", 0, 0, 5, undefined, [
      createMockCard("project-1"),
    ]);
    const store = createStore();
    store.set(shadowDebugConfigAtom, {
      mode: "debug",
      debugHour: 12,
    });

    const { container } = render(
      <Provider store={store}>
        <CardStack {...baseProps} stack={stack} />
      </Provider>
    );

    const shadowWrappers = container.querySelectorAll(".transition-\\[filter\\]");
    const coverShadow = shadowWrappers[0] as HTMLDivElement | undefined;

    expect(coverShadow?.style.filter).toBe(
      getCardShadowStyle({
        surface: "canvas-filter",
        role: "silhouette",
        state: "rest",
        zIndex: 5,
        maxZIndex: 10,
        lighting: getShadowLighting(12, "debug"),
      }).filter
    );
  });
});
