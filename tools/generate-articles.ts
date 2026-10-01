import { generateArticles } from "./articles.ts";
import { generateSharing } from "./generate-sharing.ts";

const articles = generateArticles();
generateSharing(articles);
console.info(
  `Validated ${articles.length} articles (${articles.reduce((count, article) => count + Object.keys(article.translations).length, 0)} translations).`
);
