import { describe, expect, it } from "vitest";
import { getCanvasLayout } from "@/lib/canvas-layout";
import { DEFAULT_FAN_CONFIG } from "@/lib/fan";
import {
  createMockCard,
  createMockCover,
  createMockStack,
  createMockSwagStack,
} from "@/test-utils/test-helpers";
import type { CanvasFunStackItem } from "@/types/canvas";
import {
  getAutoPanTarget,
  getFunStackAutoPanTarget,
  getSwagStackAutoPanTarget,
} from "./auto-pan";

describe("swag auto-pan uses rendered fan geometry", () => {
  it("centers the exact occupied columns, without a trailing gap", () => {
    const stack = createMockSwagStack("swag", 1800, 100);
    stack.swags = [{ src: "/swag.webp", label: "Swag" }];
    const fanConfig = {
      rotateStepDeg: 0,
      arcStepPx: 0,
      expandGapPx: 50,
      expandRowGapPx: 10,
    };
    const target = getSwagStackAutoPanTarget(
      stack,
      { scale: 1, positionX: 0, positionY: 0 },
      1000,
      800,
      fanConfig
    );
    // 100px cover + 50px gap + 180px image at 1.05x, 120px image height at 1.05x.
    expect(target).toEqual({
      x: 500 - (1800 + 339 / 2),
      y: 400 - (100 + 126 / 2),
      scale: 1,
    });
  });

  it("includes cover height even when there are no swag images", () => {
    const stack = createMockSwagStack("swag", 1800, 100);
    const target = getSwagStackAutoPanTarget(
      stack,
      { scale: 1, positionX: 0, positionY: 0 },
      1000,
      800
    );
    expect(target).toEqual({ x: -1350, y: 250, scale: 1 });
  });

  it("recomputes bounds after fan configuration changes and covers multiple rows", () => {
    const stack = createMockSwagStack("swag", 900, 700);
    stack.swags = Array.from({ length: 7 }, (_, i) => ({
      src: `/${i}.webp`,
      label: `${i}`,
    }));
    const viewport = { scale: 1, positionX: 0, positionY: 0 };
    const compact = getSwagStackAutoPanTarget(
      stack,
      viewport,
      2000,
      1500,
      DEFAULT_FAN_CONFIG
    );
    const wide = getSwagStackAutoPanTarget(stack, viewport, 2000, 1500, {
      ...DEFAULT_FAN_CONFIG,
      expandGapPx: 200,
      arcStepPx: 10,
    });
    expect(wide).not.toEqual(compact);
    expect(wide?.x).toBe(40 - stack.position.x);
  });
});

const createMockFunStack = (
  id: string,
  x: number,
  y: number,
  zIndex = 1,
  cardWidth = 240,
  cardHeight = 360,
  itemsCount = 8
): CanvasFunStackItem => ({
  id,
  kind: "funstack",
  position: { x, y },
  zIndex,
  card: {
    id: `${id}-card`,
    kind: "funproject",
    size: { width: cardWidth, height: cardHeight },
    content: {
      items: Array.from({ length: itemsCount }, (_, index) => ({
        icon: "x",
        title: `Item ${index}`,
        description: "Description",
        link: { url: "https://example.com" },
        status: "Active",
        image: "https://example.com/image.png",
      })),
    },
  },
});

