import { ArrowLeftIcon, FileIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useState } from "react";
import { resumeConfig } from "@/data/resume";
import { SPRING_PRESETS } from "@/lib/animation";
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
          className="fixed inset-0 z-50 bg-white"
          exit={{ opacity: 0, transition: { duration: 0.32, delay: 0.12 } }}
          initial={{ opacity: 0 }}
          role="dialog"
          transition={{ duration: 0.32 }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center p-[28px]"
            onPointerDown={onClose}
          >
            <motion.div
              className="relative overflow-auto rounded-4xl"
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

          <div className="fixed bottom-4 left-1/2 flex -translate-x-1/2 items-center overflow-hidden rounded-3xl">
            <button
              className="no-drag flex items-center gap-2 bg-foreground1/80 py-5 pr-5 pl-6 font-medium text-background1 backdrop-blur transition-[background-color] hover:bg-foreground1/90"
              onClick={onClose}
              type="button"
            >
              <ArrowLeftIcon size={24} />
            </button>
            <a
              className="no-drag flex items-center gap-2 bg-foreground1/80 py-5 pr-7 pl-6 font-medium text-background1 backdrop-blur transition-[background-color] hover:bg-foreground1/90"
              href={resumeConfig.pdfUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <FileIcon size={24} />
              Get PDF
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
