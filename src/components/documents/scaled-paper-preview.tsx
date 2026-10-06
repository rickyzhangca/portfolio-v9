import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { PaperPreviewFrame } from "./paper-preview-frame";
import { useReaderPaperWidth } from "./reader-paper-layout";

const PREVIEW_FADE = 40;

interface PreviewSize {
  fadeEnd: number;
  scale: number;
}

interface ScaledPaperPreviewProps {
  children: ReactNode;
  height: number;
  width: number;
}

/** Reader-width sheet, scaled into the card and faded at the bottom. */
export function ScaledPaperPreview({
  children,
  height,
  width,
}: ScaledPaperPreviewProps) {
  const paperWidth = useReaderPaperWidth();
  const clipRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState<PreviewSize>({
    fadeEnd: height,
    scale: width / 840,
  });
  useLayoutEffect(() => {
    const paper = paperRef.current;
    const clip = clipRef.current;
    if (!(paper && clip)) {
      return;
    }
    const updateSize = () => {
      const measuredWidth = paper.offsetWidth;
      const clipHeight = clip.clientHeight;
      if (measuredWidth > 0 && clipHeight > 0) {
        const scale = width / measuredWidth;
        const fadeEnd = Math.min(clipHeight, paper.offsetHeight * scale);
        setPreviewSize((current) =>
          current.scale === scale && current.fadeEnd === fadeEnd
            ? current
            : { fadeEnd, scale }
        );
      }
    };
    // Observe the untransformed paper, independent of canvas zoom.
    updateSize();
    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(paper);
    observer.observe(clip);
    return () => observer.disconnect();
  }, [width]);
  return (
    <PaperPreviewFrame>
      <div
        className="h-full overflow-hidden"
        ref={clipRef}
        style={{
          maskImage: `linear-gradient(to bottom, black ${Math.max(0, previewSize.fadeEnd - PREVIEW_FADE)}px, transparent ${previewSize.fadeEnd}px)`,
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
          {children}
        </div>
      </div>
    </PaperPreviewFrame>
  );
}