describe("measured fun stack bounds", () => {
  it("uses actual content height instead of centering an underestimated list", () => {
    const item = createMockFunStack("fun", 1800, 500, 1, 240, 360, 2);
    const viewport = { scale: 1, positionX: 0, positionY: 0 };
    const estimate = getFunStackAutoPanTarget(item, viewport, 1440, 1000);
    const measured = getFunStackAutoPanTarget(item, viewport, 1440, 1000, 1600);
    expect(estimate?.y).toBe(-180);
    expect(measured).toEqual({
      x: 720 - (1800 + 944 / 2),
      y: 40 - 500,
      scale: 1,
    });
  });

  it("centers measured content on both axes when it fits at the current scale", () => {
    const item = createMockFunStack("fun", 1800, 500, 1, 240, 360, 2);
    expect(
      getFunStackAutoPanTarget(
        item,
        { scale: 0.5, positionX: 0, positionY: 0 },
        1000,
        800,
        600
      )
    ).toEqual({
      x: 500 - (1800 + 944 / 2) * 0.5,
      y: 400 - (500 + 600 / 2) * 0.5,
      scale: 0.5,
    });
  });

  it("does not reserve a nonexistent detail column for empty stacks", () => {
    const item = createMockFunStack("fun", 100, 100, 1, 240, 360, 0);
    expect(
      getFunStackAutoPanTarget(
        item,
        { scale: 1, positionX: 0, positionY: 0 },
        600,
        600,
        0
      )
    ).toBeNull();
  });
});

describe("getAutoPanTarget - content fits viewport", () => {
  it("returns null when expanded stack with cover and stack fits within viewport", () => {
    const cover = createMockCover("cover", 200, 300);
    const stack = [
      createMockCard("p1", 100, 150),
      createMockCard("p2", 100, 150),
    ];
    const stackItem = createMockStack("s1", 0, 0, 1, cover, stack);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).toBeNull();
  });

  it("returns null when content fits within viewport", () => {
    const cover = createMockCover("cover", 100, 100);
    const stackItem = createMockStack("s1", 400, 400, 1, cover, []);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).toBeNull();
  });

  it("returns null when content fits with small scale", () => {
    const cover = createMockCover("cover", 100, 100);
    const stackItem = createMockStack("s1", 100, 100, 1, cover, []);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 0.5, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).toBeNull();
  });

  it("returns null for empty stack", () => {
    const stackItem = createMockStack("s1", 0, 0);
    // createMockStack already has a cover, so we need to override
    stackItem.cover = {
      ...stackItem.cover,
      size: { width: 100, height: 100 },
    };

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).toBeNull();
  });
});

