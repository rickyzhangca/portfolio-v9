import type { ResumeData } from "@/cards/registry";
import { RESUME_CARD_SIZE } from "@/cards/resume/resume-data";
import { ScaledPaperPreview } from "@/components/documents/scaled-paper-preview";
import { ResumeSheet } from "@/components/resume/resume-sheet";

interface ResumeCardProps {
  content: ResumeData;
}

export const ResumeCard = ({ content }: ResumeCardProps) => (
  <ScaledPaperPreview
    height={RESUME_CARD_SIZE.height}
    width={RESUME_CARD_SIZE.width}
  >
    <ResumeSheet data={content} interactive={false} />
  </ScaledPaperPreview>
);
