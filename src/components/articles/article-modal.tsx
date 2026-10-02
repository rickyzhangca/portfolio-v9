import { useCallback, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ARTICLE_CARD_SIZE } from "@/cards/article/article-card";
import { ReaderShell } from "@/components/documents/reader-shell";
import { useCanvasSession } from "@/context/canvas-session";
import { getArticle, isArticleLocale } from "@/lib/articles/catalogue";
import {
  getDocumentContentLayoutId,
  getDocumentLayoutId,
} from "@/lib/document-motion";
import { ArticleLanguageSwitch } from "./article-language-switch";
import { ArticleSheet } from "./article-sheet";

/** Lives with the persistent canvas so route changes cannot cut off its exit. */
export function ArticleModal() {
  const session = useCanvasSession();
  const location = useLocation();
  const navigate = useNavigate();
  const current = useMemo(() => {
    if (!(session.articleOpen && session.articleSource)) {
      return null;
    }
    const [, locale, slug] = location.pathname.split("/").slice(1);
    const article = getArticle(slug ?? "");
    if (!(article && isArticleLocale(locale) && article.translations[locale])) {
      return null;
    }
    return { article, locale, source: session.articleSource };
  }, [session.articleOpen, session.articleSource, location.pathname]);
  const [retained, setRetained] = useState(current);
  if (current && current !== retained) {
    setRetained(current);
  }
  const openRef = useRef(session.articleOpen);
  openRef.current = session.articleOpen;
  const close = useCallback(
    (method?: "button" | "keyboard" | "outside_click") => {
      if (!openRef.current) {
        return;
      }
      if (method === "keyboard") {
        session.suppressArticleFocusRing?.();
      }
      openRef.current = false;
      navigate(-1);
    },
    [navigate, session.suppressArticleFocusRing]
  );
  const finishExit = useCallback(() => {
    if (!openRef.current) {
      setRetained(null);
      session.restoreArticleFocus?.();
    }
  }, [session.restoreArticleFocus]);
  const selection = current ?? retained;
  if (!selection) {
    return null;
  }
  const { article, locale, source } = selection;
  const layoutId = getDocumentLayoutId(source.itemId, source.cardId);
  return (
    <ReaderShell
      actions={
        <ArticleLanguageSwitch
          article={article}
          locale={locale}
          variant="reader"
        />
      }
      clipDuringLayout
      contentLayoutId={getDocumentContentLayoutId(layoutId)}
      isOpen={session.articleOpen}
      layoutId={layoutId}
      onClose={close}
      onExitComplete={finishExit}
      paperAspectRatio={ARTICLE_CARD_SIZE.width / ARTICLE_CARD_SIZE.height}
      suppressEscapeFocusRing
      title={article.translations[locale]?.title ?? "Article"}
    >
      <ArticleSheet article={article} isOverlay locale={locale} />
    </ReaderShell>
  );
}
