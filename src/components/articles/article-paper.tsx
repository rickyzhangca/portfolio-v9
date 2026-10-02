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
      className="article-paper mx-auto w-full max-w-210 px-5 pt-8 sm:px-10 sm:pt-12"
      lang={locale === "cn" ? "zh-CN" : "en"}
    >
      <div className="mx-auto max-w-190">
        {navigation}
        <header className="mb-10">
          <p className="mb-4 text-foreground2 text-sm">
            <time dateTime={article.published}>
              {getArticleDate(article.published, locale)}
            </time>{" "}
            · {translation.readingMinutes}{" "}
            {locale === "cn" ? "分钟阅读" : "min read"}
          </p>
          <Heading className="font-medium text-4xl leading-tight tracking-tight sm:text-5xl">
            {translation.title}
          </Heading>
        </header>
        {children}
      </div>
    </article>
  );
}
