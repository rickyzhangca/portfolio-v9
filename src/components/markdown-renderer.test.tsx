import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownRenderer } from "./markdown-renderer";

describe("MarkdownRenderer", () => {
  it("renders video markdown with autoplay defaults and hidden controls", () => {
    const { container } = render(
      <MarkdownRenderer content={"![Demo Video](/demo.mov)"} />
    );

    const video = container.querySelector("video") as HTMLVideoElement | null;
    expect(video).not.toBeNull();
    expect(video.getAttribute("preload")).toBe("auto");
    expect(video.autoplay).toBe(true);
    expect(video.controls).toBe(false);
    expect(video.style.aspectRatio).toBe("16 / 9");
    expect(video.style.opacity).toBe("0");
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

  it("reveals video only after playback starts", () => {
    const { container } = render(
      <MarkdownRenderer content={"![Demo Video](/demo.mov)"} />
    );

    const video = container.querySelector("video") as HTMLVideoElement | null;
    expect(video).not.toBeNull();
    expect(video.style.opacity).toBe("0");

    fireEvent.loadedData(video);

    expect(video.style.opacity).toBe("0");

    fireEvent.playing(video);

    expect(video.style.opacity).toBe("1");
  });

  it("treats video URLs with query params as videos", () => {
    const { container } = render(
      <MarkdownRenderer content={"![Demo Video](/demo.mov?t=1770448620687)"} />
    );

    const video = container.querySelector("video");
    const image = container.querySelector("img");

    expect(video).not.toBeNull();
    expect(image).toBeNull();
  });
});
