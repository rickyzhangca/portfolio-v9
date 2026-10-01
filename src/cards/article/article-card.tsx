import { useLayoutEffect, useRef, useState } from "react";
import type { ArticleCardContent } from "@/cards/registry";
import { ArticlePaper } from "@/components/articles/article-paper";
import { ArticlePreview } from "@/components/articles/article-preview";
import { PaperPreviewFrame } from "@/components/documents/paper-preview-frame";
import { useReaderPaperWidth } from "@/components/documents/reader-paper-layout";
import { useCanvasSession } from "@/context/canvas-session";
import { getArticle, getArticleLocale } from "@/lib/articles/catalogue";

export const ARTICLE_CARD_SIZE = { height: 360, width: 240 } as const;
export const ARTICLE_CARD_PREVIEW_INSET = 16;

interface ArticlePreviewSize {
  fadeEnd: number;
  scale: number;
}

export function ArticleCard({ content }: { content: ArticleCardContent }) {
  const article = getArticle(content.slug);
  const paperWidth = useReaderPaperWidth();
  const { articleLocales } = useCanvasSession();
  const paperRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState<ArticlePreviewSize>({
    fadeEnd: ARTICLE_CARD_SIZE.height,
    scale: ARTICLE_CARD_SIZE.width / 840,
  });
  useLayoutEffect(() => {
    const paper = paperRef.current;
    if (!(paper && article)) {
      return;
    }
    const updateSize = (width: number, height: number) => {
      if (width > 0) {
        const scale = ARTICLE_CARD_SIZE.width / width;
        const fadeEnd = Math.min(ARTICLE_CARD_SIZE.height, height * scale);
        setPreviewSize((current) =>
          current.scale === scale && current.fadeEnd === fadeEnd
            ? current
            : { fadeEnd, scale }
        );
      }
    };
    // Observe the untransformed paper width, independent of canvas zoom.
    updateSize(paper.offsetWidth, paper.offsetHeight);
    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (entry) {
        updateSize(
          entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width,
          entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height
        );
      }
    });
    observer.observe(paper);
    return () => observer.disconnect();
  }, [article]);
  const locale = getArticleLocale(article, articleLocales?.get(content.slug));
  const translation = article?.translations[locale];
  if (!(article && translation)) {
    return (
      <PaperPreviewFrame>
        <p className="p-6">Article unavailable</p>
      </PaperPreviewFrame>
    );
  }
  return (
    <PaperPreviewFrame>
      <div
        className="h-full overflow-hidden"
        style={{
          maskImage: `linear-gradient(to bottom, black ${Math.max(0, previewSize.fadeEnd - 56)}px, transparent ${previewSize.fadeEnd}px)`,
        }}
      >
        <div
          className="origin-top-left"
          ref={paperRef}
          style={{
            transform: `scale(${previewSize.scale})`,
            width: paperWidth,
          }}
        >
          <ArticlePaper article={article} heading="h2" locale={locale}>
            <ArticlePreview blocks={translation.preview} />
          </ArticlePaper>
        </div>
      </div>
    </PaperPreviewFrame>
  );
}
