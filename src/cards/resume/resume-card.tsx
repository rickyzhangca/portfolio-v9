import type { ResumeData } from "@/cards/registry";
import { RESUME_SHEET_SIZE } from "@/cards/resume/resume-data";
import { PaperPreviewFrame } from "@/components/documents/paper-preview-frame";
import { ResumeSheet } from "@/components/resume/resume-sheet";

const PREVIEW_WIDTH = 240;

const PADDING_X = 64;

const PREVIEW_SCALE = (PREVIEW_WIDTH - PADDING_X / 2) / RESUME_SHEET_SIZE.width;

interface ResumeCardProps {
  content: ResumeData;
}

export const ResumeCard = ({ content }: ResumeCardProps) => (
  <PaperPreviewFrame label="Resume">
    <div
      className="origin-top-left"
      style={{
        paddingLeft: PADDING_X,
        paddingRight: PADDING_X,
        transform: `scale(${PREVIEW_SCALE})`,
        width: RESUME_SHEET_SIZE.width,
      }}
    >
      <ResumeSheet data={content} interactive={false} />
    </div>
  </PaperPreviewFrame>
);
