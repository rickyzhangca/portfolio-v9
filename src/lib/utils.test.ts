import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("class1", "class2")).toBe("class1 class2");
  });

  it("handles conditional classes", () => {
    expect(cn("class1", false, "class3")).toBe("class1 class3");
  });

  it("handles undefined values", () => {
    expect(cn("class1", undefined, "class2")).toBe("class1 class2");
  });

  it("handles empty strings", () => {
    expect(cn("class1", "", "class2")).toBe("class1 class2");
  });

  it("handles null values", () => {
    expect(cn("class1", null, "class2")).toBe("class1 class2");
  });

  it("handles array of class names", () => {
    expect(cn(["class1", "class2"])).toBe("class1 class2");
  });

  it("handles object with conditional classes", () => {
    expect(cn({ class1: true, class2: false, class3: true })).toBe(
      "class1 class3"
    );
  });

  it("merges Tailwind classes correctly", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("handles mixed inputs", () => {
    expect(
      cn("class1", ["class2", "class3"], { class4: true, class5: false })
    ).toBe("class1 class2 class3 class4");
  });

  it("handles zero values", () => {
    expect(cn("class1", 0 && "class2", "class3")).toBe("class1 class3");
  });
});
