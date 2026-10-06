import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useCanvasSession } from "@/context/canvas-session";
import { SPRING_PRESETS } from "@/lib/animation";
import {
  getDocumentContentLayoutId,
  getDocumentLayoutId,
  getPaperPreviewLayout,
  type PaperSize,
} from "@/lib/document-motion";

interface PreviewFade {
  delay?: number;
  duration: number;
  ease?: "easeOut";
}

/** Shared layout keeps the card text opaque until halfway through the expand. */
const PREVIEW_FADE_OUT: PreviewFade = { duration: 0.1, ease: "easeOut" };
/** Restore the preview once the reader text has started to leave. */
const PREVIEW_FADE_IN: PreviewFade = {
  delay: 0.14,
  duration: 0.16,
  ease: "easeOut",
};

/** mt-2 + text-sm py-2 + mb-1. The paper starts directly under this block. */
const DOCUMENT_LABEL_BLOCK = 48;

interface PaperCardProjectionProps {
  children: ReactNode;
  inset: number;
  label?: string;
  layoutId: string;
  open?: boolean;
  size: PaperSize;
}

export function PaperCardProjection({
  children,
  inset,
  label,
  layoutId,
  open = false,
  size,
}: PaperCardProjectionProps) {
  const reducedMotion = useReducedMotion();
  const { articleOpen, articleSource } = useCanvasSession();
  const preview = getPaperPreviewLayout(size, inset);
  const contentTop = label ? DOCUMENT_LABEL_BLOCK : preview.y;
  const contentHeight = label
    ? size.height - contentTop - preview.y
    : preview.height;
  const previewHeight = contentHeight / preview.scale;
  const isOpening =
    open ||
    (articleOpen &&
      articleSource !== null &&
      layoutId ===
        getDocumentLayoutId(articleSource.itemId, articleSource.cardId));
  let previewFade: PreviewFade = PREVIEW_FADE_IN;
  if (reducedMotion) {
    previewFade = { duration: 0 };
  } else if (isOpening) {
    previewFade = PREVIEW_FADE_OUT;
  }
  // The shared paper exceeds the fixed hit area while returning.
  return (
    <div
      className="relative"
      data-paper-frame
      style={{ height: size.height, width: size.width }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 bg-white drop-shadow-[0_16px_16px_rgba(0,0,0,0.12)] transition-[filter] group-hover:drop-shadow-[0_12px_24px_rgba(0,0,0,0.24)]"
        data-paper-surface
        layoutId={reducedMotion ? undefined : layoutId}
        style={{ borderRadius: 24, height: size.height, width: size.width }}
        transition={SPRING_PRESETS.smooth}
      >
        {label ? (
          <div
            className="absolute top-0 left-0"
            style={{
              opacity: isOpening ? 0 : 1,
              transition: reducedMotion
                ? "none"
                : `opacity ${previewFade.duration}s ease-out ${previewFade.delay ?? 0}s`,
            }}
          >
            <p className="mx-2 mt-2 mb-1 w-fit rounded-full bg-background2 px-5 py-2 font-medium text-foreground1/50 text-sm">
              {label}
            </p>
          </div>
        ) : null}
      </motion.div>
      <motion.div
        className="pointer-events-none absolute"
        data-paper-content
        layoutId={
          reducedMotion ? undefined : getDocumentContentLayoutId(layoutId)
        }
        style={{
          height: contentHeight,
          left: preview.x,
          top: contentTop,
          width: preview.width,
        }}
        transition={SPRING_PRESETS.smooth}
      >
        <motion.div
          animate={{ opacity: isOpening ? 0 : 1 }}
          data-paper-preview
          initial={false}
          style={{
            height: previewHeight,
            transform: `scale(${preview.scale})`,
            transformOrigin: "top left",
            width: size.width,
          }}
          transition={previewFade}
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}
