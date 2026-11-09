import { createContext, useContext } from "react";
import type { ArticleLocale, ArticleSource } from "@/types/article";

export interface CanvasSession {
  articleLocales?: ReadonlyMap<string, ArticleLocale>;
  articleOpen: boolean;
  articleSource: ArticleSource | null;
  canvasVisible: boolean;
  hasCanvas: boolean;
  /**
   * An item a link such as /toronto asked the canvas to open once it has
   * risen; `onItemOpened` clears it so a reload or Back does not reopen it.
   */
  openItemId?: string | null;
  onItemOpened?: () => void;
  /**
   * Called when the canvas starts its entrance, so the shell can fade out the
   * loading placeholder it has shown since the first paint.
   */
  onCanvasEntrance?: () => void;
  openArticle?: (
    slug: string,
    source: ArticleSource,
    trigger: HTMLElement
  ) => void;
  /**
   * Shows the canvas as a window beside earlier portfolio versions; focus
   * returns to `trigger` once the canvas fills the screen again.
   */
  openTimeMachine?: (trigger: HTMLElement) => void;
  restoreArticleFocus?: () => void;
  /** True while the time machine shows the canvas as a scaled window. */
  timeMachineOpen?: boolean;
  /** Marks the open trigger so Escape can return focus without the card ring. */
  suppressArticleFocusRing?: () => void;
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

/** The item a redirect asked the canvas to open, from `{ openItem }` state. */
export function getOpenItem(value: unknown): string | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("openItem" in value) ||
    typeof value.openItem !== "string"
  ) {
    return null;
  }
  return value.openItem;
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
