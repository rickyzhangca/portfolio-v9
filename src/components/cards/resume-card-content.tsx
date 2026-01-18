import {
  RESUME_SHEET_SIZE,
  ResumeSheet,
} from "@/components/resume/resume-sheet";
import type { ResumeCardContent } from "@/types/canvas";

const PREVIEW_SIZE = { width: 240, height: 340 } as const;
const PREVIEW_SCALE = PREVIEW_SIZE.width / RESUME_SHEET_SIZE.width;

interface ResumeCardContentProps {
  data: ResumeCardContent;
}

export const ResumeCardContentView = (_props: ResumeCardContentProps) => {
  return (
    <div className="h-full w-full overflow-hidden rounded-3xl border border-border bg-white shadow-none">
      <div
        className="origin-top-left"
        style={{
          width: RESUME_SHEET_SIZE.width,
          height: RESUME_SHEET_SIZE.height,
          transform: `scale(${PREVIEW_SCALE})`,
        }}
      >
        <ResumeSheet interactive={false} />
      </div>
    </div>
  );
};
