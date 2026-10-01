import { Suspense } from "react";
import { Link } from "react-router";
import type { ArticleLocale, ArticleMetadata } from "@/types/article";
import { ArticleContent } from "./article-content";
import { ArticleLanguageSwitch } from "./article-language-switch";
import { ArticlePaper } from "./article-paper";

interface ArticleSheetProps {
  article: ArticleMetadata;
  isOverlay?: boolean;
  locale: ArticleLocale;
}

export function ArticleSheet({
  article,
  isOverlay = false,
  locale,
}: ArticleSheetProps) {
  const translation = article.translations[locale];
  if (!translation) {
    return null;
  }
  return (
    <ArticlePaper
      article={article}
      locale={locale}
      navigation={
        !isOverlay && (
          <nav
            aria-label="Article navigation"
            className="mb-12 flex items-center justify-between gap-4 text-sm"
          >
            <Link
              className="text-foreground2 hover:text-foreground1 focus-visible:outline-2"
              to="/"
            >
              ← {locale === "cn" ? "返回主页" : "Portfolio"}
            </Link>
            <ArticleLanguageSwitch article={article} locale={locale} />
          </nav>
        )
      }
    >
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
