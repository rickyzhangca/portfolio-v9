import { describe, expect, it } from "vitest";
import { DEFAULT_FAN_CONFIG } from "@/lib/fan";
import {
  createMockCard,
  createMockCover,
  createMockStack,
} from "@/test-utils/test-helpers";
import { getAutoPanTarget } from "./auto-pan";

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
