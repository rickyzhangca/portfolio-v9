import { ArrowLeftIcon, FileIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { RESUME_CARD_SIZE } from "@/data/data";
import { SPRING_PRESETS } from "@/lib/animation";
import type { ResumeData } from "@/types/canvas";
import { ScrollArea } from "../ui/scroll-area";
import { RESUME_SHEET_SIZE, ResumeSheet } from "./resume-sheet";

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  layoutId?: string;
  data?: ResumeData;
}

export const ResumeModal = ({
  isOpen,
  onClose,
  layoutId = "resume-card",
  data,
}: ResumeModalProps) => {
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
            className="absolute inset-0 flex items-start justify-center overflow-auto pt-12 pb-24"
            onPointerDown={onClose}
          >
            <motion.div
              className="relative overflow-hidden rounded-4xl bg-white"
              layoutId={layoutId}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                width: RESUME_SHEET_SIZE.width,
                // Match the card's aspect ratio to minimize layout animation distortion
                height:
                  RESUME_SHEET_SIZE.width *
                  (RESUME_CARD_SIZE.height / RESUME_CARD_SIZE.width),
              }}
              transition={SPRING_PRESETS.smooth}
            >
              <ScrollArea showScrollbar={false}>
                <ResumeSheet data={data} interactive={true} />
              </ScrollArea>
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
              href="https://rickyzhang.ca/resume"
              rel="noopener noreferrer"
              target="_blank"
            >
              <FileIcon size={20} weight="bold" />
              Download PDF
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
