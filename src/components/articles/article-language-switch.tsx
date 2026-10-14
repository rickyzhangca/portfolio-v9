import { Link, useLocation } from "react-router";
import { getArticlePath } from "@/lib/articles/catalogue";
import { tw } from "@/lib/utils";
import type { ArticleLocale, ArticleMetadata } from "@/types/article";

interface ArticleLanguageSwitchProps {
  article: ArticleMetadata;
  locale: ArticleLocale;
}

/** Language links for the reader toolbar. */
export function ArticleLanguageSwitch({
  article,
  locale,
}: ArticleLanguageSwitchProps) {
  const location = useLocation();
  return (
    <nav
      aria-label="Article language"
      className="flex border-white/20 border-l"
    >
      {(["en", "cn"] as const)
        .filter((language) => article.translations[language])
        .map((language) => (
          <Link
            aria-current={locale === language ? "page" : undefined}
            className={tw(
              "px-4 py-4 transition focus-visible:outline-2 focus-visible:outline-offset-[-4px]",
              locale === language
                ? "bg-white/15"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            )}
            key={language}
            lang={language === "cn" ? "zh-CN" : "en"}
            replace
            state={location.state}
            to={getArticlePath(article.slug, language)}
          >
            {language === "en" ? "EN" : "中文"}
          </Link>
        ))}
    </nav>
  );
}
