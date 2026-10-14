import { describe, expect, it } from "vitest";
import { fitSpan } from "@/lib/fit-span";

describe("fitSpan", () => {
  it("leaves a span that already fits", () => {
    expect(fitSpan(40, 200, 390, 16)).toBe(40);
  });

  it("pulls a span back from the trailing edge", () => {
    expect(fitSpan(300, 200, 390, 16)).toBe(390 - 16 - 200);
  });

  it("pushes a span in from the leading edge", () => {
    expect(fitSpan(-120, 200, 390, 16)).toBe(16);
  });

  it("pins a span wider than the screen to the leading margin", () => {
    expect(fitSpan(80, 400, 390, 16)).toBe(16);
  });
});
