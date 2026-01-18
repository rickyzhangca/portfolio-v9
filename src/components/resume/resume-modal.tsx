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
            className="absolute inset-0 flex items-center justify-center"
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

          <motion.div
            animate={{
              x: "-50%",
              y: 0,
              boxShadow: "0 12px 24px -12px rgba(0, 0, 0, 0.48)",
            }}
            className="fixed bottom-6 left-1/2 flex items-center overflow-hidden rounded-full bg-foreground1/80 text-background1 backdrop-blur"
            exit={{
              x: "-50%",
              y: "200%",
              boxShadow: "0 0 0 rgba(0,0,0,0)",
              transition: { duration: 0.24 },
            }}
            initial={{
              x: "-50%",
              y: "200%",
              boxShadow: "0 0 0 rgba(0,0,0,0)",
            }}
            transition={{
              y: { ...SPRING_PRESETS.smooth, delay: 0.16 },
              boxShadow: { duration: 0.24 },
            }}
          >
            <button
              className="no-drag flex cursor-pointer items-center gap-2 py-4 pr-4.5 pl-6 transition-colors hover:bg-foreground1/20"
              onClick={onClose}
              type="button"
            >
              <ArrowLeftIcon size={20} weight="bold" />
            </button>
            <div className="h-8 w-px bg-white/20" />
            <a
              className="no-drag flex items-center gap-2 py-4 pr-7 pl-5 font-medium transition-colors hover:bg-foreground1/20"
              href={resumeConfig.pdfUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <FileIcon size={20} weight="bold" />
              Get PDF
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
