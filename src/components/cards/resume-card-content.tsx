import {
  RESUME_SHEET_SIZE,
  ResumeSheet,
} from "@/components/resume/resume-sheet";
import type { ResumeCardContent } from "@/types/canvas";

const PREVIEW_WIDTH = 240;

const PADDING_X = 64;

const PREVIEW_SCALE = (PREVIEW_WIDTH - PADDING_X / 2) / RESUME_SHEET_SIZE.width;

interface ResumeCardContentProps {
  data: ResumeCardContent;
}

export const ResumeCardContentView = (_props: ResumeCardContentProps) => {
  return (
    <div className="h-full w-full overflow-hidden rounded-3xl bg-white">
      <div
        className="origin-top-left"
        style={{
          transform: `scale(${PREVIEW_SCALE})`,
          paddingLeft: PADDING_X,
          paddingRight: PADDING_X,
        }}
      >
        <ResumeSheet interactive={false} />
      </div>
    </div>
  );
};