describe("getAutoPanTarget - content overflows viewport", () => {
  it("returns null when content fits within viewport with some margins", () => {
    const cover = createMockCover("cover", 500, 300);
    const stackItem = createMockStack("s1", 800, 100, 1, cover, []);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    // Content (500x300 at 800,100) fits within viewport (1920x1080)
    // The function returns null when no overflow occurs
    expect(result).toBeNull();
  });

  it("returns margin transform when content exceeds viewport horizontally", () => {
    const cover = createMockCover("cover", 2400, 300);
    const stackItem = createMockStack("s1", 0, 100, 1, cover, []);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).not.toBeNull();
    // Horizontal overflow triggers margin transform for X
    // Vertical fits, so uses centered transform for Y
    expect(result?.x).toBe(40);
    expect(result?.y).toBe(290);
  });

  it("returns transform accounting for rotated card bounding boxes", () => {
    const cover = createMockCover("cover", 200, 300);
    const project1 = createMockCard("p1", 400, 200);
    const project2 = createMockCard("p2", 400, 200);
    const project3 = createMockCard("p3", 400, 200);
    const stackItem = createMockStack("s1", 800, 500, 1, cover, [
      project1,
      project2,
      project3,
    ]);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).not.toBeNull();
  });

  it("handles large number of projects with fan arc offsets", () => {
    const cover = createMockCover("cover", 240, 340);
    const projects = Array.from({ length: 12 }, (_, i) =>
      createMockCard(`p${i}`, 420, 280)
    );
    const stackItem = createMockStack("s1", 0, 0, 1, cover, projects);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).not.toBeNull();
  });

  it("handles stacks positioned far from viewport origin", () => {
    const cover = createMockCover("cover", 200, 200);
    const stackItem = createMockStack("s1", 5000, 5000, 1, cover, []);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).not.toBeNull();
    // Should center on the stack, not the origin
    expect(result?.x).toBeCloseTo(1920 / 2 - 5000 - 200 / 2, 1);
  });

  it("handles large scale values when content fits", () => {
    const cover = createMockCover("cover", 300, 200);
    const stackItem = createMockStack("s1", 400, 300, 1, cover, []);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 2, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    // With scale 2, the content (300x200 at 400,300) becomes 600x400 on screen
    // The actual bounds in canvas coordinates: x=400-800, y=300-500
    // In screen coordinates: x=800-1600, y=600-1000
    // This still fits within the 1920x1080 viewport
    expect(result).toBeNull();
  });

  it("converts screen bounds to canvas coordinates with positive position", () => {
    const cover = createMockCover("cover", 300, 200);
    const stackItem = createMockStack("s1", 400, 300, 1, cover, []);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 200, positionY: 100 },
      1920,
      1080
    );

    // With positive viewport position (200, 100), the visible viewport in canvas coords is:
    // minX=-200, minY=-100, maxX=1720, maxY=980
    // Content at (400,300) with size (300,200) fits within these bounds
    // so auto-pan returns null
    expect(result).toBeNull();
  });

  it("returns null when content with projects fits within viewport", () => {
    const cover = createMockCover("cover", 200, 800);
    const projects = [createMockCard("p1", 300, 400)];
    const stackItem = createMockStack("s1", 500, 200, 1, cover, projects);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    // Content at (500, 200) with expanded bbox including both cover and project
    // This specific setup results in content that fits within the viewport
    expect(result).toBeNull();
  });

  it("returns null when content fits within viewport bounds", () => {
    const cover = createMockCover("cover", 1000, 200);
    const projects = [createMockCard("p1", 300, 300)];
    const stackItem = createMockStack("s1", 200, 400, 1, cover, projects);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    // Content at (200, 400) with expanded bbox
    // This specific setup results in content that fits within the viewport
    expect(result).toBeNull();
  });

  it("uses margin transform when content exceeds available space in both directions", () => {
    const cover = createMockCover("cover", 1800, 800);
    const stackItem = createMockStack("s1", 500, 400, 1, cover, []);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).not.toBeNull();
    // Both dimensions exceed viewport, so both use margin transform
    expect(result?.x).toBeCloseTo(-440, 5);
    expect(result?.y).toBeCloseTo(-260, 5);
  });
});

