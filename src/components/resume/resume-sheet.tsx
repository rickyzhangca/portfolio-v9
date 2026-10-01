import type { ResumeData } from "@/cards/types";
import { tw } from "@/lib/utils";
import { ResumeEducation } from "./resume-education";
import { ResumeExperience } from "./resume-experience";
import { ResumeHeader } from "./resume-header";
import { ResumeSkills } from "./resume-skills";

interface ResumeSheetProps {
  className?: string;
  data?: ResumeData;
  interactive?: boolean;
}

export const ResumeSheet = ({
  className,
  interactive = true,
  data,
}: ResumeSheetProps) => (
  <article
    className={tw(
      "flex h-full w-full flex-col gap-10 bg-white pt-10",
      !interactive && "pointer-events-none select-none",
      className
    )}
  >
    <ResumeHeader data={data?.header} />
    <ResumeExperience data={data?.experiences} />
    <ResumeEducation data={data?.education} />
    <ResumeSkills data={data?.skills} />
  </article>
);
