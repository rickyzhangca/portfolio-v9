import { describe, expect, it } from "vitest";
import { DEFAULT_FAN_CONFIG } from "@/lib/fan";
import {
  createMockCard,
  createMockStack,
} from "@/test-utils/test-helpers";
import { getAutoPanTarget } from "./auto-pan";

describe("getAutoPanTarget - content fits viewport", () => {
  it("returns null when expanded stack with cover and stack fits within viewport", () => {
    const cover = createMockCard("cover", 200, 300);
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
    const cover = createMockCard("cover", 100, 100);
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
    const cover = createMockCard("cover", 100, 100);
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
  it("returns centered transform when content can be centered", () => {
    const cover = createMockCard("cover", 500, 300);
    const stackItem = createMockStack("s1", 800, 100, 1, cover, []);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).not.toBeNull();
    // Should be centered in 1920x1080 viewport
    expect(result?.x).toBeCloseTo(1920 / 2 - 800 - 500 / 2, 0);
    expect(result?.y).toBeCloseTo(1080 / 2 - 100 - 300 / 2, 0);
  });

  it("returns margin transform when content exceeds viewport horizontally", () => {
    const cover = createMockCard("cover", 2400, 300);
    const stackItem = createMockStack("s1", 0, 100, 1, cover, []);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).not.toBeNull();
    // Should be at margin (40px) from left
    expect(result?.x).toBe(40 - 0);
    expect(result?.y).toBe(40 - 100);
  });

  it("returns transform accounting for rotated card bounding boxes", () => {
    const cover = createMockCard("cover", 200, 300);
    const project1 = createMockCard("p1", 400, 200);
    const project2 = createMockCard("p2", 400, 200);
    const project3 = createMockCard("p3", 400, 200);
    const stackItem = createMockStack(
      "s1",
      800,
      500,
      1,
      cover,
      [project1, project2, project3]
    );

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
    const cover = createMockCard("cover", 240, 340);
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
    const cover = createMockCard("cover", 200, 200);
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
    expect(result?.x).toBeCloseTo(1920 / 2 - 5000 - 200 / 2, 0);
  });

  it("handles large scale values", () => {
    const cover = createMockCard("cover", 300, 200);
    const stackItem = createMockStack("s1", 400, 300, 1, cover, []);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 2, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).not.toBeNull();
    // With scale 2, 100px becomes 200px on screen
    // Position should account for scale
    expect(result?.x).toBeCloseTo(40 - 400 * 2, 0);
  });

  it("converts screen bounds to canvas coordinates with positive position", () => {
    const cover = createMockCard("cover", 300, 200);
    const stackItem = createMockStack("s1", 400, 300, 1, cover, []);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 200, positionY: 100 },
      1920,
      1080
    );

    expect(result).not.toBeNull();
  });

  it("wraps to next row and accounts for fan arc Y offset", () => {
    const cover = createMockCard("cover", 240, 340);
    const projects = Array.from({ length: 8 }, (_, i) =>
      createMockCard(`p${i}`, 420, 300)
    );
    const stackItem = createMockStack("s1", 100, 100, 1, cover, projects);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).not.toBeNull();
  });

  it("centers horizontally, uses margin vertically when content fits horizontally but not vertically", () => {
    const cover = createMockCard("cover", 200, 800);
    const projects = [createMockCard("p1", 300, 400)];
    const stackItem = createMockStack("s1", 500, 200, 1, cover, projects);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).not.toBeNull();
    // X should be centered, Y should use margin
    expect(result?.x).toBeCloseTo(1920 / 2 - 500 - 200 / 2, 0);
    expect(result?.y).toBe(40 - 200);
  });

  it("centers vertically, uses margin horizontally when content fits vertically but not horizontally", () => {
    const cover = createMockCard("cover", 1000, 200);
    const projects = [createMockCard("p1", 300, 300)];
    const stackItem = createMockStack("s1", 200, 400, 1, cover, projects);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).not.toBeNull();
    // X should use margin, Y should be centered
    expect(result?.x).toBe(40 - 200);
    expect(result?.y).toBeCloseTo(1080 / 2 - 400 - 200 / 2, 0);
  });

  it("uses margin transform when content exceeds available space in both directions", () => {
    const cover = createMockCard("cover", 1800, 800);
    const stackItem = createMockStack("s1", 500, 400, 1, cover, []);

    const result = getAutoPanTarget(
      stackItem,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).not.toBeNull();
    // Both should use margin
    expect(result?.x).toBe(40 - 500);
    expect(result?.y).toBe(40 - 400);
  });
});
