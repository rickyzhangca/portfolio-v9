import { describe, expect, it } from "vitest";
import {
  getDocumentContentLayoutId,
  getDocumentLayoutId,
  getPaperPreviewLayout,
} from "./document-motion";

describe("document projections", () => {
  it("keeps surface and content identities distinct and instance-specific", () => {
    const surface = getDocumentLayoutId("writing", "essay");
    expect(surface).toBe("document:writing:essay");
    expect(getDocumentContentLayoutId(surface)).toBe(
      "document:writing:essay:content"
    );
    expect(getDocumentContentLayoutId(surface)).not.toBe(
      getDocumentContentLayoutId(getDocumentLayoutId("other-folder", "essay"))
    );
  });

  it("insets a portrait paper uniformly without changing its proportions", () => {
    expect(getPaperPreviewLayout({ height: 360, width: 240 }, 16)).toEqual({
      height: 312,
      scale: 208 / 240,
      width: 208,
      x: 16,
      y: 24,
    });
  });

  it.each([
    { height: 240, width: 360 },
    { height: 240, width: 240 },
    { height: 480, width: 320 },
  ])("fits and centers a $width by $height paper", (size) => {
    const preview = getPaperPreviewLayout(size, 16);
    expect(preview.width / preview.height).toBeCloseTo(
      size.width / size.height
    );
    expect(preview.x).toBeGreaterThanOrEqual(16);
    expect(preview.y).toBeGreaterThanOrEqual(16);
    expect(preview.width + preview.x * 2).toBeCloseTo(size.width);
    expect(preview.height + preview.y * 2).toBeCloseTo(size.height);
  });

  it("keeps the original bounds when no inset is requested", () => {
    expect(getPaperPreviewLayout({ height: 360, width: 240 }, 0)).toEqual({
      height: 360,
      scale: 1,
      width: 240,
      x: 0,
      y: 0,
    });
  });

  it.each([
    { height: 360, inset: 16, width: 0 },
    { height: -360, inset: 16, width: 240 },
    { height: 360, inset: -1, width: 240 },
    { height: 360, inset: 120, width: 240 },
    { height: 360, inset: Number.NaN, width: 240 },
    { height: Number.POSITIVE_INFINITY, inset: 16, width: 240 },
  ])("rejects invalid projection bounds", ({ height, inset, width }) => {
    expect(() => getPaperPreviewLayout({ height, width }, inset)).toThrow(
      RangeError
    );
  });
});
