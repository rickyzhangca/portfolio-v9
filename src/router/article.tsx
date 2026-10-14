import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useEffect } from "react";
import {
  type ClientLoaderFunctionArgs,
  Link,
  type LoaderFunctionArgs,
  type MetaFunction,
  useLocation,
} from "react-router";
import { loadArticle } from "@/components/articles/article-content";
import { ArticleLanguageSwitch } from "@/components/articles/article-language-switch";
import { ArticleSheet } from "@/components/articles/article-sheet";
import {
  READER_TOOLBAR_BUTTON_CLASS,
  ReaderToolbar,
} from "@/components/documents/reader-toolbar";
import { useCanvasSession } from "@/context/canvas-session";
import {
  getArticle,
  getArticlePath,
  isArticleLocale,
} from "@/lib/articles/catalogue";
import {
  absoluteUrl,
  PERSON_SCHEMA,
  SITE_NAME,
  SITE_URL,
  X_HANDLE,
} from "@/lib/site";

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

const LANGUAGE_TAGS = { cn: "zh-CN", en: "en" } as const;
const OPEN_GRAPH_LOCALES = { cn: "zh_CN", en: "en_US" } as const;
const NOT_FOUND_META = [
  { title: `Article not found — ${SITE_NAME}` },
  { content: "noindex", name: "robots" },
];

export const meta: MetaFunction = ({ params }) => {
  try {
    const { article, locale } = resolveArticle(params);
    const translation = article.translations[locale];
    if (!translation) {
      return NOT_FOUND_META;
    }
    const canonical = absoluteUrl(getArticlePath(article.slug, locale));
    const image = absoluteUrl(`/writing/og/${article.slug}-${locale}.png`);
    const languages = Object.keys(article.translations).filter(isArticleLocale);
    const title = `${translation.title} — ${SITE_NAME}`;
    return [
      { title },
      { content: translation.description, name: "description" },
      { content: SITE_NAME, name: "author" },
      { href: canonical, rel: "canonical", tagName: "link" },
      ...languages.map((language) => ({
        href: absoluteUrl(getArticlePath(article.slug, language)),
        hrefLang: LANGUAGE_TAGS[language],
        rel: "alternate",
        tagName: "link",
      })),
      {
        href: absoluteUrl(getArticlePath(article.slug)),
        hrefLang: "x-default",
        rel: "alternate",
        tagName: "link",
      },
      { content: "article", property: "og:type" },
      { content: SITE_NAME, property: "og:site_name" },
      { content: OPEN_GRAPH_LOCALES[locale], property: "og:locale" },
      ...languages
        .filter((language) => language !== locale)
        .map((language) => ({
          content: OPEN_GRAPH_LOCALES[language],
          property: "og:locale:alternate",
        })),
      { content: translation.title, property: "og:title" },
      { content: translation.description, property: "og:description" },
      { content: canonical, property: "og:url" },
      { content: image, property: "og:image" },
      { content: "1200", property: "og:image:width" },
      { content: "630", property: "og:image:height" },
      { content: translation.title, property: "og:image:alt" },
      { content: article.published, property: "article:published_time" },
      { content: `${SITE_URL}/`, property: "article:author" },
      { content: "summary_large_image", name: "twitter:card" },
      { content: X_HANDLE, name: "twitter:creator" },
      { content: translation.title, name: "twitter:title" },
      { content: translation.description, name: "twitter:description" },
      { content: image, name: "twitter:image" },
      { content: translation.title, name: "twitter:image:alt" },
      {
        "script:ld+json": {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          author: PERSON_SCHEMA,
          dateModified: article.published,
          datePublished: article.published,
          description: translation.description,
          headline: translation.title,
          image,
          inLanguage: LANGUAGE_TAGS[locale],
          mainEntityOfPage: canonical,
          url: canonical,
        },
      },
    ];
  } catch {
    return NOT_FOUND_META;
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
  // A direct visit matches the canvas reader, including its toolbar.
  return articleOpen ? null : (
    <>
      <main className="min-h-screen bg-white px-5 pt-12 pb-48">
        <ArticleSheet article={article} locale={locale} />
      </main>
      <ReaderToolbar>
        <Link
          aria-label={locale === "cn" ? "返回主页" : "Back to portfolio"}
          className={READER_TOOLBAR_BUTTON_CLASS}
          to="/"
        >
          <ArrowLeftIcon size={20} weight="bold" />
        </Link>
        <ArticleLanguageSwitch article={article} locale={locale} />
      </ReaderToolbar>
    </>
  );
}
