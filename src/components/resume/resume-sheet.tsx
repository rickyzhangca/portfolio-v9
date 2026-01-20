import { RESUME_SHEET_SIZE } from "@/cards/resume/resume-data";
import type { ResumeData } from "@/cards/types";
import { tw } from "@/lib/utils";
import { ResumeEducation } from "./resume-education";
import { ResumeExperience } from "./resume-experience";
import { ResumeHeader } from "./resume-header";
import { ResumeSkills } from "./resume-skills";

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
        "flex h-full w-full flex-col gap-10 bg-white pt-10",
        !interactive && "pointer-events-none select-none",
        className
      )}
      style={{
        width: RESUME_SHEET_SIZE.width,
      }}
    >
      <ResumeHeader data={data?.header} />
      <ResumeExperience data={data?.experiences} />
      <ResumeEducation data={data?.education} />
      <ResumeSkills data={data?.skills} />
    </article>
  );
};
