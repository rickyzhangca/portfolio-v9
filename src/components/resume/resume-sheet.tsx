import { cn } from "@/lib/utils";
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
}

export const ResumeSheet = ({
  className,
  interactive = true,
}: ResumeSheetProps) => {
  return (
    <article
      className={cn(
        "flex h-full w-full flex-col gap-10 bg-white py-16",
        !interactive && "pointer-events-none select-none",
        className
      )}
      style={{
        width: RESUME_SHEET_SIZE.width,
        height: RESUME_SHEET_SIZE.height,
      }}
    >
      <ResumeHeader />
      <ResumeExperience />
      <ResumeEducation />
      <ResumeSkills />
    </article>
  );
};
