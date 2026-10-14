import { Suspense } from "react";
import type { ArticleLocale, ArticleMetadata } from "@/types/article";
import { ArticleContent } from "./article-content";
import { ArticlePaper } from "./article-paper";

interface ArticleSheetProps {
  article: ArticleMetadata;
  locale: ArticleLocale;
}

export function ArticleSheet({ article, locale }: ArticleSheetProps) {
  const translation = article.translations[locale];
  if (!translation) {
    return null;
  }
  return (
    <ArticlePaper article={article} locale={locale}>
      <Suspense
        fallback={
          <p aria-live="polite" className="py-12 text-foreground2">
            {locale === "cn" ? "正在加载文章…" : "Loading article…"}
          </p>
        }
      >
        <ArticleContent
          key={`${article.slug}/${locale}`}
          locale={locale}
          slug={article.slug}
        />
      </Suspense>
    </ArticlePaper>
  );
}
