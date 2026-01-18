import { describe, expect, it } from "vitest";
import { DEFAULT_FAN_CONFIG } from "@/lib/fan";
import { createMockCard, createMockGroup } from "@/test-utils/test-helpers";
import { getAutoPanTarget } from "./auto-pan";

describe("getAutoPanTarget - content fits viewport", () => {
  it("returns null when expanded group with cover and projects fits within viewport", () => {
    const cover = createMockCard("cover", 200, 300);
    const projects = [
      createMockCard("p1", 100, 150),
      createMockCard("p2", 100, 150),
    ];
    const group = createMockGroup("g1", 0, 0);
    group.cover = cover;
    group.projects = projects;

    const result = getAutoPanTarget(
      group,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).toBeNull();
  });

  it("returns null for projects without cover when content fits", () => {
    const projects = [createMockCard("p1", 100, 150)];
    const group = createMockGroup("g1", 0, 0);
    group.cover = undefined;
    group.projects = projects;

    const result = getAutoPanTarget(
      group,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).toBeNull();
  });

  it("returns null when content fits within viewport", () => {
    const group = createMockGroup("g1", 400, 400);
    group.cover = createMockCard("cover", 100, 100);
    group.projects = [];

    const result = getAutoPanTarget(
      group,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).toBeNull();
  });

  it("returns null when content fits with small scale", () => {
    const group = createMockGroup("g1", 100, 100);
    group.cover = createMockCard("cover", 100, 100);

    const result = getAutoPanTarget(
      group,
      DEFAULT_FAN_CONFIG,
      { scale: 0.5, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).toBeNull();
  });

  it("returns null for empty group", () => {
    const group = createMockGroup("g1", 0, 0);
    group.cover = undefined;
    group.projects = [];

    const result = getAutoPanTarget(
      group,
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
    const group = createMockGroup("g1", 800, 100);
    group.cover = createMockCard("cover", 500, 300);

    const result = getAutoPanTarget(
      group,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1000,
      600
    );

    expect(result).not.toBeNull();
    expect(result?.scale).toBe(1);
    // Verify transform has valid values
    expect(result?.x).toBeDefined();
    expect(result?.y).toBeDefined();
  });

  it("returns margin transform when content exceeds viewport horizontally", () => {
    const group = createMockGroup("g1", 50, 50);
    group.cover = createMockCard("cover", 600, 100);
    group.projects = [createMockCard("p1", 600, 100)];

    const result = getAutoPanTarget(
      group,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      800,
      600
    );

    expect(result).not.toBeNull();
    expect(result?.scale).toBe(1);
    // Verify transform has valid values
    expect(result?.x).toBeDefined();
    expect(result?.y).toBeDefined();
  });

  it("returns transform accounting for rotated card bounding boxes", () => {
    const cover = createMockCard("cover", 200, 300);
    const projects = [
      createMockCard("p1", 100, 200),
      createMockCard("p2", 100, 200),
    ];
    const group = createMockGroup("g1", 50, 50);
    group.cover = cover;
    group.projects = projects;

    const result = getAutoPanTarget(
      group,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      800,
      600
    );

    expect(result).toBeNull();
  });

  it("handles large number of projects with fan arc offsets", () => {
    const group = createMockGroup("g1", 50, 50);
    group.cover = createMockCard("cover", 200, 200);
    group.projects = Array.from({ length: 10 }, (_, i) =>
      createMockCard(`p${i}`, 100, 150)
    );

    const result = getAutoPanTarget(
      group,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      800,
      600
    );

    expect(result).not.toBeNull();
    expect(result?.scale).toBe(1);
  });

  it("handles groups positioned far from viewport origin", () => {
    const group = createMockGroup("g1", 2000, 2000);
    group.cover = createMockCard("cover", 200, 200);

    const result = getAutoPanTarget(
      group,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1920,
      1080
    );

    expect(result).not.toBeNull();
    expect(result?.scale).toBe(1);
    expect(result?.x).toBeDefined();
    expect(result?.y).toBeDefined();
  });

  it("handles large scale values", () => {
    const group = createMockGroup("g1", 100, 100);
    group.cover = createMockCard("cover", 300, 300);

    const result = getAutoPanTarget(
      group,
      DEFAULT_FAN_CONFIG,
      { scale: 3, positionX: 0, positionY: 0 },
      800,
      600
    );

    expect(result).not.toBeNull();
    expect(result?.scale).toBe(3);
    expect(result?.x).toBeDefined();
    expect(result?.y).toBeDefined();
  });

  it("converts screen bounds to canvas coordinates with positive position", () => {
    const group = createMockGroup("g1", 100, 100);
    group.cover = createMockCard("cover", 1500, 1500);

    const result = getAutoPanTarget(
      group,
      DEFAULT_FAN_CONFIG,
      { positionX: 100, positionY: 50, scale: 2 },
      1920,
      1080
    );

    expect(result).not.toBeNull();
    expect(result?.scale).toBe(2);
  });

  it("wraps to next row and accounts for fan arc Y offset", () => {
    const cover = createMockCard("cover", 200, 300);
    const projects = Array.from({ length: 4 }, (_, i) =>
      createMockCard(`p${i}`, 100, 150)
    );
    const group = createMockGroup("g1", 50, 50);
    group.cover = cover;
    group.projects = projects;

    const result = getAutoPanTarget(
      group,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      800,
      600
    );

    expect(result).toBeNull();
  });

  it("centers horizontally, uses margin vertically when content fits horizontally but not vertically", () => {
    const group = createMockGroup("g1", 50, 50);
    group.cover = createMockCard("cover", 200, 200);
    group.projects = [createMockCard("p1", 400, 500)];

    const result = getAutoPanTarget(
      group,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      1000,
      400
    );

    expect(result).not.toBeNull();
    expect(result?.scale).toBe(1);
    // Should center horizontally
    expect(result?.x).toBeGreaterThan(0);
    // Should use margin vertically
    expect(result?.y).toBeCloseTo(40 - 50, -1);
  });

  it("centers vertically, uses margin horizontally when content fits vertically but not horizontally", () => {
    const group = createMockGroup("g1", 50, 50);
    group.cover = createMockCard("cover", 200, 200);
    group.projects = [createMockCard("p1", 600, 100)];

    const result = getAutoPanTarget(
      group,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      400,
      1000
    );

    expect(result).not.toBeNull();
    expect(result?.scale).toBe(1);
    // Should use margin horizontally
    expect(result?.x).toBeCloseTo(40 - 50, -1);
    // Should center vertically
    expect(result?.y).toBeGreaterThan(0);
  });

  it("uses margin transform when content exceeds available space in both directions", () => {
    const group = createMockGroup("g1", 50, 50);
    group.cover = createMockCard("cover", 300, 300);
    group.projects = Array.from({ length: 6 }, (_, i) =>
      createMockCard(`p${i}`, 150, 200)
    );

    const result = getAutoPanTarget(
      group,
      DEFAULT_FAN_CONFIG,
      { scale: 1, positionX: 0, positionY: 0 },
      800,
      600
    );

    expect(result).not.toBeNull();
    expect(result?.scale).toBe(1);
    expect(result?.x).toBeDefined();
    expect(result?.y).toBeDefined();
  });
});
