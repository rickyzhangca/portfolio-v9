import { use } from "react";
import { articleLoaders } from "@/content/generated/loaders";
import type { ArticleLocale, ArticleModule } from "@/types/article";
import { ARTICLE_COMPONENTS } from "./article-typography";

const modulePromises = new Map<string, Promise<ArticleModule>>();
const loadedModules = new Map<string, ArticleModule>();

export function loadArticle(
  slug: string,
  locale: ArticleLocale
): Promise<ArticleModule> {
  const key = `${slug}/${locale}`;
  const cached = modulePromises.get(key);
  if (cached) {
    return cached;
  }
  const loader = articleLoaders[slug]?.[locale];
  if (!loader) {
    return Promise.reject(new Error(`Article translation not found: ${key}`));
  }
  const promise = loader().then((module) => {
    loadedModules.set(key, module);
    return module;
  });
  modulePromises.set(key, promise);
  return promise;
}

export function ArticleContent({
  slug,
  locale,
}: {
  slug: string;
  locale: ArticleLocale;
}) {
  // The route awaits this module before opening the sheet. Reusing its resolved
  // value avoids a fresh Suspense fallback in the middle of the layout motion.
  const { default: Body, credit } =
    loadedModules.get(`${slug}/${locale}`) ?? use(loadArticle(slug, locale));
  return (
    <>
      <div className="article-prose">
        <Body components={ARTICLE_COMPONENTS} />
      </div>
      {credit !== null && credit !== undefined && (
        <footer className="mt-14 border-t pt-8 text-foreground2 text-sm">
          {credit}
        </footer>
      )}
    </>
  );
}