describe("getFunStackAutoPanTarget", () => {
  it("returns null when expanded fun stack content fits within viewport", () => {
    const funStack = createMockFunStack("f1", 100, 100, 1, 240, 360, 2);

    const result = getFunStackAutoPanTarget(
      funStack,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).toBeNull();
  });

  it("centers horizontally but uses margin vertically when content is too tall to center", () => {
    // 8 items => estimated list height 1072px (taller than 1080 - 2*margin).
    const funStack = createMockFunStack("f2", 1800, 800, 1, 240, 360, 8);

    const result = getFunStackAutoPanTarget(
      funStack,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).not.toBeNull();
    // Width fits, so X uses centering; height doesn't fit, so Y uses margin.
    // contentCenterX = groupX + (0 + 944) / 2 = 1800 + 472 = 2272
    expect(result?.x).toBe(1920 / 2 - 2272);
    expect(result?.y).toBe(40 - 800);
  });

  it("uses margin transform when zoomed in enough that content can't be centered", () => {
    const funStack = createMockFunStack("f3", 0, 0, 1, 240, 360, 1);

    const result = getFunStackAutoPanTarget(
      funStack,
      { scale: 4, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).not.toBeNull();
    expect(result?.x).toBe(40);
    expect(result?.y).toBe(40);
  });

  it("uses top-left margin when content is too wide to center, even if height could be centered", () => {
    const funStack = createMockFunStack("f4", 0, 400, 1, 240, 360, 1);

    const result = getFunStackAutoPanTarget(
      funStack,
      { scale: 1, positionX: 0, positionY: 0 },
      800,
      1080
    );

    expect(result).not.toBeNull();
    // Not enough horizontal space -> pin to top-left margin (both axes).
    expect(result?.x).toBe(40);
    expect(result?.y).toBe(40 - 400);
  });
});

describe("compact layout auto-pan", () => {
  const layout = getCanvasLayout(390);
  const viewport = { scale: 1, positionX: 0, positionY: 0 };

  it("slides a folder's cards to the margin, hiding the cover", () => {
    const stack = createMockStack(
      "stack",
      80,
      200,
      1,
      createMockCover("cover", 240, 340),
      [createMockCard("a", 350, 400), createMockCard("b", 350, 400)]
    );
    const target = getAutoPanTarget(
      stack,
      DEFAULT_FAN_CONFIG,
      viewport,
      390,
      664,
      0,
      layout
    );
    expect(target?.scale).toBe(1);
    // The first card (right of the 240px cover and the gap) is centered.
    const cardLeft = 80 + 240 + DEFAULT_FAN_CONFIG.expandGapPx;
    expect((target?.x ?? 0) + cardLeft).toBeGreaterThanOrEqual(
      layout.autoPanMargin
    );
    expect((target?.x ?? 0) + cardLeft).toBeLessThan(40);
    // The first card sits a few pixels below the stack origin on the fan arc.
    expect((target?.y ?? 0) + 200 + 3).toBe(layout.autoPanMargin);
  });

  it("pans even when the desktop layout would fit the screen", () => {
    const stack = createMockStack("stack", 0, 0, 1, undefined, [
      createMockCard("a", 100, 100),
    ]);
    expect(
      getAutoPanTarget(stack, DEFAULT_FAN_CONFIG, viewport, 5000, 5000)
    ).toBeNull();
    expect(
      getAutoPanTarget(
        stack,
        DEFAULT_FAN_CONFIG,
        viewport,
        5000,
        5000,
        0,
        layout
      )
    ).not.toBeNull();
  });

  it("left-aligns content wider than the screen at the margin", () => {
    const wide = createMockStack(
      "stack",
      100,
      100,
      1,
      createMockCover("cover", 100, 100),
      [createMockCard("a", 500, 100)]
    );
    const target = getAutoPanTarget(
      wide,
      DEFAULT_FAN_CONFIG,
      viewport,
      390,
      664,
      0,
      layout
    );
    const cardLeft = 100 + 100 + DEFAULT_FAN_CONFIG.expandGapPx;
    // Rotation swings the card's lower corner a pixel or so past its left edge.
    expect(
      Math.abs((target?.x ?? 0) + cardLeft - layout.autoPanMargin)
    ).toBeLessThan(2);
  });

  it("slides to the fun project descriptions", () => {
    const fun = {
      ...createMockFunStack("fun", 16, 3840),
    } as CanvasFunStackItem;
    fun.card = { ...fun.card, size: { width: 358 } };
    const target = getFunStackAutoPanTarget(
      fun,
      viewport,
      390,
      664,
      undefined,
      layout
    );
    // Content starts 24px right of the 358px card and is 358px wide.
    expect((target?.x ?? 0) + 16 + 358 + 24).toBeCloseTo(16, 0);
    expect((target?.y ?? 0) + 3840).toBe(layout.autoPanMargin);
  });

  it("slides to the swag grid instead of centering the cover with it", () => {
    const swag = createMockSwagStack("swag", 125, 4036);
    swag.swags = Array.from({ length: 6 }, (_, index) => ({
      label: `${index}`,
      src: `/${index}.webp`,
    }));
    const target = getSwagStackAutoPanTarget(
      swag,
      viewport,
      390,
      664,
      DEFAULT_FAN_CONFIG,
      layout
    );
    expect((target?.y ?? 0) + 4036).toBeLessThanOrEqual(layout.autoPanMargin);
    // The two columns end up on screen.
    const gridLeft =
      (target?.x ?? 0) + 125 + 100 + DEFAULT_FAN_CONFIG.expandGapPx;
    expect(gridLeft).toBeGreaterThanOrEqual(0);
    expect(gridLeft).toBeLessThan(80);
  });
});
