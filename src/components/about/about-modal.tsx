import { useCallback } from "react";
import { ABOUT_CARD_SIZE } from "@/cards/about/about-data";
import { ReaderShell } from "@/components/documents/reader-shell";
import { AnalyticsEvents, track } from "@/lib/analytics";
import { getDocumentContentLayoutId } from "@/lib/document-motion";
import { AboutSheet } from "./about-sheet";

interface AboutModalProps {
  isOpen: boolean;
  layoutId?: string;
  onClose: () => void;
}

export function AboutModal({
  isOpen,
  onClose,
  layoutId = "about-card",
}: AboutModalProps) {
  const close = useCallback(
    (method: "button" | "keyboard" | "outside_click" = "button") => {
      track(AnalyticsEvents.MODAL_CLOSE, {
        close_method: method,
        modal_type: "about",
      });
      onClose();
    },
    [onClose]
  );
  return (
    <ReaderShell
      clipDuringLayout
      contentLayoutId={getDocumentContentLayoutId(layoutId)}
      isOpen={isOpen}
      layoutId={layoutId}
      onClose={close}
      paperAspectRatio={ABOUT_CARD_SIZE.width / ABOUT_CARD_SIZE.height}
      title="About Ricky"
    >
      <AboutSheet interactive />
    </ReaderShell>
  );
}
