import type { Config } from "@react-router/dev/config";
import { discoverArticles } from "./tools/articles.ts";

export default {
  appDirectory: "src/router",
  buildDirectory: "dist",
  prerender: [
    "/",
    "/404",
    ...discoverArticles().flatMap((article) =>
      Object.keys(article.translations).map(
        (locale) => `/writing/${locale}/${article.slug}`
      )
    ),
  ],
  ssr: false,
} satisfies Config;
