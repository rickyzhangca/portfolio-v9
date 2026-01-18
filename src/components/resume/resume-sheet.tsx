import { tw } from "@/lib/utils";
import type { ResumeData } from "@/types/canvas";
import { ResumeEducation } from "./resume-education";
import { ResumeExperience } from "./resume-experience";
import { ResumeHeader } from "./resume-header";
import { ResumeSkills } from "./resume-skills";

export const RESUME_SHEET_SIZE = {
  width: 840,
  height: 1700,
} as const;

interface ResumeSheetProps {
  className?: string;
  interactive?: boolean;
  data?: ResumeData;
}

export const ResumeSheet = ({
  className,
  interactive = true,
  data,
}: ResumeSheetProps) => {
  return (
    <article
      className={tw(
        "flex h-full w-full flex-col gap-10 bg-white py-16",
        !interactive && "pointer-events-none select-none",
        className
      )}
      style={{
        width: RESUME_SHEET_SIZE.width,
        height: RESUME_SHEET_SIZE.height,
      }}
    >
      <ResumeHeader data={data?.header} />
      <ResumeExperience data={data?.experiences} />
      <ResumeEducation data={data?.education} />
      <ResumeSkills data={data?.skills} />
    </article>
  );
};
