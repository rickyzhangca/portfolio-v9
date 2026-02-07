import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CanvasItem } from "@/types/canvas";
import {
  useArePositionsModified,
  useViewportConfig,
} from "./use-viewport-config";

describe("useViewportConfig", () => {
  it("returns effective repulsion config based on base config", () => {
    const { result } = renderHook(() =>
      useViewportConfig({
        viewportDimensions: { width: 1920, height: 1080 },
        baseRepulsionConfig: { radiusPx: 200, strengthPx: 50 },
      })
    );

    expect(result.current.effectiveRepulsionConfig.radiusPx).toBeGreaterThan(
      200
    );
    expect(result.current.effectiveRepulsionConfig.strengthPx).toBeGreaterThan(
      50
    );
  });

  it("uses the larger of base or modal config values", () => {
    const { result } = renderHook(() =>
      useViewportConfig({
        viewportDimensions: { width: 500, height: 500 },
        baseRepulsionConfig: { radiusPx: 2000, strengthPx: 500 },
      })
    );

    expect(result.current.effectiveRepulsionConfig.radiusPx).toBe(2000);
    expect(result.current.effectiveRepulsionConfig.strengthPx).toBe(500);
  });
});

describe("useArePositionsModified", () => {
  const initialItems: CanvasItem[] = [
    {
      id: "item-1",
      kind: "single",
      position: { x: 100, y: 200 },
      zIndex: 1,
      card: {
        id: "card-1",
        kind: "email",
        size: {},
        content: { link: { label: "test", url: "mailto:test@test.com" } },
      },
    },
  ];

  it("returns false when positions match initial", () => {
    const currentItems = new Map([
      [
        "item-1",
        {
          ...initialItems[0],
        },
      ],
    ]);

    const { result } = renderHook(() =>
      useArePositionsModified(currentItems, initialItems)
    );

    expect(result.current).toBe(false);
  });

  it("returns true when positions differ", () => {
    const currentItems = new Map([
      [
        "item-1",
        {
          ...initialItems[0],
          position: { x: 150, y: 250 },
        },
      ],
    ]);

    const { result } = renderHook(() =>
      useArePositionsModified(currentItems, initialItems)
    );

    expect(result.current).toBe(true);
  });

  it("returns true when items are added", () => {
    const currentItems = new Map([
      [
        "item-1",
        {
          ...initialItems[0],
        },
      ],
      [
        "item-2",
        {
          id: "item-2",
          kind: "single",
          position: { x: 300, y: 400 },
          zIndex: 2,
          card: {
            id: "card-2",
            kind: "socials",
            size: {},
            content: { linkedinUrl: "", twitterUrl: "" },
          },
        },
      ],
    ]);

    const { result } = renderHook(() =>
      useArePositionsModified(currentItems, initialItems)
    );

    expect(result.current).toBe(true);
  });
});
