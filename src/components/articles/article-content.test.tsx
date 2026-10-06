import { act, cleanup, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ArticleContent, loadArticle } from "./article-content";

const loaders = vi.hoisted(() => ({
  cache: vi.fn(),
  failed: vi.fn(),
  preloaded: vi.fn(),
  render: vi.fn(),
}));
vi.mock("@/content/generated/loaders", () => ({
  articleLoaders: {
    cache: { en: loaders.cache },
    failed: { en: loaders.failed },
    preloaded: { en: loaders.preloaded },
    render: { en: loaders.render },
  },
}));
afterEach(cleanup);

describe("article module boundary", () => {
  it("shares one promise across repeated requests for the same translation", async () => {
    loaders.cache.mockResolvedValue({ default: () => null });
    const first = loadArticle("cache", "en");
    expect(loadArticle("cache", "en")).toBe(first);
    await first;
    expect(loaders.cache).toHaveBeenCalledOnce();
    await expect(loadArticle("cache", "cn")).rejects.toThrow(
      "translation not found"
    );
  });
  it("renders a compiled body", async () => {
    loaders.render.mockResolvedValue({
      default: () => <p>Rendered MDX</p>,
    });
    await act(async () => {
      render(
        <MemoryRouter>
          <Suspense fallback={<p>Loading</p>}>
            <ArticleContent locale="en" slug="render" />
          </Suspense>
        </MemoryRouter>
      );
      await loadArticle("render", "en");
    });
    expect(await screen.findByText("Rendered MDX")).toBeTruthy();
  });
  it("renders a route-preloaded body immediately without a loading flash", async () => {
    loaders.preloaded.mockResolvedValue({
      default: () => <p>Preloaded article body</p>,
    });
    await loadArticle("preloaded", "en");
    render(
      <Suspense fallback={<p>Loading article</p>}>
        <ArticleContent locale="en" slug="preloaded" />
      </Suspense>
    );
    expect(screen.getByText("Preloaded article body")).toBeTruthy();
    expect(screen.queryByText("Loading article")).toBeNull();
  });
  it("retains a failed request for the error boundary instead of starting a Suspense retry loop", async () => {
    loaders.failed.mockRejectedValue(new Error("Network unavailable"));
    const failed = loadArticle("failed", "en");
    await expect(failed).rejects.toThrow("Network unavailable");
    expect(loadArticle("failed", "en")).toBe(failed);
    expect(loaders.failed).toHaveBeenCalledOnce();
  });
});
