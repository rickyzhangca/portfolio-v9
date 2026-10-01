import { Link, useLocation } from "react-router";
import { getArticlePath } from "@/lib/articles/catalogue";
import { tw } from "@/lib/utils";
import type { ArticleLocale, ArticleMetadata } from "@/types/article";

interface ArticleLanguageSwitchProps {
  article: ArticleMetadata;
  locale: ArticleLocale;
  variant?: "sheet" | "reader";
}

export function ArticleLanguageSwitch({
  article,
  locale,
  variant = "sheet",
}: ArticleLanguageSwitchProps) {
  const location = useLocation();
  const isReader = variant === "reader";
  return (
    <nav
      aria-label="Article language"
      className={tw(
        "flex",
        isReader
          ? "border-white/20 border-l"
          : "gap-1 rounded-full bg-background2 p-1"
      )}
    >
      {(["en", "cn"] as const)
        .filter((language) => article.translations[language])
        .map((language) => (
          <Link
            aria-current={locale === language ? "page" : undefined}
            className={tw(
              "focus-visible:outline-2",
              isReader
                ? "px-4 py-4 transition focus-visible:outline-offset-[-4px]"
                : "rounded-full px-3 py-1.5",
              isReader && locale === language && "bg-white/15",
              isReader &&
                locale !== language &&
                "text-white/60 hover:bg-white/10 hover:text-white",
              !isReader && locale === language && "bg-white shadow-sm",
              !isReader &&
                locale !== language &&
                "text-foreground2 hover:text-foreground1"
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
