import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkdownRenderer } from "./markdown-renderer";

interface MockIntersectionEntry extends IntersectionObserverEntry {
  isVisible?: boolean;
}

interface MockObserver {
  callback: IntersectionObserverCallback;
  disconnect: ReturnType<typeof vi.fn>;
  observe: ReturnType<typeof vi.fn>;
  options?: IntersectionObserverInit;
}

const observers: MockObserver[] = [];
const originalIntersectionObserver = globalThis.IntersectionObserver;

class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  disconnect = vi.fn();
  observe = vi.fn();
  options?: IntersectionObserverInit;

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {
    this.callback = callback;
    this.options = options;
    observers.push(this);
  }
}

const getVideoElement = (container: HTMLElement): HTMLVideoElement => {
  const video = container.querySelector("video");
  if (!(video instanceof HTMLVideoElement)) {
    throw new TypeError("Expected a rendered HTMLVideoElement");
  }
  return video;
};

const intersectVideo = (
  video: HTMLVideoElement,
  isIntersecting: boolean,
  isVisible?: boolean
) => {
  const observer = observers.find((candidate) =>
    candidate.observe.mock.calls.some(([target]) => target === video)
  );
  const entry = {
    isIntersecting,
    isVisible,
    target: video,
  } as unknown as MockIntersectionEntry;

  act(() => {
    observer?.callback([entry], observer as unknown as IntersectionObserver);
  });
};

