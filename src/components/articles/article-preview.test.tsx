import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ArticlePreviewBlock } from "@/types/article";
import { ArticlePreview } from "./article-preview";

const IMAGE: Extract<ArticlePreviewBlock, { kind: "image" }> = {
  alt: "A diagram",
  className: "object-contain",
  height: 412,
  key: 2,
  kind: "image",
  src: "/assets/diagram.svg",
  text: "A diagram",
  title: "Caption",
  width: 734,
};
let observers: PreviewIntersectionObserver[] = [];

class PreviewIntersectionObserver extends IntersectionObserver {
  readonly callback: IntersectionObserverCallback;
  override observe = vi.fn<(target: Element) => void>();
  override unobserve = vi.fn<(target: Element) => void>();
  override disconnect = vi.fn<() => void>();

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {
    super(callback, options);
    this.callback = callback;
    observers.push(this);
  }

  intersect(target: Element, isIntersecting: boolean) {
    const rect = target.getBoundingClientRect();
    this.callback(
      [
        {
          boundingClientRect: rect,
          intersectionRatio: isIntersecting ? 1 : 0,
          intersectionRect: rect,
          isIntersecting,
          rootBounds: null,
          target,
          time: 0,
        },
      ],
      this
    );
  }
}

function latestObserver() {
  const observer = observers.at(-1);
  if (!observer) {
    throw new Error("Expected a preview image observer");
  }
  return observer;
}

beforeEach(() => {
  observers = [];
  vi.stubGlobal("IntersectionObserver", PreviewIntersectionObserver);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("article preview images", () => {
  it("renders a dimensioned lazy image in sequence using the reader's image styling", () => {
    const blocks: ArticlePreviewBlock[] = [
      {
        content: [{ key: 1, kind: "text", text: "Before." }],
        key: 0,
        kind: "paragraph",
        text: "Before.",
      },
      IMAGE,
      {
        content: [{ key: 4, kind: "text", text: "After." }],
        key: 3,
        kind: "paragraph",
        text: "After.",
      },
    ];
    const { container } = render(<ArticlePreview blocks={blocks} />);
    const image = screen.getByAltText(IMAGE.alt);
    expect(image.hasAttribute("src")).toBe(false);
    expect(image.style.aspectRatio).toBe("734 / 412");
    expect(image.style.visibility).toBe("hidden");
    expect(image.getAttribute("width")).toBe("734");
    expect(image.getAttribute("height")).toBe("412");
    expect(image.getAttribute("loading")).toBe("lazy");
    expect(image.getAttribute("decoding")).toBe("async");
    expect(image.getAttribute("title")).toBe("Caption");
    expect(image.classList.contains("my-8")).toBe(true);
    expect(image.classList.contains("object-contain")).toBe(true);
    expect(
      Array.from(container.querySelector(".article-prose")?.children ?? []).map(
        (node) => node.tagName
      )
    ).toEqual(["P", "IMG", "P"]);
    const observer = latestObserver();
    expect(observer.observe).toHaveBeenCalledWith(image);
    act(() => observer.intersect(image, false));
    expect(image.hasAttribute("src")).toBe(false);
    act(() => observer.intersect(image, true));
    expect(image.getAttribute("src")).toBe(IMAGE.src);
    expect(image.style.visibility).toBe("");
    expect(observer.unobserve).toHaveBeenCalledWith(image);
  });

  it("shares one observer across nested images and keeps clipped sources unloaded", () => {
    const second = {
      ...IMAGE,
      alt: "Later diagram",
      key: 3,
      src: "/assets/later.svg",
    };
    const { unmount } = render(
      <ArticlePreview
        blocks={[
          IMAGE,
          { children: [second], key: 4, kind: "quote", text: second.text },
        ]}
      />
    );
    const firstImage = screen.getByAltText(IMAGE.alt);
    const laterImage = screen.getByAltText(second.alt);
    expect(observers).toHaveLength(1);
    const observer = latestObserver();
    expect(observer.observe).toHaveBeenCalledTimes(2);
    act(() => {
      observer.intersect(laterImage, false);
      observer.intersect(firstImage, true);
    });
    expect(firstImage.getAttribute("src")).toBe(IMAGE.src);
    expect(laterImage.hasAttribute("src")).toBe(false);
    expect(laterImage.style.aspectRatio).toBe("734 / 412");
    expect(observers).toHaveLength(1);
    unmount();
    expect(observer.disconnect).toHaveBeenCalledOnce();
  });

  it("reobserves changed translations without re-requesting previously visible assets", () => {
    const { rerender } = render(<ArticlePreview blocks={[IMAGE]} />);
    const firstObserver = latestObserver();
    act(() => firstObserver.intersect(screen.getByAltText(IMAGE.alt), true));
    const translated = { ...IMAGE, src: "/assets/translated.svg" };
    rerender(<ArticlePreview blocks={[translated]} />);
    expect(firstObserver.disconnect).toHaveBeenCalledOnce();
    const image = screen.getByAltText(IMAGE.alt);
    expect(image.hasAttribute("src")).toBe(false);
    const translatedObserver = latestObserver();
    act(() => translatedObserver.intersect(image, true));
    expect(image.getAttribute("src")).toBe(translated.src);
    rerender(<ArticlePreview blocks={[IMAGE]} />);
    expect(image.getAttribute("src")).toBe(IMAGE.src);
    expect(translatedObserver.disconnect).toHaveBeenCalledOnce();
    expect(observers).toHaveLength(2);
  });

  it("does not create an image observer for text-only previews", () => {
    render(<ArticlePreview blocks={[{ key: 0, kind: "divider", text: "" }]} />);
    expect(observers).toHaveLength(0);
  });
});
