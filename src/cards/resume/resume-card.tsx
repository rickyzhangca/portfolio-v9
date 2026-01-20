import { ResumeSheet } from "@/components/resume/resume-sheet";
import { RESUME_SHEET_SIZE } from "@/cards/resume/resume-data";
import type { ResumeData } from "@/cards/registry";

const PREVIEW_WIDTH = 240;

const PADDING_X = 64;

const PREVIEW_SCALE = (PREVIEW_WIDTH - PADDING_X / 2) / RESUME_SHEET_SIZE.width;

interface ResumeCardProps {
  content: ResumeData;
}

export const ResumeCard = ({ content }: ResumeCardProps) => {
  return (
    <div className="h-full w-full overflow-hidden rounded-3xl bg-white">
      <p className="mx-2 mt-2 mb-1 w-fit rounded-full bg-background2 px-5 py-2 font-medium text-foreground1/50 text-sm">
        Resume
      </p>
      <div
        className="origin-top-left"
        style={{
          transform: `scale(${PREVIEW_SCALE})`,
          paddingLeft: PADDING_X,
          paddingRight: PADDING_X,
        }}
      >
        <ResumeSheet data={content} interactive={false} />
      </div>
    </div>
  );
};
