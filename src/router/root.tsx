import {
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useNavigate,
  useRouteError,
} from "react-router";
import {
  CanvasSessionContext,
  getArticleSource,
} from "@/context/canvas-session";
import {
  getArticle,
  getArticlePath,
  isArticleLocale,
} from "@/lib/articles/catalogue";
import type { ArticleLocale, ArticleSource } from "@/types/article";
import "../index.css";

const ARTICLE_PATH = /^\/writing\/(en|cn)\/[^/]+\/?$/;

const CanvasApp = lazy(() =>
  import("../app").then((module) => ({ default: module.App }))
);

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <html lang={pathname.startsWith("/writing/cn/") ? "zh-CN" : "en"}>
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <link href="/fav.svg" rel="icon" type="image/svg+xml" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        <script
          data-domains="rickyzhang.me"
          data-website-id="25b8f93a-5e0e-4742-bf49-acd6f31a9dcc"
          defer
          src="https://portfolio-umami.haoyuzhangca2973.workers.dev/script.js"
        />
      </body>
    </html>
  );
}

export function meta() {
  return [
    { title: "Ricky Zhang" },
    { content: "Design engineer, builder, and writer.", name: "description" },
  ];
}

export default function Root() {
  const location = useLocation();
  const navigate = useNavigate();
  const [hasCanvas, setHasCanvas] = useState<boolean>(false);
  const [articleLocales, setArticleLocales] = useState<
    ReadonlyMap<string, ArticleLocale>
  >(() => new Map());
  const triggerRef = useRef<HTMLElement | null>(null);
  const escapeFocusTriggerRef = useRef<HTMLElement | null>(null);
  const source = useMemo(
    () => getArticleSource(location.state),
    [location.state]
  );
  const isArticlePath = ARTICLE_PATH.test(location.pathname);
  const articleOpen = hasCanvas && isArticlePath && source !== null;

  useLayoutEffect(() => {
    if (!articleOpen) {
      return;
    }
    const [, locale, slug] = location.pathname.split("/").slice(1);
    if (
      !(
        slug &&
        isArticleLocale(locale) &&
        getArticle(slug)?.translations[locale]
      )
    ) {
      return;
    }
    setArticleLocales((current) => {
      if (current.get(slug) === locale) {
        return current;
      }
      const next = new Map(current);
      next.set(slug, locale);
      return next;
    });
  }, [articleOpen, location.pathname]);

  useEffect(() => {
    if (location.pathname === "/") {
      setHasCanvas(true);
    }
  }, [location.pathname]);

  const suppressArticleFocusRing = useCallback(() => {
    const trigger = triggerRef.current;
    escapeFocusTriggerRef.current = trigger;
    if (trigger) {
      trigger.dataset.suppressFocusRing = "";
    }
  }, []);

  const restoreArticleFocus = useCallback(() => {
    const trigger = triggerRef.current;
    const suppressRing = escapeFocusTriggerRef.current === trigger;
    escapeFocusTriggerRef.current = null;
    if (!trigger?.isConnected) {
      return;
    }
    if (suppressRing) {
      trigger.dataset.suppressFocusRing = "";
      trigger.focus({ focusVisible: false, preventScroll: true });
      return;
    }
    trigger.focus({ preventScroll: true });
  }, []);

  const openArticle = useCallback(
    (slug: string, articleSource: ArticleSource, trigger: HTMLElement) => {
      triggerRef.current = trigger;
      escapeFocusTriggerRef.current = null;
      navigate(getArticlePath(slug, articleLocales.get(slug)), {
        state: { articleSource },
      });
    },
    [navigate, articleLocales]
  );

  const showCanvas = location.pathname === "/" || articleOpen;
  const session = useMemo(
    () => ({
      articleLocales,
      articleOpen,
      articleSource: source,
      canvasVisible: showCanvas,
      hasCanvas,
      openArticle,
      restoreArticleFocus,
      suppressArticleFocusRing,
    }),
    [
      articleLocales,
      hasCanvas,
      articleOpen,
      source,
      openArticle,
      showCanvas,
      restoreArticleFocus,
      suppressArticleFocusRing,
    ]
  );

  return (
    <CanvasSessionContext.Provider value={session}>
      {hasCanvas ? (
        <div
          aria-hidden={!showCanvas || articleOpen}
          className={showCanvas ? "fixed inset-0" : "hidden"}
          inert={!showCanvas || articleOpen}
        >
          <Suspense fallback={<PortfolioLoading />}>
            <CanvasApp />
          </Suspense>
        </div>
      ) : null}
      {location.pathname === "/" && !hasCanvas && <PortfolioLoading />}
      <Outlet />
    </CanvasSessionContext.Provider>
  );
}

function PortfolioLoading() {
  return (
    <main
      aria-busy="true"
      className="flex min-h-screen items-center justify-center text-foreground2"
    >
      <p>Opening Ricky’s portfolio…</p>
    </main>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-medium text-3xl">
        {notFound ? "Article not found" : "This page couldn’t load"}
      </h1>
      <p className="text-foreground2">
        {notFound
          ? "Return to the portfolio."
          : "Return to the portfolio or reload to retry."}
      </p>
      <a className="rounded-full bg-foreground1 px-5 py-3 text-white" href="/">
        Return to portfolio
      </a>
    </main>
  );
}
