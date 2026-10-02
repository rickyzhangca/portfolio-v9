import { useCanvasSession } from "@/context/canvas-session";
import { SPRING_PRESETS } from "@/lib/animation";
import {
    getDocumentContentLayoutId,
    getDocumentLayoutId,
    getPaperPreviewLayout,
    type PaperSize,
} from "@/lib/document-motion";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** Shared layout keeps the card text opaque until halfway through the expand. */
const PREVIEW_FADE_OUT = { duration: 0.1, ease: "easeOut" } as const;
/** Restore the preview once the reader text has started to leave. */
const PREVIEW_FADE_IN = {
  delay: 0.14,
  duration: 0.16,
  ease: "easeOut",
} as const;

interface PaperCardProjectionProps {
  children: ReactNode;
  inset: number;
  layoutId: string;
  size: PaperSize;
}

export function PaperCardProjection({
  children,
  inset,
  layoutId,
  size,
}: PaperCardProjectionProps) {
  const reducedMotion = useReducedMotion();
  const { articleOpen, articleSource } = useCanvasSession();
  const preview = getPaperPreviewLayout(size, inset);
  const isOpening =
    articleOpen &&
    articleSource !== null &&
    layoutId ===
      getDocumentLayoutId(articleSource.itemId, articleSource.cardId);
  let previewFade = PREVIEW_FADE_IN;
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
      />
      <motion.div
        className="pointer-events-none absolute"
        data-paper-content
        layoutId={
          reducedMotion ? undefined : getDocumentContentLayoutId(layoutId)
        }
        style={{
          height: preview.height,
          left: preview.x,
          top: preview.y,
          width: preview.width,
        }}
        transition={SPRING_PRESETS.smooth}
      >
        <motion.div
          animate={{ opacity: isOpening ? 0 : 1 }}
          data-paper-preview
          initial={false}
          style={{
            height: size.height,
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
