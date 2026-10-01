import { createContext, useContext } from "react";
import type { ArticleLocale, ArticleSource } from "@/types/article";

export interface CanvasSession {
  articleLocales?: ReadonlyMap<string, ArticleLocale>;
  articleOpen: boolean;
  articleSource: ArticleSource | null;
  canvasVisible: boolean;
  hasCanvas: boolean;
  openArticle?: (
    slug: string,
    source: ArticleSource,
    trigger: HTMLElement
  ) => void;
  restoreArticleFocus?: () => void;
}

export const CanvasSessionContext = createContext<CanvasSession>({
  articleOpen: false,
  articleSource: null,
  canvasVisible: true,
  hasCanvas: false,
});

export function useCanvasSession() {
  return useContext(CanvasSessionContext);
}

export function getArticleSource(value: unknown): ArticleSource | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("articleSource" in value)
  ) {
    return null;
  }
  const source = value.articleSource;
  if (
    typeof source !== "object" ||
    source === null ||
    !("itemId" in source) ||
    !("cardId" in source) ||
    typeof source.itemId !== "string" ||
    typeof source.cardId !== "string"
  ) {
    return null;
  }
  return { cardId: source.cardId, itemId: source.itemId };
}
