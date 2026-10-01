import { ARTICLE_CARD_SIZE } from "@/cards/article/article-card";
import { articles } from "@/lib/articles/catalogue";
import type { CanvasStackItem } from "@/types/canvas";

export const writingStack: CanvasStackItem = {
  cover: {
    content: { count: articles.length, label: "Writing" },
    id: "writing-cover",
    kind: "folder-cover",
    size: { height: 340, width: 240 },
  },
  id: "writing-stack",
  kind: "stack",
  pageSize: 6,
  position: { x: 575, y: 935 },
  stack: articles.map((article) => ({
    content: { slug: article.slug },
    id: `article-${article.slug}`,
    kind: "article",
    size: ARTICLE_CARD_SIZE,
  })),
  zIndex: 8,
};
