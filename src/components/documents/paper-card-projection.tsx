import { useCanvasSession } from "@/context/canvas-session";
import { SPRING_PRESETS } from "@/lib/animation";
import {
  getDocumentContentLayoutId,
  getDocumentLayoutId,
  getPaperPreviewLayout,
  type PaperSize,
} from "@/lib/document-motion";
import { LAMP_LIFT } from "@/components/lighting/lamp-shadows";
import { PaperLighting } from "@/components/lighting/lit-paper";
import { tw } from "@/lib/utils";
import { cancelFrame, frame, motion, useReducedMotion } from "framer-motion";
import { type ReactNode, useCallback, useEffect, useRef } from "react";

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

/**
 * The label rides inside the shared paper, which scales between the reader and
 * the card. It hides at once on open, and while the paper moves it is scaled
 * back to its own size each frame, so it can return as soon as the paper does.
 */
const LABEL_FADE_IN = "opacity 0.16s ease-out";

/** mt-2 + text-sm py-2 + mb-1. The paper starts directly under this block. */
const DOCUMENT_LABEL_BLOCK = 48;

interface PaperCardProjectionProps {
  children: ReactNode;
  inset: number;
  label?: string;
  /**
   * Motion reads this only when the dependency changes. Leave it stable
   * across hover so a tucked card does not remeasure.
   */
  layoutDependency?: boolean;
  layoutId?: string;
  open?: boolean;
  /** Paper stock under the lamp: smooth for documents, fibrous for articles. */
  stock?: "fibre" | "smooth";
  /** Quieter shadow while a card is tucked in a closed folder. */
  shadow?: "lifted" | "soft";
  size: PaperSize;
}

export function PaperCardProjection({
  children,
  inset,
  label,
  layoutDependency,
  layoutId,
  open = false,
  shadow = "lifted",
  size,
  stock = "fibre",
}: PaperCardProjectionProps) {
  const reducedMotion = useReducedMotion();
  const { articleOpen, articleSource } = useCanvasSession();
  const frameRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const correctLabelRef = useRef<(() => void) | null>(null);
  const stopCorrectingLabel = useCallback(() => {
    if (correctLabelRef.current) {
      cancelFrame(correctLabelRef.current);
      correctLabelRef.current = null;
    }
    if (labelRef.current) {
      labelRef.current.style.transform = "";
    }
  }, []);
  const startCorrectingLabel = useCallback(() => {
    stopCorrectingLabel();
    // Runs after Motion has written the paper's transform for this frame.
    // Both boxes share the canvas transform, so their ratio is the paper's own
    // layout scale, which the label undoes from the paper's top-left corner.
    const correct = () => {
      const labelElement = labelRef.current;
      const card = frameRef.current?.getBoundingClientRect();
      const paper = surfaceRef.current?.getBoundingClientRect();
      if (!(labelElement && card && paper?.width && paper.height)) {
        return;
      }
      labelElement.style.transform = `scale(${card.width / paper.width}, ${card.height / paper.height})`;
    };
    correctLabelRef.current = correct;
    frame.postRender(correct, true);
  }, [stopCorrectingLabel]);
  useEffect(() => stopCorrectingLabel, [stopCorrectingLabel]);
  const preview = getPaperPreviewLayout(size, inset);
  const contentTop = label ? DOCUMENT_LABEL_BLOCK : preview.y;
  const contentHeight = label
    ? size.height - contentTop - preview.y
    : preview.height;
  const previewHeight = contentHeight / preview.scale;
  const isOpening =
    open ||
    (layoutId !== undefined &&
      articleOpen &&
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
      // Isolated so the lamp's paper shading multiplies over paper and text only.
      className="relative isolate"
      data-paper-frame
      ref={frameRef}
      style={{ height: size.height, width: size.width }}
    >
      <motion.div
        className={tw(
          "pointer-events-none absolute inset-0 bg-white transition-[filter]",
          shadow === "soft"
            ? "drop-shadow-[0_6px_10px_rgba(0,0,0,0.06)]"
            : "drop-shadow-[0_16px_16px_rgba(0,0,0,0.12)] group-hover:drop-shadow-[0_12px_24px_rgba(0,0,0,0.24)]"
        )}
        data-lamp-shadow={
          shadow === "soft" ? LAMP_LIFT.flatPaper : LAMP_LIFT.card
        }
        data-paper-surface
        layoutDependency={layoutDependency}
        layoutId={reducedMotion || !layoutId ? undefined : layoutId}
        onLayoutAnimationComplete={label ? stopCorrectingLabel : undefined}
        onLayoutAnimationStart={label ? startCorrectingLabel : undefined}
        ref={surfaceRef}
        style={{ borderRadius: 24, height: size.height, width: size.width }}
        transition={SPRING_PRESETS.smooth}
      >
        {label ? (
          <div
            className="absolute top-0 left-0 origin-top-left"
            data-paper-label
            ref={labelRef}
            style={{
              opacity: isOpening ? 0 : 1,
              transition: reducedMotion || isOpening ? "none" : LABEL_FADE_IN,
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
        layoutDependency={layoutDependency}
        layoutId={
          reducedMotion || !layoutId
            ? undefined
            : getDocumentContentLayoutId(layoutId)
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
      <PaperLighting hidden={isOpening} kind={stock} radius={24} />
    </div>
  );
}
