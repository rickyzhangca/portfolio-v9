import { ArrowLeftIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { type PointerEventHandler, useEffect } from "react";
import { ABOUT_CARD_SIZE } from "@/data/data";
import { SPRING_PRESETS } from "@/lib/animation";
import type { AboutData } from "@/types/canvas";
import { ABOUT_SHEET_SIZE, AboutSheet } from "./about-sheet";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  layoutId?: string;
  data?: AboutData;
}

export const AboutModal = ({
  isOpen,
  onClose,
  layoutId = "about-card",
  data,
}: AboutModalProps) => {
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

  const handleBackdropPointerDown: PointerEventHandler<HTMLDivElement> = (
    event
  ) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    const container = event.currentTarget;
    const scrollbarWidth = container.offsetWidth - container.clientWidth;

    if (scrollbarWidth > 0) {
      const rect = container.getBoundingClientRect();
      const isScrollbarClick = event.clientX >= rect.right - scrollbarWidth;

      if (isScrollbarClick) {
        return;
      }
    }

    onClose();
  };

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
            onPointerDown={handleBackdropPointerDown}
          >
            <motion.div
              className="relative overflow-hidden bg-white"
              layoutId={layoutId}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                width: ABOUT_SHEET_SIZE.width,
                height:
                  ABOUT_SHEET_SIZE.width *
                  (ABOUT_CARD_SIZE.height / ABOUT_CARD_SIZE.width),
              }}
              transition={SPRING_PRESETS.smooth}
            >
              <AboutSheet data={data} interactive={true} />
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
