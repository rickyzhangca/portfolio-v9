import type { ReactNode } from "react";
import { getArticleDate } from "@/lib/articles/catalogue";
import type { ArticleLocale, ArticleMetadata } from "@/types/article";

interface ArticlePaperProps {
  article: ArticleMetadata;
  children: ReactNode;
  heading?: "h1" | "h2";
  locale: ArticleLocale;
  navigation?: ReactNode;
}

/** One layout for the reader and its scaled canvas preview. */
export function ArticlePaper({
  article,
  children,
  heading: Heading = "h1",
  locale,
  navigation,
}: ArticlePaperProps) {
  const translation = article.translations[locale];
  if (!translation) {
    return null;
  }
  return (
    <article
      className="article-paper reader-paper mx-auto w-full max-w-210"
      lang={locale === "cn" ? "zh-CN" : "en"}
    >
      <div className="reader-column">
        {navigation}
        <header className="mb-8 sm:mb-9 lg:mb-11">
          <p className="reader-meta mb-4">
            <time dateTime={article.published}>
              {getArticleDate(article.published, locale)}
            </time>{" "}
            · {translation.readingMinutes}{" "}
            {locale === "cn" ? "分钟阅读" : "min read"}
          </p>
          <Heading className="reader-title">{translation.title}</Heading>
        </header>
        {children}
      </div>
    </article>
  );
}
