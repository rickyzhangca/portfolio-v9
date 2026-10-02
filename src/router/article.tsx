import { useEffect } from "react";
import {
  type ClientLoaderFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
  useLocation,
} from "react-router";
import { loadArticle } from "@/components/articles/article-content";
import { ArticleSheet } from "@/components/articles/article-sheet";
import { useCanvasSession } from "@/context/canvas-session";
import {
  getArticle,
  getArticlePath,
  isArticleLocale,
} from "@/lib/articles/catalogue";

function resolveArticle(params: Record<string, string | undefined>) {
  const article = getArticle(params.slug ?? "");
  if (
    !(
      article &&
      isArticleLocale(params.locale) &&
      article.translations[params.locale]
    )
  ) {
    throw new Response("Article not found", { status: 404 });
  }
  return { article, locale: params.locale };
}

async function prepareArticle(params: Record<string, string | undefined>) {
  const resolved = resolveArticle(params);
  await loadArticle(resolved.article.slug, resolved.locale);
  return resolved;
}

export function loader({ params }: LoaderFunctionArgs) {
  return prepareArticle(params);
}

// Framework loaders run on the server in development and during prerendering.
// Prepare the browser module before committing a canvas-to-reader navigation.
export function clientLoader({ params }: ClientLoaderFunctionArgs) {
  return prepareArticle(params);
}

export const meta: MetaFunction = ({ params }) => {
  try {
    const { article, locale } = resolveArticle(params);
    const translation = article.translations[locale];
    const canonical = `https://rickyzhang.me${getArticlePath(article.slug, locale)}`;
    const image = `https://rickyzhang.me/writing/og/${article.slug}-${locale}.png`;
    return [
      { title: `${translation?.title} — Ricky Zhang` },
      { href: canonical, rel: "canonical", tagName: "link" },
      ...Object.keys(article.translations).map((language) => ({
        href: `https://rickyzhang.me/writing/${language}/${article.slug}`,
        hrefLang: language === "cn" ? "zh-CN" : "en",
        rel: "alternate",
        tagName: "link",
      })),
      { content: "article", property: "og:type" },
      { content: translation?.title, property: "og:title" },
      { content: canonical, property: "og:url" },
      { content: image, property: "og:image" },
      { content: "1200", property: "og:image:width" },
      { content: "630", property: "og:image:height" },
      { content: article.published, property: "article:published_time" },
      { content: "Ricky Zhang", property: "article:author" },
      { content: "summary_large_image", name: "twitter:card" },
      { content: translation?.title, name: "twitter:title" },
      { content: image, name: "twitter:image" },
    ];
  } catch {
    return [{ title: "Article not found — Ricky Zhang" }];
  }
};

export default function ArticleRoute({
  loaderData,
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
}) {
  const { article, locale } = loaderData;
  const { articleOpen } = useCanvasSession();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      let id = location.hash.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch {
        /* Keep malformed fragments safe. */
      }
      const frame = requestAnimationFrame(() =>
        document.getElementById(id)?.scrollIntoView()
      );
      return () => cancelAnimationFrame(frame);
    }
  }, [location.hash]);

  // Canvas owns the overlay's presence and shared layout; this route owns its
  // URL, loader and static page. Unmounting a route must not abort the exit.
  return articleOpen ? null : (
    <main className="min-h-screen bg-white px-6 pt-8 pb-20 sm:px-10 sm:pt-12">
      <ArticleSheet article={article} locale={locale} />
    </main>
  );
}
