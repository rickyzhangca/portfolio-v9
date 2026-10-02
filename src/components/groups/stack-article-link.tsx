import {
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useRef,
} from "react";
import type { ArticleCardInstance } from "@/cards/registry";
import { useCanvasSession } from "@/context/canvas-session";
import {
  getArticle,
  getArticleLocale,
  getArticlePath,
} from "@/lib/articles/catalogue";

interface StackArticleLinkProps {
  card: ArticleCardInstance;
  children: ReactNode;
  isExpanded: boolean;
  onActivate?: (cardId: string, trigger: HTMLElement) => void;
}

export function StackArticleLink({
  card,
  isExpanded,
  onActivate,
  children,
}: StackArticleLinkProps) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const cancelled = useRef<boolean>(false);
  const article = getArticle(card.content.slug);
  const { articleLocales } = useCanvasSession();
  const locale = getArticleLocale(
    article,
    articleLocales?.get(card.content.slug)
  );
  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (!isExpanded || cancelled.current) {
        event.preventDefault();
        cancelled.current = false;
        return;
      }
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !onActivate
      ) {
        return;
      }
      event.preventDefault();
      onActivate(card.id, event.currentTarget);
    },
    [isExpanded, onActivate, card.id]
  );
  const handlePointerCancel = useCallback(() => {
    cancelled.current = true;
    start.current = null;
  }, []);
  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLAnchorElement>) => {
      cancelled.current = false;
      start.current = { x: event.clientX, y: event.clientY };
    },
    []
  );
  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLAnchorElement>) => {
      if (start.current) {
        cancelled.current =
          Math.hypot(
            event.clientX - start.current.x,
            event.clientY - start.current.y
          ) >= 6;
      }
      start.current = null;
    },
    []
  );
  const clearSuppressedFocusRing = useCallback(
    (event: FocusEvent<HTMLAnchorElement>) => {
      delete event.currentTarget.dataset.suppressFocusRing;
    },
    []
  );
  return (
    <a
      aria-label={`Read ${article?.translations[locale]?.title ?? "article"}`}
      className="group no-pan block rounded-3xl outline-none focus-visible:ring-3 focus-visible:ring-accent data-suppress-focus-ring:focus-visible:ring-0"
      href={getArticlePath(card.content.slug, locale)}
      id={card.id}
      onBlur={clearSuppressedFocusRing}
      onClick={handleClick}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      tabIndex={isExpanded ? 0 : -1}
    >
      {children}
    </a>
  );
}