describe("MarkdownRenderer", () => {
  beforeEach(() => {
    observers.length = 0;
    globalThis.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() =>
      Promise.resolve()
    );
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
      () => undefined
    );
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalIntersectionObserver;
    vi.restoreAllMocks();
  });

  it("defers video loading and autoplay until it is visible", () => {
    const { container } = render(
      <MarkdownRenderer content={"![Demo Video](/demo.mov)"} />
    );

    const video = getVideoElement(container);
    expect(video.getAttribute("src")).toBeNull();
    expect(video.getAttribute("preload")).toBe("none");
    expect(video.autoplay).toBe(false);
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
    expect(observers[0]?.observe).toHaveBeenCalledExactlyOnceWith(video);

    intersectVideo(video, true, true);

    expect(video.getAttribute("src")).toBe("/demo.mov");
    expect(video.getAttribute("preload")).toBe("auto");
    expect(video.autoplay).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
  });

  it("updates video aspect ratio after metadata loads", () => {
    const { container } = render(
      <MarkdownRenderer content={"![Demo Video](/demo.mov)"} />
    );

    const video = getVideoElement(container);
    intersectVideo(video, true, true);
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

    const video = getVideoElement(container);
    intersectVideo(video, true, true);
    expect(video.style.opacity).toBe("0");

    fireEvent.loadedData(video);
    expect(video.style.opacity).toBe("0");

    fireEvent.playing(video);
    expect(video.style.opacity).toBe("1");
  });

  it("pauses and unloads videos when they leave the viewport", () => {
    const { container } = render(
      <MarkdownRenderer content={"![Demo Video](/demo.mov)"} />
    );

    const video = getVideoElement(container);
    intersectVideo(video, true, true);
    intersectVideo(video, false);

    expect(video.pause).toHaveBeenCalledOnce();
    expect(video.getAttribute("src")).toBeNull();
    expect(video.getAttribute("preload")).toBe("none");
    expect(video.autoplay).toBe(false);
  });

  it("does not replay or pause visible videos for ancestor transforms", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    const { container } = render(
      <MarkdownRenderer content={"![Demo Video](/demo.mov)"} />
    );

    const video = getVideoElement(container);
    intersectVideo(video, true, true);
    await waitFor(() => {
      expect(play).toHaveBeenCalledTimes(1);
    });

    const ancestor = video.parentElement;
    if (!ancestor) {
      throw new TypeError("Expected a video wrapper");
    }
    ancestor.style.transform = "translateX(8px)";
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    intersectVideo(video, true, true);

    expect(video.getAttribute("src")).toBe("/demo.mov");
    expect(play).toHaveBeenCalledTimes(1);
    expect(video.pause).not.toHaveBeenCalled();
  });

  it("does not load when an intersecting video is hidden by an ancestor", async () => {
    const { container } = render(
      <div style={{ visibility: "hidden" }}>
        <MarkdownRenderer content={"![Demo Video](/demo.mov)"} />
      </div>
    );

    const video = getVideoElement(container);
    intersectVideo(video, true);
    expect(video.getAttribute("src")).toBeNull();

    const hiddenAncestor = container.querySelector("div");
    if (!hiddenAncestor) {
      throw new TypeError("Expected a visibility wrapper");
    }
    hiddenAncestor.style.visibility = "visible";

    await waitFor(() => {
      expect(video.getAttribute("src")).toBe("/demo.mov");
    });
  });

  it("checks inherited opacity and updates when measurement visibility changes", async () => {
    const { container } = render(
      <div style={{ opacity: 0 }}>
        <MarkdownRenderer content={"![Demo Video](/demo.mov)"} />
      </div>
    );

    const video = getVideoElement(container);
    intersectVideo(video, true);
    expect(video.getAttribute("src")).toBeNull();

    const hiddenAncestor = container.querySelector("div");
    if (!hiddenAncestor) {
      throw new TypeError("Expected an opacity wrapper");
    }
    hiddenAncestor.style.opacity = "1";

    await waitFor(() => {
      expect(video.getAttribute("src")).toBe("/demo.mov");
    });
  });

  it("does not let the hidden loading style block visible video activation", () => {
    const { container } = render(
      <MarkdownRenderer content={"![Demo Video](/demo.mov)"} />
    );

    const video = getVideoElement(container);
    expect(video.style.opacity).toBe("0");
    intersectVideo(video, true, false);

    expect(video.getAttribute("src")).toBe("/demo.mov");
    expect(video.autoplay).toBe(true);
  });

  it("announces media load failures instead of swallowing them", () => {
    const { container } = render(
      <MarkdownRenderer content={"![Demo Video](/demo.mov)"} />
    );

    const video = getVideoElement(container);
    intersectVideo(video, true, true);
    fireEvent.error(video);

    expect(screen.getByRole("alert").textContent).toBe(
      "Video could not be loaded."
    );
  });

  it("shows native controls when autoplay is blocked", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    play.mockImplementationOnce(() =>
      Promise.reject(
        Object.assign(new Error("autoplay blocked"), {
          name: "NotAllowedError",
        })
      )
    );
    const { container } = render(
      <MarkdownRenderer content={"![Demo Video](/demo.mov)"} />
    );

    const video = getVideoElement(container);
    intersectVideo(video, true, true);

    await waitFor(() => {
      expect(video.controls).toBe(true);
    });
    expect(video.style.opacity).toBe("1");
    expect(
      video.previousElementSibling?.classList.contains("pointer-events-none")
    ).toBe(true);
    fireEvent.playing(video);
    expect(video.controls).toBe(true);
  });

  it("announces rejected playback errors other than autoplay policy failures", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    play.mockImplementationOnce(() =>
      Promise.reject(
        Object.assign(new Error("unsupported format"), {
          name: "NotSupportedError",
        })
      )
    );
    const { container } = render(
      <MarkdownRenderer content={"![Demo Video](/demo.mov)"} />
    );

    const video = getVideoElement(container);
    intersectVideo(video, true, true);

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Video could not be loaded."
    );
  });

  it("resets media errors and readiness when the source changes", async () => {
    const { container, rerender } = render(
      <MarkdownRenderer content={"![Demo Video](/first.mov)"} />
    );

    const video = getVideoElement(container);
    intersectVideo(video, true, true);
    fireEvent.error(video);
    expect(screen.getByRole("alert")).toBeTruthy();

    rerender(<MarkdownRenderer content={"![Demo Video](/second.mov)"} />);
    const updatedVideo = getVideoElement(container);
    intersectVideo(updatedVideo, true, true);

    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull();
      expect(updatedVideo.getAttribute("src")).toBe("/second.mov");
    });
    expect(updatedVideo.style.opacity).toBe("0");
    expect(updatedVideo.controls).toBe(false);
  });

  it("disconnects visibility observation when a video unmounts", () => {
    const { unmount } = render(
      <MarkdownRenderer content={"![Demo Video](/demo.mov)"} />
    );

    const observer = observers[0];
    unmount();

    expect(observer?.disconnect).toHaveBeenCalledTimes(1);
  });

  it("treats video URLs with query params as videos", () => {
    const { container } = render(
      <MarkdownRenderer content={"![Demo Video](/demo.mov?t=1770448620687)"} />
    );

    expect(container.querySelector("video")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });
});
