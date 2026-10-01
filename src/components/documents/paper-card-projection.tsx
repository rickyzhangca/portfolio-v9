import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { SPRING_PRESETS } from "@/lib/animation";
import {
  getDocumentContentLayoutId,
  getPaperPreviewLayout,
  type PaperSize,
} from "@/lib/document-motion";

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
  const preview = getPaperPreviewLayout(size, inset);
  // The shared paper exceeds the fixed hit area while returning.
  return (
    <div
      className="relative"
      data-paper-frame
      style={{ height: size.height, width: size.width }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 bg-white"
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
        <div
          style={{
            height: size.height,
            transform: `scale(${preview.scale})`,
            transformOrigin: "top left",
            width: size.width,
          }}
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}
