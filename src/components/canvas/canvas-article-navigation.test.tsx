import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  createMemoryRouter,
  RouterProvider,
  useLoaderData,
} from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ArticleRoute, { loader as articleLoader } from "@/router/article";
import HomeRoute from "@/router/home";
import Root from "@/router/root";
import { writingStack } from "@/scenes/data/writing";
import { Canvas } from "./canvas";

vi.mock("@/app", () => ({
  App: () => <Canvas initialItems={[writingStack]} />,
}));
vi.mock("@/components/articles/article-content", () => ({
  ArticleContent: () => <p>Loaded article body</p>,
  loadArticle: vi.fn(() => Promise.resolve({})),
}));

beforeEach(() => {
  // happy-dom has no layout; shared projections need nonempty source bounds.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () => new DOMRect(0, 0, 240, 360)
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function TestArticleRoute() {
  const data = useLoaderData<typeof articleLoader>();
  return <ArticleRoute loaderData={data} />;
}

function clickPointer(target: Element) {
  fireEvent.pointerDown(target, {
    button: 0,
    clientX: 100,
    clientY: 100,
  });
  fireEvent.pointerUp(target, {
    button: 0,
    clientX: 100,
    clientY: 100,
  });
  fireEvent.click(target);
}

async function setup() {
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
        ],
        path: "/",
      },
    ],
    { initialEntries: ["/"] }
  );
  render(<RouterProvider router={router} />);
  const folder = await screen.findByRole("button", {
    name: "Toggle Writing folder",
  });
  fireEvent.keyDown(folder, { key: "Enter" });
  clickPointer(screen.getByRole("link", { name: "Read Ephemeral Design" }));
  const dialog = await screen.findByRole("dialog", {
    name: "Ephemeral Design",
  });
  clickPointer(screen.getByRole("button", { name: "Close reader" }));
  await waitFor(() => expect(router.state.location.pathname).toBe("/"));
  expect(dialog.isConnected).toBe(true);
  return { dialog, folder, router };
}

describe("writing reader exit interactions", () => {
  it("does not collapse the folder for a gesture on the retained reader layer", async () => {
    const { dialog, folder } = await setup();
    clickPointer(dialog.querySelector("[data-reader-viewport]") ?? dialog);
    expect(folder.getAttribute("aria-expanded")).toBe("true");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    clickPointer(document.body);
    expect(folder.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens another article before the previous reader's exit completes", async () => {
    const { dialog, folder, router } = await setup();
    const next = screen.getByRole("link", {
      name: "Read Verification asymmetry",
    });
    act(() => next.focus());
    clickPointer(next);
    await screen.findByRole("dialog", { name: "Verification asymmetry" });
    expect(router.state.location.pathname).toBe(
      "/writing/en/verification-asymmetry"
    );
    expect(folder.getAttribute("aria-expanded")).toBe("true");
    await act(() => new Promise((resolve) => setTimeout(resolve, 600)));
    expect(
      screen.getByRole("dialog", { name: "Verification asymmetry" })
    ).toBeTruthy();
    expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull();
    expect(dialog.isConnected).toBe(true);
    clickPointer(screen.getByRole("button", { name: "Close reader" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(router.state.location.pathname).toBe("/");
    expect(folder.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(next);
  });
});
