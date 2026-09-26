"use no memo";

import { ArrowLeftIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import type { PointerEventHandler } from "react";
import { ABOUT_CARD_SIZE, ABOUT_SHEET_SIZE } from "@/cards/about/about-data";
import { useModalAccessibility } from "@/components/use-modal-accessibility";
import { AnalyticsEvents, track } from "@/lib/analytics";
import { SPRING_PRESETS } from "@/lib/animation";
import { AboutSheet } from "./about-sheet";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  layoutId?: string;
}

export const AboutModal = ({
  isOpen,
  onClose,
  layoutId = "about-card",
}: AboutModalProps) => {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <AboutModalPresence
          key="about-modal"
          layoutId={layoutId}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
};

interface AboutModalPresenceProps {
  onClose: () => void;
  layoutId: string;
}

const AboutModalPresence = ({ onClose, layoutId }: AboutModalPresenceProps) => {
  const dialogRef = useModalAccessibility(() => {
    track(AnalyticsEvents.MODAL_CLOSE, {
      modal_type: "about",
      close_method: "keyboard",
    });
    onClose();
  });

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

    track(AnalyticsEvents.MODAL_CLOSE, {
      modal_type: "about",
      close_method: "outside_click",
    });
    onClose();
  };

  return (
    <motion.div
      animate={{ opacity: 1 }}
      aria-label="About"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-white"
      exit={{ opacity: 0, transition: { duration: 0.32, delay: 0.12 } }}
      initial={{ opacity: 0 }}
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
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
          <AboutSheet interactive={true} />
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
          aria-label="Close about dialog"
          className="no-drag flex cursor-pointer items-center gap-2 px-6 py-4 transition hover:bg-foreground1/20"
          onClick={() => {
            track(AnalyticsEvents.MODAL_CLOSE, {
              modal_type: "about",
              close_method: "button",
            });
            onClose();
          }}
          type="button"
        >
          <ArrowLeftIcon size={20} weight="bold" />
        </button>
      </motion.div>
    </motion.div>
  );
};
