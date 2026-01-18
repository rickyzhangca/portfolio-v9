import { DownloadSimple, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useState } from "react";
import { resumeConfig } from "@/data/resume";
import { SPRING_PRESETS } from "@/lib/animation";
import { cn } from "@/lib/utils";
import { RESUME_SHEET_SIZE, ResumeSheet } from "./resume-sheet";

const VIEWPORT_MARGIN_PX = 28;

const getFrameSize = () => {
  const availableWidth = window.innerWidth - VIEWPORT_MARGIN_PX * 2;
  const availableHeight = window.innerHeight - VIEWPORT_MARGIN_PX * 2;

  return {
    width: Math.min(RESUME_SHEET_SIZE.width, availableWidth),
    height: Math.min(RESUME_SHEET_SIZE.height, availableHeight),
  };
};

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  layoutId?: string;
}

export const ResumeModal = ({
  isOpen,
  onClose,
  layoutId = "resume-card",
}: ResumeModalProps) => {
  const [frameSize, setFrameSize] = useState<{ width: number; height: number }>(
    () => ({
      width: RESUME_SHEET_SIZE.width,
      height: RESUME_SHEET_SIZE.height,
    })
  );

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    const update = () => setFrameSize(getFrameSize());
    update();

    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          animate={{ opacity: 1 }}
          aria-modal="true"
          className="fixed inset-0 z-50 bg-background1"
          exit={{ opacity: 0, transition: { duration: 0.08, delay: 0.22 } }}
          initial={{ opacity: 0 }}
          role="dialog"
          transition={{ duration: 0.1 }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center p-[28px]"
            onPointerDown={onClose}
          >
            <motion.div
              className={cn("relative overflow-auto rounded-[28px] bg-white")}
              layoutId={layoutId}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                width: frameSize.width,
                height: frameSize.height,
              }}
              transition={SPRING_PRESETS.smooth}
            >
              <ResumeSheet interactive={true} />
            </motion.div>
          </div>

          <div className="absolute top-6 right-6 flex items-center gap-2">
            <a
              className="no-drag inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-foreground1 text-sm shadow-lg backdrop-blur transition hover:bg-white"
              href={resumeConfig.pdfUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <DownloadSimple size={16} />
              PDF
            </a>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-foreground1 text-sm shadow-lg backdrop-blur transition hover:bg-white"
              onClick={onClose}
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
