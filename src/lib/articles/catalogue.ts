import { articles } from "@/content/generated/catalogue";
import type { ArticleLocale, ArticleMetadata } from "@/types/article";

// biome-ignore lint/performance/noBarrelFile: Domain catalogue exposes its validated metadata.
export { articles } from "@/content/generated/catalogue";

const articleBySlug = new Map(
  articles.map((article) => [article.slug, article])
);

export function getArticle(slug: string) {
  return articleBySlug.get(slug);
}

export function isArticleLocale(value: unknown): value is ArticleLocale {
  return value === "en" || value === "cn";
}

export function getArticleLocale(
  article: ArticleMetadata | undefined,
  preferred?: ArticleLocale
): ArticleLocale {
  if (preferred && article?.translations[preferred]) {
    return preferred;
  }
  return article?.translations.en === undefined &&
    article?.translations.cn !== undefined
    ? "cn"
    : "en";
}

export function getArticlePath(slug: string, locale?: ArticleLocale) {
  const article = getArticle(slug);
  const defaultLocale =
    article?.translations.en === undefined &&
    article?.translations.cn !== undefined
      ? "cn"
      : "en";
  return `/writing/${locale ?? defaultLocale}/${slug}`;
}

export function getArticleDate(
  published: string,
  locale: ArticleLocale = "en"
) {
  return new Intl.DateTimeFormat(locale === "cn" ? "zh-CN" : "en-CA", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${published}T00:00:00Z`));
}
