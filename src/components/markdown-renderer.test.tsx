import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownRenderer } from "./markdown-renderer";

describe("MarkdownRenderer", () => {
  it("renders video markdown with preview-friendly defaults", () => {
    const { container } = render(
      <MarkdownRenderer content={"![Demo Video](/demo.mov)"} />
    );

    const video = container.querySelector("video") as HTMLVideoElement | null;
    expect(video).not.toBeNull();
    expect(video.getAttribute("preload")).toBe("auto");
    expect(video.autoplay).toBe(true);
    expect(video.style.aspectRatio).toBe("16 / 9");
    expect(video.getAttribute("poster")).not.toBeNull();
  });

  it("updates video aspect ratio after metadata loads", () => {
    const { container } = render(
      <MarkdownRenderer content={"![Demo Video](/demo.mov)"} />
    );

    const video = container.querySelector("video") as HTMLVideoElement | null;
    expect(video).not.toBeNull();
    Object.defineProperty(video, "videoWidth", {
      value: 1920,
      configurable: true,
    });
    Object.defineProperty(video, "videoHeight", {
      value: 1080,
      configurable: true,
    });

    fireEvent.loadedMetadata(video);

    expect(video.style.aspectRatio).toBe("1.7777777777777777 / 1");
  });
});
