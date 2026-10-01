import { FileIcon } from "@phosphor-icons/react";
import { useCallback } from "react";
import { RESUME_CARD_SIZE } from "@/cards/resume/resume-data";
import type { ResumeData } from "@/cards/types";
import { ReaderShell } from "@/components/documents/reader-shell";
import { AnalyticsEvents, track } from "@/lib/analytics";
import { SPRING_PRESETS } from "@/lib/animation";
import { ResumeSheet } from "./resume-sheet";

interface ResumeModalProps {
  data?: ResumeData;
  isOpen: boolean;
  layoutId?: string;
  onClose: () => void;
}

export function ResumeModal({
  isOpen,
  onClose,
  layoutId = "resume-card",
  data,
}: ResumeModalProps) {
  const close = useCallback(
    (method: "button" | "keyboard" | "outside_click" = "button") => {
      track(AnalyticsEvents.MODAL_CLOSE, {
        close_method: method,
        modal_type: "resume",
      });
      onClose();
    },
    [onClose]
  );
  return (
    <ReaderShell
      actions={
        <a
          className="flex items-center gap-2 border-white/20 border-l px-6 py-4 hover:bg-white/10 focus-visible:outline-2"
          download="RickyZhang_Resume.pdf"
          href="/RickyZhang_Resume.pdf"
        >
          <FileIcon size={20} weight="bold" />
          Download PDF
        </a>
      }
      backdropExitDelay={0.2}
      backdropTransition={SPRING_PRESETS.smooth}
      isOpen={isOpen}
      layoutId={layoutId}
      onClose={close}
      paperAspectRatio={RESUME_CARD_SIZE.width / RESUME_CARD_SIZE.height}
      title="Ricky Zhang’s resume"
    >
      <ResumeSheet data={data} interactive />
    </ReaderShell>
  );
}
