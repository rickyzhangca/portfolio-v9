import type { ResumeEducation as ResumeEducationData } from "@/cards/types";
import { ResumeEntry } from "./resume-entry";
import { ResumeSection } from "./resume-section";

interface ResumeEducationProps {
  data?: ResumeEducationData;
}

export const ResumeEducation = ({ data }: ResumeEducationProps) => (
  <ResumeSection label="Education">
    <ResumeEntry
      dates={data?.years}
      logo={data?.logo}
      logoAlt={`${data?.institution} logo`}
      subtitle={data?.institution}
      title={data?.degree}
    >
      <p className="text-pretty">{data?.description}</p>
    </ResumeEntry>
  </ResumeSection>
);
