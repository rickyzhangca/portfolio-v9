import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { LayoutGroup } from "framer-motion";
import { type MouseEvent, useCallback, useState } from "react";
import {
  createMemoryRouter,
  RouterProvider,
  useLoaderData,
} from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ArticleCard } from "@/cards/article/article-card";
import { ArticleModal } from "@/components/articles/article-modal";
import { useCanvasSession } from "@/context/canvas-session";
import ArticleRoute, {
  loader as articleLoader,
  meta as articleMeta,
} from "./article";
import HomeRoute from "./home";
import NotFound from "./not-found";
import Root, { ErrorBoundary, meta as rootMeta } from "./root";

vi.mock("@/app", () => ({ App: TestCanvas }));
vi.mock("@/components/articles/article-content", () => ({
  ArticleContent: () => <p>Loaded article body</p>,
  loadArticle: vi.fn(() => Promise.resolve({})),
}));
afterEach(cleanup);

function TestCanvas() {
  const [count, setCount] = useState(0);
  const session = useCanvasSession();
  const increment = useCallback(() => setCount((value) => value + 1), []);
  const open = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      session.openArticle?.(
        "ephemeral-design",
        { cardId: "article-ephemeral-design", itemId: "writing-stack" },
        event.currentTarget
      );
    },
    [session]
  );
  return (
    <LayoutGroup>
      <div data-testid="canvas">
        <p>Count {count}</p>
        <ArticleCard content={{ slug: "ephemeral-design" }} />
        <button onClick={increment} type="button">
          Increment
        </button>
        <button id="article-trigger" onClick={open} type="button">
          Open essay
        </button>
      </div>
      <ArticleModal />
    </LayoutGroup>
  );
}

function TestArticleRoute() {
  const data = useLoaderData<typeof articleLoader>();
  return <ArticleRoute loaderData={data} />;
}

function setup(path: string, history = [path]) {
  const router = createMemoryRouter(
    [
      {
        Component: Root,
        children: [
          { Component: HomeRoute, index: true },
          {
            Component: TestArticleRoute,
            loader: articleLoader,
            path: "writing/:locale/:slug",
          },
          { Component: NotFound, path: "*" },
        ],
        ErrorBoundary,
        hydrateFallbackElement: <p>Loading route</p>,
        path: "/",
      },
    ],
    { initialEntries: history, initialIndex: history.length - 1 }
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe("writing route and canvas session", () => {
  it("does not pop another history entry when close is pressed again during exit", async () => {
    const router = setup("/", ["/writing", "/"]);
    fireEvent.click(await screen.findByRole("button", { name: "Open essay" }));
    await screen.findByRole("dialog", { name: "Ephemeral Design" });
    const close = screen.getByRole("button", { name: "Close reader" });
    fireEvent.click(close);
    fireEvent.click(close);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(router.state.location.pathname).toBe("/");
    expect(document.activeElement?.id).toBe("article-trigger");
  });
  it("keeps the canvas mounted, replaces locale navigation and restores focus on close", async () => {
    const router = setup("/");
    fireEvent.click(await screen.findByRole("button", { name: "Increment" }));
    fireEvent.click(screen.getByRole("button", { name: "Open essay" }));
    await screen.findByRole("dialog", { name: "Ephemeral Design" });
    expect(screen.getByTestId("canvas").textContent).toContain("Count 1");
    fireEvent.click(screen.getByRole("link", { name: "中文" }));
    await screen.findByRole("dialog", { name: "瞬时设计" });
    expect(router.state.location.pathname).toBe("/writing/cn/ephemeral-design");
    fireEvent.click(screen.getByRole("button", { name: "Close reader" }));
    // Returning to the canvas must leave the reader mounted for its exit.
    expect(screen.getByRole("dialog", { name: "瞬时设计" })).toBeTruthy();
    await screen.findByRole("button", { name: "Open essay" });
    expect(router.state.location.pathname).toBe("/");
    expect(screen.getByText("Count 1")).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement?.id).toBe("article-trigger")
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("renders a direct article without mounting the canvas or opening a dialog", async () => {
    setup("/writing/en/ephemeral-design");
    await screen.findByRole("heading", { level: 1, name: "Ephemeral Design" });
    expect(screen.queryByTestId("canvas")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Loaded article body")).toBeTruthy();
    const portfolio = screen.getByRole("link", { name: "← Portfolio" });
    expect(portfolio.getAttribute("href")).toBe("/");
    fireEvent.click(portfolio);
    await screen.findByRole("button", { name: "Open essay" });
  });
  it("keeps the preview and reopened reader in the selected language", async () => {
    const router = setup("/");
    fireEvent.click(await screen.findByRole("button", { name: "Open essay" }));
    await screen.findByRole("dialog", { name: "Ephemeral Design" });
    fireEvent.click(screen.getByRole("link", { name: "中文" }));
    await screen.findByRole("dialog", { name: "瞬时设计" });
    fireEvent.click(screen.getByRole("button", { name: "Close reader" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const preview = screen.getByRole("heading", { level: 2, name: "瞬时设计" });
    expect(preview.closest("article")?.getAttribute("lang")).toBe("zh-CN");
    fireEvent.click(screen.getByRole("button", { name: "Open essay" }));
    await screen.findByRole("dialog", { name: "瞬时设计" });
    expect(router.state.location.pathname).toBe("/writing/cn/ephemeral-design");
  });
  it.each(["/writing/xx/ephemeral-design", "/writing/en/missing"])(
    "shows a safe 404 for %s",
    async (path) => {
      setup(path);
      await screen.findByRole("heading", { name: "Article not found" });
      expect(screen.queryByTestId("canvas")).toBeNull();
      expect(
        screen
          .getByRole("link", { name: "Return to portfolio" })
          .getAttribute("href")
      ).toBe("/");
    }
  );
  it.each(["/writing", "/missing"])(
    "provides a 404 for removed or unmatched route %s",
    async (path) => {
      setup(path);
      await screen.findByRole("heading", { level: 1, name: "Page not found" });
      expect(screen.queryByTestId("canvas")).toBeNull();
      expect(
        screen
          .getByRole("link", { name: "Return to portfolio" })
          .getAttribute("href")
      ).toBe("/");
    }
  );
  it("provides published and localized sharing metadata", () => {
    const args = {
      data: undefined,
      error: undefined,
      loaderData: undefined,
      location: {
        hash: "",
        key: "default",
        pathname: "/",
        search: "",
        state: null,
      },
      matches: [],
      params: { locale: "cn", slug: "ephemeral-design" },
    };
    const metadata = articleMeta(args);
    expect(metadata).toContainEqual({ title: "瞬时设计 — Ricky Zhang" });
    expect(metadata).toContainEqual({
      href: "https://rickyzhang.me/writing/cn/ephemeral-design",
      rel: "canonical",
      tagName: "link",
    });
    expect(metadata).toContainEqual({
      content: "https://rickyzhang.me/writing/og/ephemeral-design-cn.png",
      property: "og:image",
    });
    expect(
      articleMeta({ ...args, params: { locale: "xx", slug: "missing" } })
    ).toEqual([{ title: "Article not found — Ricky Zhang" }]);
    expect(rootMeta()).toContainEqual({ title: "Ricky Zhang" });
  });
});
